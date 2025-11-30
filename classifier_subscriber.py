#!/usr/bin/env python3
"""
classifier_subscriber.py

Subscribes to a ZeroMQ PUB from the detector, processes events that contain confirmed crashes,
saves crop images to disk, classifies them using the placeholder classifier, and writes a
document to MongoDB.

Usage:
    python classifier_subscriber.py --host localhost --port 5556 --mongo mongodb://127.0.0.1:27017 \
        --db accident_db --outdir ./accident_crops
"""
import argparse
import base64
import io
import json
import os
from pathlib import Path
import time
from datetime import datetime
import traceback

import zmq
from PIL import Image
from pymongo import MongoClient

# Import the placeholder classifier you agreed to use
# Make sure classifier/cnn_classifier.py contains PlaceholderClassifier
try:
    from classifier.cnn_classifier import PlaceholderClassifier
except Exception:
    # Provide a very small fallback if the import fails (defensive)
    class PlaceholderClassifier:
        def __init__(self):
            print("[classifier] fallback placeholder active")

        def predict(self, pil_img: Image.Image):
            w, h = pil_img.size
            area = w * h
            if area > 200 * 200:
                severity = "high"
            elif area > 100 * 100:
                severity = "medium"
            else:
                severity = "low"
            return {
                "label": "vehicle_collision",
                "severity": severity,
                "confidence": 0.5,
                "note": "fallback placeholder"
            }


def decode_b64_to_pil(b64str: str) -> Image.Image:
    """Decode a base64 JPEG/PNG string to a PIL Image (RGB)."""
    image_bytes = base64.b64decode(b64str)
    return Image.open(io.BytesIO(image_bytes)).convert("RGB")


def save_pil_to_path(pil_img: Image.Image, path: Path, quality: int = 85) -> None:
    """Save PIL image to disk as JPEG."""
    path.parent.mkdir(parents=True, exist_ok=True)
    pil_img.save(path, format="JPEG", quality=quality)


def build_mongo_doc(camera_id, frame_idx, detector_ts, event, crops_meta):
    """Build the document to insert into MongoDB."""
    return {
        "camera_id": camera_id,
        "frame_idx": frame_idx,
        "detector_ts": datetime.utcfromtimestamp(detector_ts) if isinstance(detector_ts, (int, float)) else detector_ts,
        "inserted_at": datetime.utcnow(),
        "crashes": event.get("crashes", []),
        "bbox_count": len(event.get("bboxes", [])),
        "crop_count": len(crops_meta),
        "crops": crops_meta,
        "raw_event": event  # keep for debugging; remove or trim in production if large
    }


def main(zmq_host: str, zmq_port: int, mongo_uri: str, db_name: str, out_dir: str, verbose: bool = True):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # MongoDB client
    mongo = MongoClient(mongo_uri)
    db = mongo[db_name]
    accidents_col = db["accidents"]
    if verbose:
        print(f"[subscriber] MongoDB: {mongo_uri}, DB: {db_name}, collection: accidents")

    # ZeroMQ SUB socket
    ctx = zmq.Context()
    sock = ctx.socket(zmq.SUB)
    connect_addr = f"tcp://{zmq_host}:{zmq_port}"
    sock.connect(connect_addr)
    sock.setsockopt_string(zmq.SUBSCRIBE, "")  # subscribe to everything
    if verbose:
        print(f"[subscriber] connected SUB -> {connect_addr}")

    classifier = PlaceholderClassifier()
    if verbose:
        print("[subscriber] classifier initialized (placeholder)")

    try:
        while True:
            try:
                msg = sock.recv_string()
            except zmq.error.ZMQError:
                # socket closed or interrupted
                break

            # parse JSON
            try:
                event = json.loads(msg)
            except Exception:
                print("[subscriber] Failed to parse message as JSON; skipping. Payload head:")
                print(msg[:200])
                continue

            # fast skip if no crashes
            if not event.get("crashes"):
                continue

            camera_id = event.get("camera_id", "unknown_cam")
            frame_idx = event.get("frame_idx", None)
            ts_utc = event.get("ts_utc", time.time())

            # Process cropped images (base64) if present
            crops_b64 = event.get("cropped_images_b64", []) or []
            crops_meta = []
            for i, b64 in enumerate(crops_b64):
                try:
                    pil_img = decode_b64_to_pil(b64)
                except Exception as e:
                    print(f"[subscriber] failed to decode crop #{i}: {e}")
                    continue

                # Build unique filename
                timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%S%f")[:-3]
                fname = f"{camera_id}_f{frame_idx}_c{i}_{timestamp}.jpg"
                fpath = out_dir / fname

                try:
                    save_pil_to_path(pil_img, fpath)
                except Exception as e:
                    print(f"[subscriber] failed to save crop to disk: {e}")
                    continue

                # classify using placeholder (replace with real model later)
                try:
                    pred = classifier.predict(pil_img)
                except Exception as e:
                    pred = {"error": f"classification_failed: {str(e)}"}

                crops_meta.append({
                    "file": str(fpath),
                    "width": pil_img.width,
                    "height": pil_img.height,
                    "prediction": pred
                })

            # Build document and insert into MongoDB
            doc = build_mongo_doc(camera_id, frame_idx, ts_utc, event, crops_meta)
            try:
                res = accidents_col.insert_one(doc)
                if verbose:
                    print(f"[subscriber] inserted accident doc _id={res.inserted_id} cam={camera_id} frame={frame_idx} crops={len(crops_meta)}")
            except Exception as e:
                print(f"[subscriber] MongoDB insert failed: {e}")
                traceback.print_exc()

    except KeyboardInterrupt:
        print("[subscriber] interrupted by user")

    finally:
        try:
            sock.close()
            ctx.term()
        except Exception:
            pass
        try:
            mongo.close()
        except Exception:
            pass
        if verbose:
            print("[subscriber] shutdown complete.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ZeroMQ SUB for accident events -> classify -> MongoDB")
    parser.add_argument("--host", default="localhost", help="ZeroMQ publisher host (default: localhost)")
    parser.add_argument("--port", default=5556, type=int, help="ZeroMQ publisher port (default: 5556)")
    parser.add_argument("--mongo", default="mongodb://127.0.0.1:27017", help="MongoDB connection string")
    parser.add_argument("--db", default="accident_db", help="MongoDB database name")
    parser.add_argument("--outdir", default="./accident_crops", help="Directory to save crop images")
    parser.add_argument("--quiet", action="store_true", help="Suppress verbose logs")
    args = parser.parse_args()

    main(zmq_host=args.host, zmq_port=args.port, mongo_uri=args.mongo, db_name=args.db, out_dir=args.outdir, verbose=not args.quiet)
