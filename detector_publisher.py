#!/usr/bin/env python3
"""
detector_publisher.py

Reads a video (file or webcam) and publishes per-frame events from AccidentDetector
over ZeroMQ PUB.

Usage:
    python detector_publisher.py --video /path/to/video.mp4
    python detector_publisher.py --video 0                # use webcam index 0
    python detector_publisher.py --video sample.mp4 --port 5556 --rate 0.03

Notes:
- Expects detector/detector.py to exist and define AccidentDetector.
- The producer publishes JSON strings on tcp://*:<port>.
- Use classifier_subscriber.py as a subscriber to consume events.
"""
import argparse
import json
import time
import sys
from typing import Any
from pathlib import Path

import zmq
import cv2
import numpy as np

# Import your AccidentDetector class
try:
    from detector.detector import AccidentDetector
except Exception as e:
    print("Failed to import AccidentDetector from detector/detector.py:", e)
    raise

def make_json_safe(obj: Any) -> Any:
    """
    Recursively convert objects to JSON-safe types:
      - numpy types -> native Python types
      - bytes -> base64 strings (if present)
      - other non-serializables -> str()
    """
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

import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn

# Global buffer for the latest frame
latest_frame_lock = threading.Lock()
latest_frame_jpeg = None

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
                        if latest_frame_jpeg is None:
                            continue
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
        server = ThreadingHTTPServer(('0.0.0.0', port), MJPEGHandler)
        print(f"[publisher] MJPEG stream available at http://localhost:{port}/stream.mjpg")
        server.serve_forever()
    except Exception as e:
        print(f"[publisher] Failed to start MJPEG server: {e}")

def main(
    video_source: str, 
    zmq_port: int = 5556, 
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
):
    # Start MJPEG server in background
    t = threading.Thread(target=start_mjpeg_server, args=(5001,), daemon=True)
    t.start()

    # Prepare ZeroMQ PUB
    ctx = zmq.Context()
    sock = ctx.socket(zmq.PUB)
    bind_addr = f"tcp://*:{zmq_port}"
    sock.bind(bind_addr)
    print(f"[publisher] Bound PUB socket to {bind_addr}")

    # Open video source
    # allow '0' or '1' etc for webcam indices
    try:
        src = int(video_source)
    except Exception:
        src = video_source

    cap = cv2.VideoCapture(src)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video source: {video_source}")

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
            ret, frame = cap.read()
            if not ret:
                # If video file ends, loop back to start
                print("[publisher] Video ended, looping...")
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, frame = cap.read()
                if not ret:
                    print("[publisher] Failed to read video frame after loop.")
                    break
            frame_idx += 1
            loop_start_tx = time.time()

            # process frame -> event (expected JSON-friendly structure)
            event = detector.process_frame(frame)

            # Draw bounding boxes for visualization
            vis_frame = frame.copy()
            bboxes = event.get("bboxes", [])
            
            # Identify crashed tracker IDs
            crashed_ids = set()
            for crash in event.get("crashes", []):
                pair = crash.get("pair_ids", [])
                crashed_ids.update(pair)

            for bbox in bboxes:
                xyxy = bbox.get("xyxy")
                cls_name = bbox.get("cls_name", "obj")
                tid = bbox.get("tracker_id", "?")
                
                # Red for crash, Green for normal
                if tid in crashed_ids:
                    color = (0, 0, 255)
                    # print(f"[publisher] Drawing RED box for tracker {tid}")
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
                    global latest_frame_jpeg
                    latest_frame_jpeg = buf.tobytes()

            # attach metadata
            event["camera_id"] = camera_id
            event["ts_utc"] = time.time()

            # Optionally publish only events with crashes to reduce bandwidth
            if publish_only_crashes and not event.get("crashes"):
                # still update internal state but don't publish
                if frame_idx % 100 == 0:
                    print(f"[publisher] frame {frame_idx} (no crashes) - skipping publish.")
                if publish_rate:
                    time.sleep(publish_rate)
                continue

            # make JSON-safe copy
            safe_event = make_json_safe(event)

            # encode as JSON and publish
            try:
                msg = json.dumps(safe_event, separators=(",", ":"), ensure_ascii=False)
                sock.send_string(msg)
            except Exception as e:
                # fallback: try to stringify event and send
                print("[publisher] Failed to JSON-encode event (sending str fallback):", e)
                try:
                    sock.send_string(str(safe_event))
                except Exception as e2:
                    print("[publisher] Failed to send fallback string event:", e2)

            # small logging
            if frame_idx % 50 == 0:
                crash_count = len(event.get("crashes", []))
                print(f"[publisher] published frame {frame_idx} (crashes: {crash_count})")

            # optional throttle to approximate real-time (seconds)
            # Smart sleep: only wait what is left of the target frame time
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
    parser.add_argument("--rate", "-r", default=None, type=float, help="Optional publish delay in seconds (e.g. 0.033 -> ~30 FPS)")
    parser.add_argument("--camera-id", default="demo_cam_1", help="Camera/source identifier embedded in events")
    parser.add_argument("--only-crashes", action="store_true", help="Publish only frames that have confirmed crashes (reduces bandwidth)")
    parser.add_argument("--model", "-m", default="yolo11s.pt", help="Path to YOLO model (default: yolo11s.pt)")
    
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
        hit_counter_max=args.hit_counter
    )
