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

def main(video_source: str, zmq_port: int = 5556, publish_rate: float = None, camera_id: str = "cam_1", publish_only_crashes: bool = False):
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

    detector = AccidentDetector()
    print("[publisher] AccidentDetector initialized.")

    frame_idx = 0
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("[publisher] End of video / stream.")
                break
            frame_idx += 1

            # process frame -> event (expected JSON-friendly structure)
            event = detector.process_frame(frame)

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
            if publish_rate:
                time.sleep(publish_rate)

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
    args = parser.parse_args()

    main(video_source=args.video, zmq_port=args.port, publish_rate=args.rate, camera_id=args.camera_id, publish_only_crashes=args.only_crashes)
