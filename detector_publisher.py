#!/usr/bin/env python3
"""
detector_publisher.py

Reads a video (file or webcam) and publishes per-frame events from AccidentDetector
over ZeroMQ PUB.
"""
import argparse
import json
import time
import base64
import sys
import threading
from typing import Any
from pathlib import Path
from copy import deepcopy

import zmq
import cv2
import numpy as np
from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn
from pymongo import MongoClient

# Import your AccidentDetector class
try:
    from detector.detector import AccidentDetector
except Exception as e:
    print("Failed to import AccidentDetector from detector/detector.py:", e)
    raise

def make_json_safe(obj: Any) -> Any:
    # primitives
    if obj is None or isinstance(obj, (str, bool, int, float)):
        return obj
    # numpy integers -> int
    if isinstance(obj, np.integer):
        return int(obj)
    # numpy floats -> float
    if isinstance(obj, np.floating):
        return float(obj)
    # numpy arrays -> lists
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    # dicts
    if isinstance(obj, dict):
        return {str(k): make_json_safe(v) for k, v in obj.items()}
    # lists / tuples
    if isinstance(obj, (list, tuple)):
        return [make_json_safe(v) for v in obj]
    # bytes
    if isinstance(obj, bytes):
        try:
            return obj.decode("utf-8")
        except Exception:
            import base64
            return base64.b64encode(obj).decode("ascii")
    # fallback
    try:
        return str(obj)
    except Exception:
        return None

# Global buffer for the latest frame
latest_frame_lock = threading.Lock()
# Initialize with a placeholder "Starting..." image so the stream is never empty
_init_img = np.zeros((480, 640, 3), np.uint8)
cv2.putText(_init_img, "Initializing Detector...", (50, 240), 
            cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
_ok, _buf = cv2.imencode(".jpg", _init_img)
latest_frame_jpeg = _buf.tobytes() if _ok else None

class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    pass

class MJPEGHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/stream.mjpg':
            self.send_response(200)
            self.send_header('Content-type', 'multipart/x-mixed-replace; boundary=frame')
            self.end_headers()
            try:
                while True:
                    with latest_frame_lock:
                        data = latest_frame_jpeg
                    
                    self.wfile.write(b'--frame\r\n')
                    self.send_header('Content-Type', 'image/jpeg')
                    self.send_header('Content-Length', str(len(data)))
                    self.end_headers()
                    self.wfile.write(data)
                    self.wfile.write(b'\r\n')
                    time.sleep(0.033)
            except Exception:
                pass
        else:
            self.send_error(404)

def start_mjpeg_server(port=5001):
    try:
        print(f"[publisher] Starting MJPEG server on port {port}...", flush=True)
        server = ThreadingHTTPServer(('0.0.0.0', port), MJPEGHandler)
        print(f"[publisher] MJPEG stream available at http://localhost:{port}/stream.mjpg", flush=True)
        server.serve_forever()
    except Exception as e:
        print(f"[publisher] Failed to start MJPEG server: {e}", flush=True)

def main(
    video_source: str, 
    zmq_port: int = 5556, 
    http_port: int = 5001,
    publish_rate: float = None, 
    camera_id: str = "cam_1", 
    publish_only_crashes: bool = False, 
    model_path: str = "yolo11s.pt",
    conf_thresh: float = 0.5,
    decel_weight: float = 5.0,
    angle_weight: float = 2.0,
    anomaly_thresh: float = 25.0,
    interaction_radius: float = 50.0,
    min_speed: float = 1.0,
    tracker_distance_threshold: float = 60.0,
    initialization_delay: int = 10,
    hit_counter_max: int = 25,
    location_name: str = None,
    location_lat: float = None,
    location_lng: float = None,
):
    global latest_frame_jpeg  # Declare global here
    # Global state for dynamic config
    config_lock = threading.Lock()
    current_config = {
        "detection_enabled": False,
        "video_source": video_source,
        "location": location_name,
        "video_source": video_source,
        "location": location_name,
        "name": None
    }
    
    # Track the active camera identity (may change if source points to another config)
    current_camera_id = camera_id
    current_identity_meta = {}

    def poll_config_updates():
        """
        Periodically check MongoDB for camera config overrides.
        """
        try:
            mongo_client = MongoClient("mongodb://127.0.0.1:27017")
            db = mongo_client["accident_db"]
            print(f"[publisher] Config polling started for {camera_id}")
            
            while True:
                try:
                    doc = db.cameras.find_one({"camera_id": camera_id})
                    if doc:
                         with config_lock:
                            # 1. Check detection_enabled
                            if "detection_enabled" in doc:
                                new_val = doc["detection_enabled"]
                                old_val = current_config["detection_enabled"]
                                if old_val != new_val:
                                    current_config["detection_enabled"] = new_val
                                    print(f"[publisher] Config updated: detection_enabled={new_val}")
                            
                            # 2. Check video_source
                            if "video_source" in doc:
                                new_src = doc["video_source"]
                                old_src = current_config["video_source"]
                                if str(new_src) != str(old_src):
                                    current_config["video_source"] = new_src
                                    print(f"[publisher] Config updated: video_source={new_src}")

                            # 3. Check location
                            if "location" in doc:
                                new_loc = doc["location"]
                                old_loc = current_config.get("location")
                                if new_loc != old_loc:
                                    current_config["location"] = new_loc
                                    print(f"[publisher] Config updated: location={new_loc}")

                            # 4. Check name
                            if "name" in doc:
                                new_name = doc["name"]
                                old_name = current_config.get("name")
                                if new_name != old_name:
                                    current_config["name"] = new_name
                                    print(f"[publisher] Config updated: name={new_name}")

                except Exception as e:
                    print(f"[publisher] Config poll error: {e}")
                
                time.sleep(1.0)
        except Exception as e:
            print(f"[publisher] Failed to connect to DB for polling: {e}")

    # Start polling thread
    poll_thread = threading.Thread(target=poll_config_updates, daemon=True)
    poll_thread.start()

    # Start MJPEG server in background
    t = threading.Thread(target=start_mjpeg_server, args=(http_port,), daemon=True)
    t.start()

    # Prepare ZeroMQ PUB
    ctx = zmq.Context()
    sock = ctx.socket(zmq.PUB)
    bind_addr = f"tcp://*:{zmq_port}"
    sock.bind(bind_addr)
    print(f"[publisher] Bound PUB socket to {bind_addr}")

    # Initial Open video source
    current_source_val = video_source
    cap = None

    def open_capture(src_val):
        try:
            s = int(src_val)
            # Try DSHOW first (best for many physical webcams on Windows)
            if sys.platform == "win32":
                print(f"[publisher] Attempting to open source {s} with CAP_DSHOW...")
                c = cv2.VideoCapture(s, cv2.CAP_DSHOW)
                # Give it a moment to initialize
                time.sleep(0.5)
                if not c.isOpened():
                    print(f"[publisher] CAP_DSHOW failed for {s}. Waiting 1s before fallback...")
                    c.release()
                    time.sleep(1.0)
                    print(f"[publisher] Falling back to default (MSMF) for {s}...")
                    c = cv2.VideoCapture(s)
            else:
                c = cv2.VideoCapture(s)
        except ValueError:
            # Not an integer -> likely a file path or URL
            s = src_val
            c = cv2.VideoCapture(s)
        
        if not c.isOpened():
             print(f"[publisher] Warning: Cannot open source {s}")
        return c

    cap = open_capture(current_source_val)
    if not cap.isOpened():
        print("[publisher] Initial source failed. Waiting for valid source...")

    detector = AccidentDetector(
        model_path=model_path,
        conf_thresh=conf_thresh,
        decel_weight=decel_weight,
        angle_weight=angle_weight,
        anomaly_thresh=anomaly_thresh,
        interaction_radius=interaction_radius,
        min_speed=min_speed,
        tracker_distance_threshold=tracker_distance_threshold,
        initialization_delay=initialization_delay,
        hit_counter_max=hit_counter_max
    )
    print("[publisher] AccidentDetector initialized.")

    frame_idx = 0
    try:
        while True:
            # Check for source switch
            new_source_val = None
            with config_lock:
                 if str(current_config["video_source"]) != str(current_source_val):
                      new_source_val = current_config["video_source"]
            
            if new_source_val is not None:
                print(f"[publisher] Switching video source to: {new_source_val}")
                if cap:
                    cap.release()
                print(f"[publisher] Released old source. Waiting 1.0s to ensure device is free...")
                time.sleep(1.0) # Safety delay for Windows camera release
                cap = open_capture(new_source_val)
                current_source_val = new_source_val
                
                # Check if this source belongs to another known camera configuration and adopt its identity
                try:
                    # We need a fresh client here or reuse the one from poll_thread if accessible?
                    # Simplest to just create a short-lived client or use a shared one if we refactored.
                    # Since this happens rarely (on switch), a new client is fine.
                    m_client = MongoClient("mongodb://127.0.0.1:27017")
                    m_db = m_client["accident_db"]
                    search_query = {
                        "video_source": str(new_source_val),
                        "camera_id": {"$ne": camera_id}  # Exclude the physical executor (demo_cam_main)
                    }
                    print(f"[publisher] SEARCHING IDENTITY: {search_query}")
                    matched_cam = m_db.cameras.find_one(search_query)
                    print(f"[publisher] FOUND IDENTITY: {matched_cam}")
                    
                    if matched_cam and matched_cam.get("camera_id"):
                        new_id = matched_cam.get("camera_id")
                        # Only switch if it's different and NOT the current controller itself
                        if new_id != current_camera_id:
                            print(f"[publisher] Dynamic Identity Switch: {current_camera_id} -> {new_id}")
                            current_camera_id = new_id
                            # Load metadata for the new identity
                            with config_lock:
                                current_identity_meta["name"] = matched_cam.get("name")
                                current_identity_meta["location"] = matched_cam.get("location")
                                current_identity_meta["sector_id"] = matched_cam.get("sector_id")
                    else:
                        # Fallback to original if no match found
                        if current_camera_id != camera_id:
                             print(f"[publisher] Identity Revert: {current_camera_id} -> {camera_id}")
                             print(f"[publisher] Identity Revert: {current_camera_id} -> {camera_id}")
                             current_camera_id = camera_id
                             # Revert metadata triggers logic to use current_config (polled)
                             with config_lock:
                                 current_identity_meta.clear()

                except Exception as e:
                    print(f"[publisher] Identity lookup failed: {e}")

                frame_idx = 0


            
            if cap is None or not cap.isOpened():
                # Visualize error on the stream so user knows it failed
                import numpy as np
                err_img = np.zeros((480, 640, 3), np.uint8)
                cv2.putText(err_img, f"FAILED TO OPEN: {current_source_val}", (50, 240), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                with latest_frame_lock:
                    ok, buf = cv2.imencode(".jpg", err_img)
                    if ok: latest_frame_jpeg = buf.tobytes()
                
                print(f"[publisher] Failed to open {current_source_val}, retrying in 2s...")
                time.sleep(2.0)
                # Retry
                cap = open_capture(current_source_val)
                continue

            ret, frame = cap.read()
            if not ret:
                print("[publisher] Video ended or stream failed, looping/retrying...")
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, frame = cap.read()
                if not ret:
                    time.sleep(0.5)
                    continue

            frame_idx += 1
            loop_start_tx = time.time()

            stream_img = deepcopy(frame)  # Frame for MJPEG streaming
            
            # Check if detection is enabled
            detection_active = True
            with config_lock:
                detection_active = current_config["detection_enabled"]

            if not detection_active:
                # Pass-through mode: No inference, just stream raw video
                if frame_idx % 30 == 0:
                     print(f"[publisher] Detection disabled (config={detection_active}), skipping inference.")
                cv2.putText(
                    stream_img,
                    "DETECTION PAUSED",
                    (50, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 
                    1.0, 
                    (0, 0, 255), 
                    2
                )
                # Update MJPEG buffer
                with latest_frame_lock:
                    encoded, buffer = cv2.imencode('.jpg', stream_img)
                    if encoded:
                        latest_frame_jpeg = buffer.tobytes()
                # Optional sleep to match frame rate of source ~30fps
                time.sleep(0.033)
                continue

            # Run tracking & accident detection
            event = detector.process_frame(frame)

            # Draw bounding boxes for visualization
            vis_frame = frame.copy()
            bboxes = event.get("bboxes", [])
            
            crashed_ids = set()
            for crash in event.get("crashes", []):
                pair = crash.get("pair_ids", [])
                crashed_ids.update(pair)

            for bbox in bboxes:
                xyxy = bbox.get("xyxy")
                cls_name = bbox.get("cls_name", "obj")
                tid = bbox.get("tracker_id", "?")
                
                if tid in crashed_ids:
                    color = (0, 0, 255)
                else:
                    color = (0, 255, 0)
                
                if xyxy:
                    x1, y1, x2, y2 = map(int, xyxy)
                    cv2.rectangle(vis_frame, (x1, y1), (x2, y2), color, 2)
                    cv2.putText(vis_frame, f"{cls_name} {tid}", (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
            
            # Update MJPEG buffer
            ok, buf = cv2.imencode(".jpg", vis_frame)
            if ok:
                with latest_frame_lock:
                    latest_frame_jpeg = buf.tobytes()
            else:
                print(f"[publisher] Failed to encode frame {frame_idx}")
            
            if frame_idx % 30 == 0:
                print(f"[publisher] Processed frame {frame_idx}, cam_id={current_camera_id}")

            # attach metadata
            # attach metadata (thread-safe read)
            # attach metadata (thread-safe read)
            with config_lock:
                if current_identity_meta:
                    # We are masquerading as another camera, use its loaded static meta
                    # Note: We don't poll updates for the masqueraded camera, but that's acceptable for now.
                    current_loc = current_identity_meta.get("location")
                    current_name = current_identity_meta.get("name")
                else:
                    # Use the polled config of the main detector
                    current_loc = current_config.get("location")
                    current_name = current_config.get("name")
            
            event["camera_id"] = current_camera_id
            if current_name:
                event["camera_name"] = current_name
            if current_loc:
                event["location"] = current_loc
            if location_lat is not None:
                event["location_lat"] = location_lat
            if location_lng is not None:
                event["location_lng"] = location_lng
            event["ts_utc"] = time.time()

            if publish_only_crashes and not event.get("crashes"):
                if publish_rate:
                    time.sleep(publish_rate)
                continue

            # Ensure full frame is always present for video buffering (unless publish_only_crashes filtered it)
            if not event.get("full_frame_b64"):
                # Encode raw frame (no bounding boxes)
                # Use slightly lower quality to save bandwidth since we are streaming 30fps
                ok, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
                if ok:
                    event["full_frame_b64"] = base64.b64encode(buf.tobytes()).decode("ascii")

            safe_event = make_json_safe(event)
            try:
                msg = json.dumps(safe_event, separators=(",", ":"), ensure_ascii=False)
                sock.send_string(msg)
            except Exception as e:
                print("[publisher] Failed to JSON-encode event:", e)

            if publish_rate:
                t_end = time.time()
                t_proc = t_end - loop_start_tx
                t_sleep = max(0.0, publish_rate - t_proc)
                if t_sleep > 0:
                    time.sleep(t_sleep)

    except KeyboardInterrupt:
        print("\n[publisher] Interrupted by user.")
    finally:
        cap.release()
        try:
            sock.close()
            ctx.term()
        except Exception:
            pass
        print("[publisher] Shutdown complete.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AccidentDetector -> ZeroMQ publisher")
    parser.add_argument("--video", "-v", required=True, help="Video file path or webcam index (0,1...). Use '0' for webcam.")
    parser.add_argument("--port", "-p", default=5556, type=int, help="ZeroMQ PUB port (default 5556)")
    parser.add_argument("--http-port", default=5001, type=int, help="MJPEG HTTP stream port (default 5001)")
    parser.add_argument("--rate", "-r", default=None, type=float, help="Optional publish delay in seconds (e.g. 0.033 -> ~30 FPS)")
    parser.add_argument("--camera-id", default="demo_cam_main", help="Camera/source identifier embedded in events")
    parser.add_argument("--only-crashes", action="store_true", help="Publish only frames that have confirmed crashes (reduces bandwidth)")
    parser.add_argument("--model", "-m", default="yolo11n.pt", help="Path to YOLO model (default: yolo11n.pt - faster)")
    parser.add_argument("--location", help="Manual location name (e.g. 'Main St')")
    parser.add_argument("--lat", type=float, help="Manual latitude")
    parser.add_argument("--lng", type=float, help="Manual longitude")
    
    # Physics / Tuning Params
    parser.add_argument("--conf-thresh", default=0.50, type=float, help="Confidence threshold (0.0-1.0)")
    parser.add_argument("--decel-weight", default=5.0, type=float, help="Deceleration weight for anomaly score")
    parser.add_argument("--angle-weight", default=2.0, type=float, help="Angle change weight for anomaly score")
    parser.add_argument("--anomaly-thresh", default=25.0, type=float, help="Anomaly score threshold to trigger crash check")
    parser.add_argument("--interaction-radius", default=50.0, type=float, help="Max distance (pixels) to consider objects interacting")
    parser.add_argument("--min-speed", default=1.0, type=float, help="Minimum speed (pixels/frame) to calculate anomalies")
    parser.add_argument("--tracker-dist", default=60.0, type=float, help="Norfair tracker distance threshold")
    parser.add_argument("--init-delay", default=10, type=int, help="Frames to wait before confirming a track")
    parser.add_argument("--hit-counter", default=25, type=int, help="Frames to keep a lost track alive")

    args = parser.parse_args()

    main(
        video_source=args.video, 
        zmq_port=args.port, 
        http_port=args.http_port,
        publish_rate=args.rate,  
        camera_id=args.camera_id, 
        publish_only_crashes=args.only_crashes, 
        model_path=args.model,
        conf_thresh=args.conf_thresh,
        decel_weight=args.decel_weight,
        angle_weight=args.angle_weight,
        anomaly_thresh=args.anomaly_thresh,
        interaction_radius=args.interaction_radius,
        min_speed=args.min_speed,
        tracker_distance_threshold=args.tracker_dist,
        initialization_delay=args.init_delay,
        hit_counter_max=args.hit_counter,
        location_name=args.location,
        location_lat=args.lat,
        location_lng=args.lng
    )
