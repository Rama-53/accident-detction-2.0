# prototype_accident_detector.py
import io
import time
import threading
from collections import defaultdict, deque

from flask import Flask, Response, jsonify, send_file, request
import cv2
import numpy as np

# Ultralytics YOLO import (ultralytics >= 8.x)
from ultralytics import YOLO

# Norfair for tracking
import norfair

# ---------- CONFIG ----------
VIDEO_SOURCE = "cctv_eg.mp4"  # or integer 0 for webcam
YOLO_MODEL_PATH = "yolov8s.pt"
TARGET_CLASSES = {0, 2, 3, 7}  # person, car, motorcycle, truck
VEHICLE_CLASSES = {2, 3, 7}    # only vehicle-vehicle collisions
CONF_THRESH = 0.45
IOU_THRESHOLD = 0.03
MIN_FRAMES_TO_CONFIRM_CRASH = 3
REL_SPEED_THRESHOLD = 1.0  # tune for your scale
MAX_EVENTS_STORED = 200
SNAPSHOT_QUALITY = 80
# ----------------------------

app = Flask(__name__)

# shared state
state_lock = threading.Lock()
latest_frame_jpeg = None          # bytes of latest encoded JPEG
events = deque(maxlen=MAX_EVENTS_STORED)   # recent crash events
snapshots = deque(maxlen=200)     # snapshot URLs (we store bytes in memory as tuples)
running = True

# load YOLO
print("Loading YOLO model:", YOLO_MODEL_PATH)
model = YOLO(YOLO_MODEL_PATH)

# Norfair tracker (1D point: center)
tracker = norfair.Tracker(distance_function="mean_euclidean", distance_threshold=60)

# history: tracker_id -> last center (x,y)
object_history = {}
# crash_counter: (id1,id2) -> consecutive_frames_counter
crash_counter = defaultdict(int)
# last_seen timestamp for pairs (to decay counters)
pair_last_seen = {}

# helper: convert yolo results to boxes + centers for Norfair
def yolo_to_boxes_and_dets(results, conf_thresh=CONF_THRESH):
    boxes_out = []       # (x1,y1,x2,y2,class_id,score)
    dets = []            # norfair.Detection list
    for r in results.boxes:
        x1, y1, x2, y2 = r.xyxy[0].cpu().numpy()
        score = float(r.conf.cpu().numpy().item())
        cls_id = int(r.cls.cpu().numpy().item())
        if score >= conf_thresh and cls_id in TARGET_CLASSES:
            cx, cy = (x1 + x2) / 2.0, (y1 + y2) / 2.0
            dets.append(norfair.Detection(points=np.array([[cx, cy]]), scores=np.array([score])))
            boxes_out.append((x1, y1, x2, y2, cls_id, score))
    return dets, boxes_out

def compute_iou(boxA, boxB):
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])
    interW = max(0, xB - xA)
    interH = max(0, yB - yA)
    interArea = interW * interH
    if interArea == 0:
        return 0.0
    aArea = (boxA[2]-boxA[0])*(boxA[3]-boxA[1])
    bArea = (boxB[2]-boxB[0])*(boxB[3]-boxB[1])
    return interArea / float(aArea + bArea - interArea)

def get_velocity(history, obj_id, curr_pos):
    if obj_id in history:
        prev = history[obj_id]
        vel = (curr_pos[0] - prev[0], curr_pos[1] - prev[1])
    else:
        vel = (0.0, 0.0)
    history[obj_id] = curr_pos
    return vel

def relative_speed(v1, v2):
    return np.linalg.norm([v1[0]-v2[0], v1[1]-v2[1]])

def process_frame(frame):
    """
    Run YOLO detection, Norfair tracking, detect collisions, draw overlays and
    return JPEG bytes.
    """
    global crash_counter, pair_last_seen

    # run detection
    results = model(frame, verbose=False)[0]
    norfair_dets, boxes = yolo_to_boxes_and_dets(results, CONF_THRESH)

    # update tracker
    tracked_objects = tracker.update(detections=norfair_dets)

    # map centers -> nearest box index (so we can attach class and bounding box to tracker ids)
    tracker_to_box = {}   # tracker_id -> (box tuple)
    # build list of centers for matching
    centers = []
    for b in boxes:
        x1,y1,x2,y2,cls,score = b
        centers.append(((x1+x2)/2.0, (y1+y2)/2.0))
    # for each tracked object, find closest box center
    for obj in tracked_objects:
        cx,cy = obj.estimate[0]
        # find nearest box center
        best_idx = None
        best_dist = float("inf")
        for idx, c in enumerate(centers):
            d = np.linalg.norm([cx - c[0], cy - c[1]])
            if d < best_dist:
                best_dist = d
                best_idx = idx
        if best_idx is not None:
            tracker_to_box[obj.id] = boxes[best_idx]

    # compute velocities for each tracked id
    velocities = {}
    for obj in tracked_objects:
        cid = obj.id
        cx,cy = obj.estimate[0]
        vel = get_velocity(object_history, cid, (cx,cy))
        velocities[cid] = vel

    # detect collisions between tracked vehicle objects (use tracker ids)
    detected_pairs = []
    tracked_ids = list(tracker_to_box.keys())
    for i in range(len(tracked_ids)):
        for j in range(i+1, len(tracked_ids)):
            idA = tracked_ids[i]
            idB = tracked_ids[j]
            boxA = tracker_to_box[idA]
            boxB = tracker_to_box[idB]
            clsA, clsB = boxA[4], boxB[4]
            if clsA in VEHICLE_CLASSES and clsB in VEHICLE_CLASSES:
                iou = compute_iou(boxA, boxB)
                # compute relative speed
                v1 = velocities.get(idA, (0,0))
                v2 = velocities.get(idB, (0,0))
                rspeed = relative_speed(v1, v2)
                if iou > 0 and (iou > IOU_THRESHOLD or rspeed > REL_SPEED_THRESHOLD):
                    # count consecutive frames for this pair
                    pid = tuple(sorted([idA,idB]))
                    crash_counter[pid] += 1
                    pair_last_seen[pid] = time.time()
                    if crash_counter[pid] >= MIN_FRAMES_TO_CONFIRM_CRASH:
                        detected_pairs.append((idA, idB, boxA, boxB, rspeed, iou))
                else:
                    # not overlapping this frame -> decay / reset
                    pid = tuple(sorted([idA,idB]))
                    crash_counter[pid] = max(0, crash_counter.get(pid,0)-1)

    # cleanup stale pairs (if not seen recently)
    now = time.time()
    stale = [p for p,t in pair_last_seen.items() if now - t > 2.0]
    for p in stale:
        crash_counter.pop(p, None)
        pair_last_seen.pop(p, None)

    # if crashes found, create events and snapshots
    for idA,idB,boxA,boxB,rspeed,iou in detected_pairs:
        # create an event
        ev = {
            "id": f"{int(time.time()*1000)}_{idA}_{idB}",
            "time": time.time(),
            "type": "vehicle_collision",
            "severity": "high" if rspeed > 3.0 or iou>0.2 else "medium",
            "tracker_ids": [idA,idB],
            "iou": float(iou),
            "rel_speed": float(rspeed),
            "image_url": None,
            "location": None
        }
        # capture a snapshot
        _, jpg = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), SNAPSHOT_QUALITY])
        jpg_bytes = jpg.tobytes()
        # store snapshot in memory as bytes with id (in real app store to disk and serve path)
        snapshots.appendleft((ev["id"], jpg_bytes))
        ev["image_url"] = f"/snapshot/{ev['id']}"
        # add event to the deque (front)
        with state_lock:
            events.appendleft(ev)

    # draw overlays on frame
    out = frame.copy()
    # draw boxes
    for (x1,y1,x2,y2,cls,score) in boxes:
        color = tuple(int(c) for c in (0,200,50))  # green-ish
        cv2.rectangle(out, (int(x1),int(y1)), (int(x2),int(y2)), color, 2)
        label = f"{model.names[int(cls)]} {score:.2f}"
        cv2.putText(out, label, (int(x1), int(y1)-6), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)

    # draw tracker ids & small arrows
    for obj in tracked_objects:
        tx, ty = int(obj.estimate[0][0]), int(obj.estimate[0][1])
        cv2.circle(out, (tx,ty), 3, (255,255,0), -1)
        cv2.putText(out, f"ID:{obj.id}", (tx+6, ty-6), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255,255,0), 1)
        v = velocities.get(obj.id, (0,0))
        cv2.arrowedLine(out, (tx,ty), (int(tx + v[0]*3), int(ty + v[1]*3)), (200,100,0), 1, tipLength=0.3)

    # highlight collisions on screen
    for idA,idB,boxA,boxB,rspeed,iou in detected_pairs:
        for b in (boxA,boxB):
            cv2.rectangle(out, (int(b[0]), int(b[1])), (int(b[2]), int(b[3])), (0,0,255), 3)
        cv2.putText(out, "CRASH", (50,50), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0,0,255), 3)

    # encode jpeg
    success, jpg = cv2.imencode('.jpg', out, [int(cv2.IMWRITE_JPEG_QUALITY), SNAPSHOT_QUALITY])
    if not success:
        return None
    return jpg.tobytes()

# background thread: capture loop continuously updates latest_frame_jpeg
def capture_loop():
    global latest_frame_jpeg, running
    cap = cv2.VideoCapture(VIDEO_SOURCE)
    if not cap.isOpened():
        print("ERROR: Cannot open video source:", VIDEO_SOURCE)
        running = False
        return

    while running:
        ret, frame = cap.read()
        if not ret:
            # loop video file
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            time.sleep(0.1)
            continue

        try:
            jpg_bytes = process_frame(frame)
            with state_lock:
                latest_frame_jpeg = jpg_bytes
        except Exception as e:
            print("Error processing frame:", e)

        # adapt loop speed depending on source FPS
        time.sleep(0.01)

    cap.release()

# Flask endpoints
@app.route('/status')
def status():
    return jsonify({"status":"Running" if running else "Stopped"})

@app.route('/video_feed')
def video_feed():
    def generate():
        boundary = b'--frame'
        while running:
            with state_lock:
                frame = latest_frame_jpeg
            if frame:
                yield boundary + b'\r\n' + b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n'
            else:
                # small pause if no frame yet
                time.sleep(0.05)
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/events')
def get_events():
    # return recent events as JSON
    with state_lock:
        evs = list(events)
    # convert timestamps
    out = []
    for e in evs:
        out.append({
            "id": e["id"],
            "time": e["time"],
            "type": e["type"],
            "severity": e["severity"],
            "image_url": e["image_url"],
            "location": e["location"],
            "rel_speed": e.get("rel_speed"),
            "iou": e.get("iou"),
        })
    return jsonify(out)

@app.route('/snapshots')
def get_snapshots():
    # return list of snapshot ids (for gallery)
    with state_lock:
        snaps = [sid for sid,_ in snapshots]
    return jsonify(snaps)

@app.route('/snapshot/<sid>')
def serve_snapshot(sid):
    # find the snapshot bytes and return it
    with state_lock:
        for idb, data in snapshots:
            if idb == sid:
                return Response(data, mimetype='image/jpeg')
    return ("Not found", 404)

@app.route('/acknowledge/<eid>', methods=['POST'])
def acknowledge(eid):
    # mark event acknowledged (simple remove)
    with state_lock:
        removed = [e for e in events if e['id']==eid]
        for r in removed:
            try:
                events.remove(r)
            except:
                pass
    return jsonify({"ok": True, "removed": len(removed)})

if __name__ == '__main__':
    # start capture thread
    t = threading.Thread(target=capture_loop, daemon=True)
    t.start()
    # run flask
    print("Starting Flask server on http://127.0.0.1:5000")
    app.run(host="0.0.0.0", port=5000, threaded=True)
