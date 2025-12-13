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
from collections import deque
import pandas as pd
import easyocr
from ultralytics import YOLO
import numpy as np

import cv2
class CameraState:
    def __init__(self, history_len=10, cooldown_len=10):
        self.history = deque(maxlen=history_len)
        self.cooldown = 0
        self.cooldown_len = cooldown_len
        self.vlm_buffer = [] # Store (timestamp, image_path, pil_img) tuples
        self.vlm_done = False # Only run once per accident event

    def update(self, is_accident):
        self.history.append(is_accident)
        if self.cooldown > 0:
            self.cooldown -= 1
        
        # If no accident for a while, reset VLM state for next time
        if sum(self.history) == 0:
            self.vlm_done = False
            self.vlm_buffer = []

    def should_alert(self):
        # Alert if >= 7 accidents in last 10 frames
        # We removed the internal blocking cooldown to allow external logic (subscriber) 
        # to decide whether to group or create new alerts.
        return sum(self.history) >= 7

# Switch to VLM (Google Gemini)
try:
    from classifier.vlm_classifier import VLMClassifier
    # You can hardcode key here for testing or rely on env var
    classifier = VLMClassifier(model_name="gemini-1.5-flash") 
    print("[subscriber] VLM (Gemini) initialized for classification")
except ImportError:
    print("[subscriber] VLM module not found, falling back to dummy/CNN")
    # Fallback/Dummy logic if needed
    from classifier.cnn_classifier import AccidentClassifier
    classifier = AccidentClassifier()

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
    doc = {
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
    # Hoist location metadata to top-level if present
    if "location" in event:
        doc["location"] = event["location"]
    if "location_lat" in event:
        doc["location_lat"] = event["location_lat"]
    if "location_lng" in event:
        doc["location_lng"] = event["location_lng"]
    return doc


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

    # --- LPR Initialization ---
    try:
        lp_model = YOLO("license_plate_detector.pt")
        ocr_reader = easyocr.Reader(['en'], gpu=True) # or gpu=False if no GPU
        contacts_df = pd.read_excel("emergency_contacts.xlsx")
        # Ensure license plate column is string and clean
        contacts_df['LicensePlate'] = contacts_df['LicensePlate'].astype(str).str.strip().str.upper()
        if verbose:
            print("[subscriber] LPR system initialized (Model + OCR + Contacts)")
    except Exception as e:
        print(f"[subscriber] WARNING: LPR init failed: {e}")
        lp_model = None

    # Track state per camera
    camera_states = {}

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
            
            # 1. Handle Full Frame (if present) - Make it the FIRST item
            full_frame_b64 = event.get("full_frame_b64")
            if full_frame_b64:
                try:
                    ff_img = decode_b64_to_pil(full_frame_b64)
                    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%S%f")[:-3]
                    fname = f"{camera_id}_f{frame_idx}_FULL_{timestamp}.jpg"
                    fpath = out_dir / fname
                    save_pil_to_path(ff_img, fpath)
                    
                    save_pil_to_path(ff_img, fpath)
                    
                    # --- VLM Multi-Frame Logic ---
                    # Only collect if we haven't done VLM for this event yet
                    if not state.vlm_done:
                        current_time = time.time()
                        
                        # Add frame if buffer empty OR enough time passed (>0.8s)
                        if not state.vlm_buffer or (current_time - state.vlm_buffer[-1][0] > 0.8):
                            state.vlm_buffer.append((current_time, fpath, ff_img))
                            if verbose:
                                print(f"[subscriber] VLM Buffer: {len(state.vlm_buffer)}/3 frames captured")

                        # If we have 3 frames, Trigger Prediction
                        if len(state.vlm_buffer) >= 3:
                            if verbose:
                                print("[subscriber] Triggering Gemini VLM Analysis on 3 frames...")
                            
                            images_to_send = [item[2] for item in state.vlm_buffer] # Extract PIL images
                            
                            if classifier:
                                pred = classifier.predict(images_to_send)
                            else:
                                 pred = {
                                    "label": "vehicle_collision",
                                    "severity": "high",
                                    "confidence": 1.0, 
                                    "description": "Fallback (No VLM)"
                                }
                            
                            state.vlm_done = True # Mark done so we don't spam API
                            state.vlm_buffer = [] # Clear buffer
                            
                            # We attach this VLM result to the CURRENT frame metadata
                            # Ideally, we should update the MAIN alert document with this detailed note.
                            # But for now, putting it in crops metadata ensures it gets into DB.
                        else:
                            # Not ready yet, standard placeholder
                            pred = { "label": "processing", "severity": "pending", "description": "Analyzing sequence..." }
                    else:
                        # Already done
                         pred = { "label": "vehicle_collision", "severity": "high", "description": "VLM Analysis Complete" }

                    # Add to metadata
                    crops_meta.append({
                        "file": str(fpath),
                        "width": ff_img.width,
                        "height": ff_img.height,
                        "prediction": pred
                    })
                except Exception as e:
                    print(f"[subscriber] failed to save full frame: {e}")

            # 2. Handle Crops - SKIPPED per user request (Full frame only)
            # We do not log/save cropped photos from CNN classifier anymore.
            # The 'crops_meta' will only contain the Full Frame (from step 1).
            pass

            # Filter crops: keep ONLY "vehicle_collision"
            accident_crops = []
            for c in crops_meta:
                if c["prediction"].get("label") == "vehicle_collision":
                    accident_crops.append(c)
                else:
                    # Delete non-accident crop image
                    try:
                        os.remove(c["file"])
                    except OSError:
                        pass
            
            crops_meta = accident_crops

            # --- License Plate Recognition Logic ---
            # Run ONLY if we have accident crops and LPR is loaded.
            # Ideally run this only once per vehicle per accident, but for now run on every frame 
            # that we are about to process. (Optimally, check if already identified).
            
            if lp_model:
                for c in crops_meta:
                    try:
                        # 1. Load image again (or keep in memory)
                        # We have c["file"]
                        # Run LP detection on the VEHICLE crop
                        
                        # Note: The vehicle crop might range from small to large.
                        # Ideally we run on the high-res crop.
                        
                        veh_img = cv2.imread(c["file"])
                        if veh_img is None: continue
                        
                        # Ultralytics expects numpy/path
                        lp_results = lp_model(veh_img, verbose=False)[0]
                        
                        detected_plate_text = None
                        
                        for box in lp_results.boxes:
                            # 2. Crop the plate
                            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                            plate_crop = veh_img[y1:y2, x1:x2]
                            
                            if plate_crop.size == 0: continue

                            # 3. OCR
                            # enhance?
                            # gray = cv2.cvtColor(plate_crop, cv2.COLOR_BGR2GRAY)
                            
                            # easyocr: detail=0 returns list of strings
                            ocr_res = ocr_reader.readtext(plate_crop, detail=0, allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
                            
                            if ocr_res:
                                # take the longest string or join? usually just one plate
                                candidate = "".join(ocr_res).upper().strip()
                                if len(candidate) > 3: # min length filter
                                    detected_plate_text = candidate
                                    break # assume one plate per car crop
                        
                        if detected_plate_text:
                            c["license_plate"] = detected_plate_text
                            if verbose:
                                print(f"[subscriber] Detected Plate: {detected_plate_text}")
                            
                            # 4. Lookup Contact
                            # exact match? or partial? let's do exact for now.
                            match = contacts_df[contacts_df['LicensePlate'] == detected_plate_text]
                            if not match.empty:
                                owner = match.iloc[0]['OwnerName']
                                phone = match.iloc[0]['Phone']
                                email = match.iloc[0]['Email']
                                c["contact_info"] = {
                                    "owner": owner,
                                    "phone": phone,
                                    "email": email
                                }
                                # Trigger Alert (Simulated)
                                alert_msg = f"*** ALERT SENT *** Accident detected for {owner} ({detected_plate_text}). Calling {phone}..."
                                c["alert_status"] = "sent"
                                if verbose:
                                    print(alert_msg)
                    except Exception as e:
                        print(f"[subscriber] LPR error: {e}")

            # --- Alert Logic Start ---
            if camera_id not in camera_states:
                camera_states[camera_id] = CameraState()
            
            state = camera_states[camera_id]
            has_accident = len(crops_meta) > 0
            state.update(has_accident)

            if not state.should_alert():
                # Cleanup images if not confirmed
                for c in crops_meta:
                    try:
                        os.remove(c["file"])
                    except OSError:
                        pass
                continue
            
            # --- Throttling Logic ---
            # Ideally we don't want to spam 30 updates/sec. 
            # Let's limit writing/saving snapshots to once per 1.0 second per camera
            # unless it's the very first frame of a new crash.
            
            # Note: We need to handle this carefully to support "grouping".
            # If we group, we update the existing doc.
            
            last_write = state.last_write_ts if hasattr(state, 'last_write_ts') else 0
            now = time.time()
            if now - last_write < 1.0:
                # Too soon, skip saving this frame's data to DB 
                # (but maybe we should've skipped saving files to disk earlier? 
                #  Yes, strictly speaking optimizing disk IO would require moving this check up, 
                #  but for simplicity we do it here and clean up).
                for c in crops_meta:
                    try:
                        os.remove(c["file"])
                    except OSError:
                        pass
                continue
            
            # Update write timestamp
            state.last_write_ts = now
            
            # --- DB Grouping Logic ---
            # Rolling Window: Check time since 'last_updated' (or 'inserted_at' if new).
            # This keeps grouping as long as the accident continues.
            
            latest_alert = accidents_col.find_one(
                {"camera_id": camera_id},
                sort=[("inserted_at", -1)]
            )
            
            should_group = False
            delta = 999.0
            
            if latest_alert:
                # Use last_updated if available, else inserted_at
                ref_time = latest_alert.get("last_updated", latest_alert["inserted_at"])
                # Ensure ref_time is datetime (pymongo returns datetime)
                if not isinstance(ref_time, datetime):
                     # fallback or parse if string (unlikely with pymongo)
                     pass

                delta = (datetime.utcnow() - ref_time).total_seconds()
                
                # Use 10s rolling window
                if delta < 10.0:
                    should_group = True
            
            if verbose:
                print(f"[subscriber] Grouping Check: Camera={camera_id}, LastAlert={latest_alert['_id'] if latest_alert else 'None'}, Delta={delta:.1f}s, Group={should_group}")

            if should_group:
                # Update existing alert
                try:
                    res = accidents_col.update_one(
                        {"_id": latest_alert["_id"]},
                        {
                            "$push": {"crops": {"$each": crops_meta}},
                            "$set": {"last_updated": datetime.utcnow()} # Extend the window
                        }
                    )
                    if verbose:
                        print(f"[subscriber] GROUPED frame {frame_idx} into alert {latest_alert['_id']} (crops+{len(crops_meta)})")
                except Exception as e:
                    print(f"[subscriber] MongoDB update failed: {e}")
            else:
                # Create NEW alert
                doc = build_mongo_doc(camera_id, frame_idx, ts_utc, event, crops_meta)
                # Initialize last_updated same as inserted_at
                doc["last_updated"] = doc["inserted_at"]
                
                try:
                    res = accidents_col.insert_one(doc)
                    if verbose:
                        print(f"[subscriber] INSERTED NEW alert {res.inserted_id} cam={camera_id} crops={len(crops_meta)}")
                    
                    # System Notification
                    try:
                        from plyer import notification
                        notification.notify(
                            title=f"Accident Detected!",
                            message=f"Camera: {camera_id}\nCheck dashboard immediately.",
                            app_name="Accident Detection System",
                            timeout=10
                        )
                    except Exception as ne:
                        print(f"[subscriber] Notification failed: {ne}")

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
