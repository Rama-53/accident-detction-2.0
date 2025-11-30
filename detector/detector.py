# detector/detector.py
import cv2
import numpy as np
from ultralytics import YOLO
import norfair
from typing import List, Dict, Any, Tuple
from PIL import Image
import io
import base64

class AccidentDetector:
    def __init__(self,
                 yolo_weights: str = "yolov8s.pt",
                 target_classes: set = {0,2,3,7},
                 vehicle_classes: set = {2,3,7},
                 conf_thresh: float = 0.5,
                 iou_threshold: float = 0.05,
                 min_frames: int = 2,
                 tracker_distance_thresh: int = 30):
        # load model
        self.model = YOLO(yolo_weights)
        self.CLASS_NAMES = self.model.names
        self.TARGET_CLASSES = target_classes
        self.VEHICLE_CLASSES = vehicle_classes
        self.conf_thresh = conf_thresh
        self.iou_threshold = iou_threshold
        self.min_frames = min_frames

        # tracker
        self.tracker = norfair.Tracker(distance_function="mean_euclidean",
                                      distance_threshold=tracker_distance_thresh)
        self.object_history = {}   # tracker_id -> last (cx,cy)
        self.crash_counter = {}    # pair -> consecutive frames
        self.frame_idx = 0

    # --- helpers ---
    def _yolo_to_norfair(self, results) -> Tuple[List[norfair.Detection], List[Tuple]]:
        norfair_dets = []
        boxes_out = []
        for box in results.boxes:
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            score = float(box.conf.cpu().numpy().item())
            cls_id = int(box.cls.cpu().numpy().item())
            if score >= self.conf_thresh and cls_id in self.TARGET_CLASSES:
                cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
                norfair_dets.append(norfair.Detection(points=np.array([[cx, cy]]), scores=np.array([score])))
                boxes_out.append((float(x1), float(y1), float(x2), float(y2), int(cls_id), float(score)))
        return norfair_dets, boxes_out

    @staticmethod
    def compute_iou(boxA, boxB):
        xA = max(boxA[0], boxB[0]); yA = max(boxA[1], boxB[1])
        xB = min(boxA[2], boxB[2]); yB = min(boxA[3], boxB[3])
        interArea = max(0, xB - xA) * max(0, yB - yA)
        if interArea == 0: return 0.0
        boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
        boxBArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])
        return interArea / float(boxAArea + boxBArea - interArea)

    def _get_velocity(self, history, obj_id, curr_pos):
        if obj_id in history:
            prev_pos = history[obj_id]
            velocity = (curr_pos[0] - prev_pos[0], curr_pos[1] - prev_pos[1])
        else:
            velocity = (0.0, 0.0)
        history[obj_id] = curr_pos
        return velocity

    def detect_vehicle_crash(self, bboxes, velocities):
        crashes = []
        for i in range(len(bboxes)):
            for j in range(i+1, len(bboxes)):
                boxA, boxB = bboxes[i], bboxes[j]
                clsA, clsB = boxA[4], boxB[4]
                if clsA in self.VEHICLE_CLASSES and clsB in self.VEHICLE_CLASSES:
                    iou = self.compute_iou(boxA, boxB)
                    if iou > self.iou_threshold:
                        pair = tuple(sorted([i, j]))
                        self.crash_counter[pair] = self.crash_counter.get(pair, 0) + 1
                        if self.crash_counter[pair] >= self.min_frames:
                            crashes.append({"pair": pair, "bboxes": (boxA, boxB), "iou": iou})
                    else:
                        # reset pair if not overlapping this frame
                        pair = tuple(sorted([i, j]))
                        if pair in self.crash_counter: 
                            self.crash_counter[pair] = 0
        return crashes

    def crop_boxes(self, frame: np.ndarray, boxes: List[Tuple]) -> List[np.ndarray]:
        crops = []
        h, w = frame.shape[:2]
        for (x1, y1, x2, y2, cls_id, score) in boxes:
            # clamp & int
            x1i, y1i, x2i, y2i = max(0,int(x1)), max(0,int(y1)), min(w,int(x2)), min(h,int(y2))
            if x2i - x1i <= 2 or y2i - y1i <= 2: 
                continue
            crop = frame[y1i:y2i, x1i:x2i].copy()
            crops.append(crop)
        return crops

    def _bgr_to_base64(self, img_bgr: np.ndarray) -> str:
        # encode as JPEG and base64 (useful for REST/dashboard)
        _, buf = cv2.imencode('.jpg', img_bgr)
        b64 = base64.b64encode(buf).decode('ascii')
        return b64

    # --- main processing function ---
    def process_frame(self, frame: np.ndarray) -> Dict[str, Any]:
        self.frame_idx += 1
        results = self.model(frame, verbose=False)[0]
        norfair_detections, bboxes = self._yolo_to_norfair(results)

        tracked_objects = self.tracker.update(detections=norfair_detections)

        tracked_map = {}    # tracker_id -> (cx,cy)
        velocities = {}
        for obj in tracked_objects:
            cx, cy = float(obj.estimate[0][0]), float(obj.estimate[0][1])
            vx, vy = self._get_velocity(self.object_history, obj.id, (cx, cy))
            velocities[obj.id] = (vx, vy)
            tracked_map[obj.id] = (cx, cy)

        # attach tracker ids back to boxes (best-effort: match by nearest centroid)
        # compute centroids for bboxes
        box_centroids = [((b[0]+b[2])/2, (b[1]+b[3])/2) for b in bboxes]
        assigned = []
        boxes_with_trackers = []
        for bi, box in enumerate(bboxes):
            bx, by = box_centroids[bi]
            # find closest tracker
            best_id, best_dist = None, float('inf')
            for tid, (tx, ty) in tracked_map.items():
                d = np.hypot(bx - tx, by - ty)
                if d < best_dist:
                    best_id, best_dist = tid, d
            boxes_with_trackers.append((box[0],box[1],box[2],box[3],box[4],box[5], best_id))
        
        # detect crashes by box overlap (IOU + consecutive frames)
        crashes = self.detect_vehicle_crash(bboxes, velocities)

        # prepare output crops for classification only when crashes confirmed
        cropped_images = []
        for crash in crashes:
            bA, bB = crash["bboxes"]
            crops = self.crop_boxes(frame, [bA, bB])
            cropped_images.extend(crops)

        # make a JSON-friendly small preview list (base64 string) - optional
        previews = [self._bgr_to_base64(img) for img in cropped_images]

        event = {
            "frame_idx": self.frame_idx,
            "bboxes": [
                {"xyxy":[float(box[0]),float(box[1]),float(box[2]),float(box[3])],
                 "cls": int(box[4]), "score": float(box[5]), "tracker_id": int(box[6]) if box[6] is not None else None}
                for box in boxes_with_trackers
            ],
            "tracked_positions": tracked_map,
            "velocities": {int(k): (float(v[0]), float(v[1])) for k,v in velocities.items()},
            "crashes": crashes,
            "cropped_images_b64": previews,  # small previews for dashboard/REST
        }
        return event

# ----- Demo runner (standalone usage) -----
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--video","-v", default="cctv_eg.mp4")
    args = parser.parse_args()
    cap = cv2.VideoCapture(args.video)
    det = AccidentDetector()
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret: break
        event = det.process_frame(frame)
        # draw debug overlay (optional)
        for b in event["bboxes"]:
            x1,y1,x2,y2 = map(int, b["xyxy"])
            label = f"{det.CLASS_NAMES[b['cls']]}:{b['score']:.2f}"
            cv2.rectangle(frame, (x1,y1),(x2,y2), (0,255,0), 2)
            cv2.putText(frame, label, (x1,y1-6), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,255,0), 1)
            if b["tracker_id"] is not None:
                cv2.putText(frame, f"ID:{b['tracker_id']}", (x1,y2+12), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255,255,0), 1)
        if event["crashes"]:
            cv2.putText(frame, "CRASH!", (40,40), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0,0,255), 3)
        cv2.imshow("detector", frame)
        if cv2.waitKey(1) & 0xFF == 27: break
    cap.release()
    cv2.destroyAllWindows()
