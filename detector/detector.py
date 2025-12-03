#!/usr/bin/env python3
"""
detector.py

AccidentDetector class that wraps YOLO + Norfair and detects vehicle collisions
using the same logic as prototype_accident_detector.py:

- YOLOv11 object detection
- Norfair tracking (tracker IDs are used to track objects over time)
- Crash logic based on:
    * IoU between vehicle bounding boxes
    * Relative speed between tracked objects
    * A minimum number of consecutive frames to confirm a crash
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
    ):
        """
        Initialize the accident detector.

        Args:
            model_path: Path to YOLOv11 weights.
            conf_thresh: Confidence threshold for detections.
            iou_threshold: IoU threshold for considering overlapping vehicles.
            min_frames_to_confirm_crash: Number of consecutive frames a pair
                must satisfy the condition (IoU or relative speed) to be
                considered a crash.
            rel_speed_threshold: Relative speed threshold (in pixels/frame).
            target_classes: Set of class IDs to track (default: {0,2,3,7}).
            vehicle_classes: Set of class IDs considered as vehicles
                (default: {2,3,7}).
            tracker_distance_threshold: Norfair distance_threshold.
            crop_on_crash: Whether to return cropped images for crashed vehicles.
            jpeg_quality: JPEG quality for cropped images.
        """
        self.model_path = model_path
        self.conf_thresh = conf_thresh
        self.iou_threshold = iou_threshold
        self.min_frames_to_confirm_crash = min_frames_to_confirm_crash
        self.rel_speed_threshold = rel_speed_threshold
        self.crop_on_crash = crop_on_crash
        self.jpeg_quality = int(jpeg_quality)

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
        )

        # Per-tracker history: tracker_id -> last center (x, y)
        self.object_history = {}

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

    def get_velocity(self, obj_id, curr_pos):
        """
        Compute velocity from previous position. Store curr_pos as last position.
        """
        if obj_id in self.object_history:
            prev = self.object_history[obj_id]
            vel = (curr_pos[0] - prev[0], curr_pos[1] - prev[1])
        else:
            vel = (0.0, 0.0)
        self.object_history[obj_id] = curr_pos
        return vel

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
                - crashes: list of crash dicts:
                    {
                        "pair_ids": (idA, idB),
                        "iou": float,
                        "rel_speed": float,
                        "severity": "high"/"medium",
                        "boxes": [boxA_dict, boxB_dict]
                    }
                - cropped_images_b64: list of base64 JPEG blobs for crashed vehicles
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

        # Compute velocities per tracker id
        velocities = {}
        for obj in tracked_objects:
            tid = obj.id
            cx, cy = obj.estimate[0]
            v = self.get_velocity(tid, (cx, cy))
            velocities[tid] = v

        # Detect crashes between vehicle objects using tracker IDs
        detected_pairs = []
        now = time.time()
        tracked_ids = list(tracker_to_box.keys())

        for i in range(len(tracked_ids)):
            for j in range(i + 1, len(tracked_ids)):
                idA = tracked_ids[i]
                idB = tracked_ids[j]
                boxA = tracker_to_box[idA]
                boxB = tracker_to_box[idB]

                clsA, clsB = boxA[4], boxB[4]
                if clsA in self.vehicle_classes and clsB in self.vehicle_classes:
                    iou = self.compute_iou(boxA, boxB)
                    v1 = velocities.get(idA, (0.0, 0.0))
                    v2 = velocities.get(idB, (0.0, 0.0))
                    rspeed = self.relative_speed(v1, v2)

                    pair_id = tuple(sorted([idA, idB]))

                    # Enforce overlap: iou must be > 0
                    if iou > 0 and (iou > self.iou_threshold or rspeed > self.rel_speed_threshold):
                        # Condition met this frame => increase counter
                        self.crash_counter[pair_id] += 1
                        self.pair_last_seen[pair_id] = now

                        if self.crash_counter[pair_id] >= self.min_frames_to_confirm_crash:
                            detected_pairs.append((idA, idB, boxA, boxB, rspeed, iou))
                    else:
                        # Condition not met -> decay counter (but not below 0)
                        self.crash_counter[pair_id] = max(
                            0, self.crash_counter.get(pair_id, 0) - 1
                        )

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
                    }
                )

        # Crash events
        crashes = []
        cropped_images_b64 = []

        for idA, idB, boxA, boxB, rspeed, iou in detected_pairs:
            severity = "high" if rspeed > 3.0 or iou > 0.2 else "medium"

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
