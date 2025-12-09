#!/usr/bin/env python3
"""
detector.py

AccidentDetector class that wraps YOLO + Norfair and detects vehicle collisions
using physics-based anomaly detection:

- YOLOv11 object detection
- Norfair tracking
- Crash logic based on:
    * Deceleration (sudden stops)
    * Angle change (abrupt turns)
    * Spatial interaction (proximity between stressed objects)
    * IoU overlap (traditional collision)
"""

import time
import base64
from collections import defaultdict

import cv2
import numpy as np
from ultralytics import YOLO
import norfair


class AccidentDetector:
    def __init__(
        self,
        model_path: str = "yolo11s.pt",
        conf_thresh: float = 0.50,
        iou_threshold: float = 0.15,
        min_frames_to_confirm_crash: int = 5,
        rel_speed_threshold: float = 1.0,
        target_classes=None,
        vehicle_classes=None,
        tracker_distance_threshold: float = 60.0,
        crop_on_crash: bool = True,
        jpeg_quality: int = 80,
        # New physics parameters
        decel_weight: float = 5.0,
        angle_weight: float = 2.0,
        anomaly_thresh: float = 25.0,
        interaction_radius: float = 50.0,
        min_speed: float = 1.0,
        # Tracker tuning
        initialization_delay: int = 10,
        hit_counter_max: int = 25,
    ):
        """
        Initialize the accident detector.

        Args:
            model_path: Path to YOLOv11 weights.
            conf_thresh: Confidence threshold for detections.
            iou_threshold: IoU threshold for considering overlapping vehicles.
            min_frames_to_confirm_crash: Number of consecutive frames a pair
                must satisfy the condition to be considered a crash.
            rel_speed_threshold: Relative speed threshold (in pixels/frame).
            target_classes: Set of class IDs to track (default: {0,2,3,7}).
            vehicle_classes: Set of class IDs considered as vehicles
                (default: {2,3,7}).
            tracker_distance_threshold: Norfair distance_threshold.
            crop_on_crash: Whether to return cropped images for crashed vehicles.
            jpeg_quality: JPEG quality for cropped images.
            decel_weight: Weight for deceleration in anomaly score.
            angle_weight: Weight for angle change in anomaly score.
            anomaly_thresh: Threshold for anomaly score to trigger crash check.
            interaction_radius: Max distance to consider a crash between two objects.
            min_speed: Minimum speed to consider for anomaly calculations.
            initialization_delay: Frames to wait before confirming a track (reduces false positives).
            hit_counter_max: Frames to keep a lost track alive.
        """
        self.model_path = model_path
        self.conf_thresh = conf_thresh
        self.iou_threshold = iou_threshold
        self.min_frames_to_confirm_crash = min_frames_to_confirm_crash
        self.rel_speed_threshold = rel_speed_threshold
        self.crop_on_crash = crop_on_crash
        self.jpeg_quality = int(jpeg_quality)

        # Physics parameters
        self.decel_weight = decel_weight
        self.angle_weight = angle_weight
        self.anomaly_thresh = anomaly_thresh
        self.interaction_radius = interaction_radius
        self.min_speed = min_speed

        if target_classes is None:
            # person, car, motorcycle, truck
            target_classes = {0, 2, 3, 7}
        if vehicle_classes is None:
            # car, motorcycle, truck
            vehicle_classes = {2, 3, 7}

        self.target_classes = set(target_classes)
        self.vehicle_classes = set(vehicle_classes)

        # Load YOLO model
        print(f"[AccidentDetector] Loading YOLO model from {self.model_path}")
        self.model = YOLO(self.model_path)

        # Norfair tracker (tracking the center point of each detection)
        self.tracker = norfair.Tracker(
            distance_function="mean_euclidean",
            distance_threshold=tracker_distance_threshold,
            initialization_delay=initialization_delay,
            hit_counter_max=hit_counter_max,
        )

        # Per-tracker history
        self.object_history = {}  # tracker_id -> last center (x, y)
        self.last_velocities = {} # tracker_id -> (vx, vy)

        # Crash counting: (id1, id2) -> consecutive frames counter
        self.crash_counter = defaultdict(int)

        # When a pair was last seen: (id1, id2) -> timestamp
        self.pair_last_seen = {}

        # Frame index (optional, for debugging/logging)
        self.frame_idx = 0

        # Model class names
        self.class_names = self.model.names

    # ---------- Helper functions ----------

    @staticmethod
    def compute_iou(boxA, boxB) -> float:
        """
        Compute IoU between two boxes given as (x1, y1, x2, y2, cls, score).
        """
        xA = max(boxA[0], boxB[0])
        yA = max(boxA[1], boxB[1])
        xB = min(boxA[2], boxB[2])
        yB = min(boxA[3], boxB[3])

        interW = max(0.0, xB - xA)
        interH = max(0.0, yB - yA)
        interArea = interW * interH
        if interArea <= 0.0:
            return 0.0

        aArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
        bArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])
        unionArea = aArea + bArea - interArea
        if unionArea <= 0.0:
            return 0.0

        return float(interArea / unionArea)

    @staticmethod
    def get_angle(v):
        return np.degrees(np.arctan2(v[1], v[0]))

    @staticmethod
    def angle_diff(a1, a2):
        diff = (a1 - a2 + 180) % 360 - 180
        return abs(diff)

    @staticmethod
    def relative_speed(v1, v2) -> float:
        """
        Euclidean norm of relative velocity.
        """
        return float(np.linalg.norm([v1[0] - v2[0], v1[1] - v2[1]]))

    def _yolo_to_boxes_and_dets(self, results):
        """
        Convert YOLO results to:
            - dets: list of norfair.Detection objects
            - boxes: list of tuples (x1, y1, x2, y2, cls_id, score)
        """
        dets = []
        boxes = []

        for r in results.boxes:
            x1, y1, x2, y2 = r.xyxy[0].cpu().numpy()
            score = float(r.conf.cpu().numpy().item())
            cls_id = int(r.cls.cpu().numpy().item())

            if score >= self.conf_thresh and cls_id in self.target_classes:
                cx = (x1 + x2) / 2.0
                cy = (y1 + y2) / 2.0
                dets.append(
                    norfair.Detection(
                        points=np.array([[cx, cy]]),
                        scores=np.array([score]),
                    )
                )
                boxes.append((x1, y1, x2, y2, cls_id, score))

        return dets, boxes

    # ---------- Main processing ----------

    def process_frame(self, frame):
        """
        Run detection + tracking on a single frame, and detect potential crashes.

        Args:
            frame: BGR image (numpy array) from OpenCV.

        Returns:
            A dictionary with:
                - frame_idx: current frame index
                - bboxes: list of dicts with xyxy, cls, score, tracker_id
                - tracked_positions: {tracker_id: (cx, cy)}
                - velocities: {tracker_id: (vx, vy)}
                - crashes: list of crash dicts
                - cropped_images_b64: list of base64 JPEG blobs for crashed vehicles
                - full_frame_b64: base64 JPEG of full frame (if crash)
        """
        self.frame_idx += 1

        # Run YOLO
        results = self.model(frame, verbose=False, device=0)[0]
        norfair_dets, boxes = self._yolo_to_boxes_and_dets(results)

        # Update Norfair tracker
        tracked_objects = self.tracker.update(detections=norfair_dets)

        # Map tracker_id -> corresponding box
        tracker_to_box = {}
        centers = []
        for b in boxes:
            x1, y1, x2, y2, cls_id, score = b
            centers.append(((x1 + x2) / 2.0, (y1 + y2) / 2.0))

        for obj in tracked_objects:
            cx, cy = obj.estimate[0]
            best_idx = None
            best_dist = float("inf")
            for idx, c in enumerate(centers):
                d = np.linalg.norm([cx - c[0], cy - c[1]])
                if d < best_dist:
                    best_dist = d
                    best_idx = idx
            if best_idx is not None:
                tracker_to_box[obj.id] = boxes[best_idx]

        # --- PHYSICS ANOMALY DETECTION ---
        
        scores = {} # id -> score
        velocities = {} # id -> (vx, vy)
        
        # Calculate kinematics and anomaly scores
        for obj in tracked_objects:
            cid = obj.id
            cx, cy = obj.estimate[0]
            
            # 1. Calculate Velocity
            curr_vel = (0.0, 0.0)
            if cid in self.object_history:
                prev_pos = self.object_history[cid]
                curr_vel = (cx - prev_pos[0], cy - prev_pos[1])
            
            speed = np.linalg.norm(curr_vel)
            velocities[cid] = curr_vel
            
            # 2. Calculate Acceleration (Deceleration) & Angle Change
            decel_val = 0.0
            angle_change = 0.0
            
            if cid in self.last_velocities:
                prev_vel = self.last_velocities[cid]
                prev_speed = np.linalg.norm(prev_vel)
                
                accel_vec = (curr_vel[0] - prev_vel[0], curr_vel[1] - prev_vel[1])
                accel_mag = np.linalg.norm(accel_vec)
                decel_val = accel_mag
                
                if speed > self.min_speed and prev_speed > self.min_speed:
                    curr_angle = self.get_angle(curr_vel)
                    prev_angle = self.get_angle(prev_vel)
                    angle_change = self.angle_diff(curr_angle, prev_angle)
            
            # 3. Calculate Anomaly Score
            anomaly_score = 0.0
            if speed > self.min_speed or (cid in self.last_velocities and np.linalg.norm(self.last_velocities[cid]) > self.min_speed):
                anomaly_score = (decel_val * self.decel_weight) + (angle_change * self.angle_weight)
            
            scores[cid] = anomaly_score
            
            # Update history
            self.object_history[cid] = (cx, cy)
            self.last_velocities[cid] = curr_vel

        # Detect crashes
        detected_pairs = []
        now = time.time()
        
        # Check for interactions
        for obj in tracked_objects:
            cid = obj.id
            cx, cy = obj.estimate[0]
            anomaly_score = scores.get(cid, 0.0)
            
            # Check for high stress (anomaly) + proximity
            if anomaly_score > self.anomaly_thresh:
                for other in tracked_objects:
                    if other.id != cid:
                        ocx, ocy = other.estimate[0]
                        dist = np.hypot(cx - ocx, cy - ocy)
                        
                        if dist < self.interaction_radius:
                            # Potential crash detected via physics
                            # We treat this as a confirmed crash pair
                            # To fit into existing structure, we need boxes
                            if cid in tracker_to_box and other.id in tracker_to_box:
                                boxA = tracker_to_box[cid]
                                boxB = tracker_to_box[other.id]
                                
                                # Check if vehicles
                                clsA, clsB = boxA[4], boxB[4]
                                if clsA in self.vehicle_classes and clsB in self.vehicle_classes:
                                    # Use a dummy high IoU/Speed to ensure it passes filters if we want
                                    # Or just directly add it.
                                    # Let's calculate real metrics for reporting
                                    iou = self.compute_iou(boxA, boxB)
                                    v1 = velocities.get(cid, (0,0))
                                    v2 = velocities.get(other.id, (0,0))
                                    rspeed = self.relative_speed(v1, v2)
                                    
                                    # Enforce overlap condition
                                    if iou > 0:
                                        pair_id = tuple(sorted([cid, other.id]))
                                        
                                        # Increment counter strongly for physics detection
                                        self.crash_counter[pair_id] += 2 # Boost count
                                        self.pair_last_seen[pair_id] = now
                                        
                                        if self.crash_counter[pair_id] >= self.min_frames_to_confirm_crash:
                                            detected_pairs.append((cid, other.id, boxA, boxB, rspeed, iou))

        # Also run standard IoU/Overlap check for backup (low speed crashes or missed anomalies)
        tracked_ids = list(tracker_to_box.keys())
        for i in range(len(tracked_ids)):
            for j in range(i + 1, len(tracked_ids)):
                idA = tracked_ids[i]
                idB = tracked_ids[j]
                
                # Skip if already detected via physics to avoid duplicates
                # (Simple check: if we processed this pair above)
                # Actually, the set logic below handles duplicates in detected_pairs list if we are careful
                # But let's just run the counter logic.
                
                boxA = tracker_to_box[idA]
                boxB = tracker_to_box[idB]
                clsA, clsB = boxA[4], boxB[4]
                
                if clsA in self.vehicle_classes and clsB in self.vehicle_classes:
                    iou = self.compute_iou(boxA, boxB)
                    v1 = velocities.get(idA, (0.0, 0.0))
                    v2 = velocities.get(idB, (0.0, 0.0))
                    rspeed = self.relative_speed(v1, v2)
                    
                    pair_id = tuple(sorted([idA, idB]))
                    
                    # Standard overlap condition
                    if iou > 0 and (iou > self.iou_threshold or rspeed > self.rel_speed_threshold):
                        self.crash_counter[pair_id] += 1
                        self.pair_last_seen[pair_id] = now
                        
                        if self.crash_counter[pair_id] >= self.min_frames_to_confirm_crash:
                             detected_pairs.append((idA, idB, boxA, boxB, rspeed, iou))
                    elif pair_id not in self.pair_last_seen or (now - self.pair_last_seen[pair_id] > 0.5):
                         # Decay if not seen recently (physics check updates last_seen too)
                         # If physics updated it, we don't decay here immediately
                         pass

        # Deduplicate detected pairs
        unique_pairs = {}
        for p in detected_pairs:
            pid = tuple(sorted([p[0], p[1]]))
            if pid not in unique_pairs:
                unique_pairs[pid] = p
        detected_pairs = list(unique_pairs.values())

        # Decay counters for pairs not seen this frame
        # We iterate all counters, if last_seen is old, we decay
        for pid in list(self.crash_counter.keys()):
            if now - self.pair_last_seen.get(pid, 0) > 0.1: # Not seen in last ~3 frames (at 30fps)
                 self.crash_counter[pid] = max(0, self.crash_counter[pid] - 1)

        # Clean up stale pairs (not seen for > 2 seconds)
        stale_pairs = [
            p for p, tlast in self.pair_last_seen.items() if now - tlast > 2.0
        ]
        for p in stale_pairs:
            self.crash_counter.pop(p, None)
            self.pair_last_seen.pop(p, None)

        # Build return structures
        bboxes_info = []
        tracked_positions = {}

        # Tracker info
        for obj in tracked_objects:
            tid = obj.id
            cx, cy = obj.estimate[0]
            tracked_positions[tid] = (float(cx), float(cy))

        # Box information (attach tracker ids if possible)
        for obj in tracked_objects:
            tid = obj.id
            if tid in tracker_to_box:
                x1, y1, x2, y2, cls_id, score = tracker_to_box[tid]
                bboxes_info.append(
                    {
                        "xyxy": [float(x1), float(y1), float(x2), float(y2)],
                        "cls": int(cls_id),
                        "cls_name": str(self.class_names.get(int(cls_id), str(cls_id))),
                        "score": float(score),
                        "tracker_id": int(tid),
                        "anomaly_score": float(scores.get(tid, 0.0))
                    }
                )

        # Crash events
        crashes = []
        cropped_images_b64 = []

        for idA, idB, boxA, boxB, rspeed, iou in detected_pairs:
            severity = "high" if rspeed > 3.0 or iou > 0.2 else "medium"
            # Boost severity if anomaly score is high
            scoreA = scores.get(idA, 0.0)
            scoreB = scores.get(idB, 0.0)
            if scoreA > self.anomaly_thresh or scoreB > self.anomaly_thresh:
                severity = "critical"

            def box_to_dict(box, tid):
                x1, y1, x2, y2, cls_id, score = box
                return {
                    "xyxy": [float(x1), float(y1), float(x2), float(y2)],
                    "cls": int(cls_id),
                    "cls_name": str(self.class_names.get(int(cls_id), str(cls_id))),
                    "score": float(score),
                    "tracker_id": int(tid),
                }

            boxA_dict = box_to_dict(boxA, idA)
            boxB_dict = box_to_dict(boxB, idB)

            crash_obj = {
                "pair_ids": (int(idA), int(idB)),
                "iou": float(iou),
                "rel_speed": float(rspeed),
                "severity": severity,
                "boxes": [boxA_dict, boxB_dict],
                "anomaly_scores": {int(idA): float(scoreA), int(idB): float(scoreB)}
            }
            crashes.append(crash_obj)

            # Optional: crop crashed vehicles and encode as base64
            if self.crop_on_crash:
                for box in (boxA, boxB):
                    x1, y1, x2, y2, cls_id, score = box
                    h, w = frame.shape[:2]
                    x1i = max(0, int(x1))
                    y1i = max(0, int(y1))
                    x2i = min(w - 1, int(x2))
                    y2i = min(h - 1, int(y2))
                    if x2i > x1i and y2i > y1i:
                        crop = frame[y1i:y2i, x1i:x2i]
                        ok, buf = cv2.imencode(
                            ".jpg",
                            crop,
                            [int(cv2.IMWRITE_JPEG_QUALITY), self.jpeg_quality],
                        )
                        if ok:
                            b64 = base64.b64encode(buf.tobytes()).decode("ascii")
                            cropped_images_b64.append(b64)

        # Encode full frame if there are crashes
        full_frame_b64 = None
        if crashes:
            ok, buf = cv2.imencode(
                ".jpg",
                frame,
                [int(cv2.IMWRITE_JPEG_QUALITY), self.jpeg_quality],
            )
            if ok:
                full_frame_b64 = base64.b64encode(buf.tobytes()).decode("ascii")

        event = {
            "frame_idx": self.frame_idx,
            "bboxes": bboxes_info,
            "tracked_positions": tracked_positions,
            "velocities": {int(k): (float(v[0]), float(v[1])) for k, v in velocities.items()},
            "crashes": crashes,
            "cropped_images_b64": cropped_images_b64,
            "full_frame_b64": full_frame_b64,
        }

        return event
