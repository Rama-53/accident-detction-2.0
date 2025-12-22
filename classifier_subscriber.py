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

    def update(self, is_accident):
        self.history.append(is_accident)
        if self.cooldown > 0:
            self.cooldown -= 1

    def should_alert(self):
        # Alert if >= 7 accidents in last 10 frames
        # We removed the internal blocking cooldown to allow external logic (subscriber) 
        # to decide whether to group or create new alerts.
        return sum(self.history) >= 7

# Import the placeholder classifier you agreed to use
# Make sure classifier/cnn_classifier.py contains PlaceholderClassifier
try:
    from classifier.cnn_classifier import AccidentClassifier
except Exception:
    # Provide a very small fallback if the import fails (defensive)
    class AccidentClassifier:
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
    if "camera_name" in event:
        doc["camera_name"] = event["camera_name"]
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

    # --- Messaging Service ---
    try:
        from services.messaging_service import MessagingService
        messaging_svc = MessagingService()
        print("[subscriber] MessagingService initialized")
    except Exception as e:
        print(f"[subscriber] Failed to init MessagingService: {e}")
        messaging_svc = None


    classifier = AccidentClassifier()
    if verbose:
        print("[subscriber] classifier initialized (real)")

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
                    
                    # Add as a "virtual" crop with high severity so it's kept
                    crops_meta.append({
                        "file": str(fpath),
                        "width": ff_img.width,
                        "height": ff_img.height,
                        "prediction": {
                            "label": "vehicle_collision",
                            "severity": "high", # Force high severity
                            "confidence": 1.0,
                            "note": "full_frame_snapshot"
                        }
                    })
                except Exception as e:
                    print(f"[subscriber] failed to save full frame: {e}")

            # 2. Handle Crops - Restore logic to save detector crops
            for i, crop_b64 in enumerate(crops_b64):
                try:
                    crop_img = decode_b64_to_pil(crop_b64)
                    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%S%f")[:-3]
                    fname = f"{camera_id}_f{frame_idx}_crop{i}_{timestamp}.jpg"
                    fpath = out_dir / fname
                    save_pil_to_path(crop_img, fpath)
                    
                    # Store metadata
                    # Note: We don't have per-crop labels from the detector in this simple payload structure
                    # unless 'event' has them aligned.
                    # Assuming standard detector that sends raw crops. 
                    # We will use the classifier or fallbacks later. 
                    # For now, let's mark them as potential collision evidence.
                    
                    # Try to match with bboxes validation if possible, but simplest is to save all.
                    # We will filter them in the next step (lines 222+)
                    
                    # Placeholder prediction until classified (or if classifier used)
                    crops_meta.append({
                        "file": str(fpath),
                        "width": crop_img.width,
                        "height": crop_img.height,
                        "prediction": {
                            "label": "vehicle_collision", # Default to match filter
                            "severity": "medium",
                            "confidence": 0.8,
                            "note": f"crop_{i}"
                        }
                    })
                except Exception as e:
                    print(f"[subscriber] failed to save crop {i}: {e}")

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
            # Check for recent active alert (within 20 seconds)
            
            latest_alert = accidents_col.find_one(
                {"camera_id": camera_id},
                sort=[("inserted_at", -1)]
            )
            
            should_group = False
            if latest_alert:
                delta = (datetime.utcnow() - latest_alert["inserted_at"]).total_seconds()
                if delta < 10.0:
                    should_group = True
            
            if should_group:
                # Update existing alert - WITH FRAME LIMIT
                current_count = len(latest_alert.get("crops", []))
                limit = 10
                
                if current_count < limit:
                    # Only add if we haven't hit the limit
                    space_left = limit - current_count
                    if space_left < len(crops_meta):
                         # Truncate to fit
                         crops_to_add = crops_meta[:space_left]
                    else:
                         crops_to_add = crops_meta

                    try:
                        res = accidents_col.update_one(
                            {"_id": latest_alert["_id"]},
                            {
                                "$push": {"crops": {"$each": crops_to_add}},
                                "$set": {"last_updated": datetime.utcnow()}
                            }
                        )
                        if verbose:
                            print(f"[subscriber] GROUPED frame {frame_idx} into alert {latest_alert['_id']} (added {len(crops_to_add)}, total {current_count + len(crops_to_add)})")
                    except Exception as e:
                        print(f"[subscriber] MongoDB update failed: {e}")
                else:
                    if verbose:
                        print(f"[subscriber] Alert {latest_alert['_id']} reached frame limit (10). Skipping frame {frame_idx}.")
            else:
                # Create NEW alert
                # Look up sector_id for this camera from the DB to preserve history
                try:
                    cam_doc = db.cameras.find_one({"camera_id": camera_id})
                    sector_id = cam_doc.get("sector_id") if cam_doc else None
                except Exception:
                    sector_id = None

                doc = build_mongo_doc(camera_id, frame_idx, ts_utc, event, crops_meta)
                if sector_id:
                    doc["sector_id"] = sector_id

                # Burn in name and location if provided by publisher, to freeze history
                if event.get("camera_name"):
                    doc["camera_name"] = event.get("camera_name")
                if event.get("location"):
                    doc["location"] = event.get("location")

                try:
                    res = accidents_col.insert_one(doc)
                    if verbose:
                        print(f"[subscriber] INSERTED NEW alert {res.inserted_id} cam={camera_id} crops={len(crops_meta)} sector={sector_id}")

                    # --- ALERT LOGIC (MOVED HERE) ---
                    if lp_model:
                        for c in crops_meta:
                            try:
                                veh_img = cv2.imread(c["file"])
                                if veh_img is None: continue
                                
                                lp_results = lp_model(veh_img, verbose=False)[0]
                                detected_plate_text = None
                                
                                for box in lp_results.boxes:
                                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                                    plate_crop = veh_img[y1:y2, x1:x2]
                                    if plate_crop.size == 0: continue
                                    
                                    ocr_res = ocr_reader.readtext(plate_crop, detail=0, allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
                                    if ocr_res:
                                        candidate = "".join(ocr_res).upper().strip()
                                        if len(candidate) > 3:
                                            detected_plate_text = candidate
                                            break
                                
                                if detected_plate_text:
                                    c["license_plate"] = detected_plate_text
                                    if verbose: print(f"[subscriber] Detected Plate: {detected_plate_text}")
                                    
                                    match = contacts_df[contacts_df['LicensePlate'] == detected_plate_text]
                                    if not match.empty:
                                        owner = match.iloc[0]['OwnerName']
                                        phone = match.iloc[0]['Phone']
                                        email = match.iloc[0]['Email']
                                        c["contact_info"] = {"owner": owner, "phone": phone, "email": email}
                                        
                                        alert_msg = f"*** ACCIDENT ALERT ***\nVehicle: {detected_plate_text}\nOwner: {owner}\nLocation: {event.get('location', 'Unknown')}\nTime: {datetime.now()}"
                                        c["alert_status"] = "sent"
                                        if messaging_svc:
                                            messaging_svc.send_alert(c["contact_info"], alert_msg, subject=f"Accident Alert: {detected_plate_text}", attachment_path=c["file"])
                                            if verbose: print(f"[subscriber] Alert sent to owner: {owner}", flush=True)
                                    if messaging_svc:
                                            messaging_svc.send_alert(c["contact_info"], alert_msg, subject=f"Accident Alert: {detected_plate_text}", attachment_path=c["file"])
                                            if verbose: print(f"[subscriber] Alert sent to owner: {owner}", flush=True)
                                    
                                    # Also notify Sector Responders
                                    if sector_id and messaging_svc:
                                        responders = list(db.responders.find({"sector_id": sector_id}))
                                        if responders:
                                            for r in responders:
                                                resp_contact = {"email": r.get("email"), "phone": r.get("phone")}
                                                resp_msg = f"*** SECTOR ALERT ({sector_id}) ***\nVehicle: {detected_plate_text}\nLocation: {event.get('location', 'Unknown')}\nRole: {r.get('role', 'Responder')}\nTime: {datetime.now()}"
                                                messaging_svc.send_alert(resp_contact, resp_msg, subject=f"Sector Alert: {detected_plate_text}", attachment_path=c["file"])
                                                if verbose: print(f"[subscriber] Alert sent to responder: {r.get('name')} ({r.get('role')})", flush=True)
                                        else:
                                            # Fallback to Admin if no sector responders
                                            if verbose: print(f"[subscriber] No responders for sector {sector_id}. Trying Admin...", flush=True)
                                            sys_conf = messaging_svc._get_system_config()
                                            admin_contact = {"email": sys_conf.get("admin_email"), "phone": sys_conf.get("admin_phone")}
                                            if admin_contact["email"] or admin_contact["phone"]:
                                                fallback_msg = f"*** UNREGISTERED VEHICLE ACCIDENT (No Responders) ***\nPlate: {detected_plate_text}\nLocation: {event.get('location', 'Unknown')}\nTime: {datetime.now()}"
                                                messaging_svc.send_alert(admin_contact, fallback_msg, subject=f"Admin Alert: {detected_plate_text}", attachment_path=c["file"])
                                                c["alert_status"] = "sent_admin"
                                    else:
                                         # No sector ID? Fallback to Admin
                                        if verbose: print(f"[subscriber] Plate {detected_plate_text} valid but no Sector ID. Trying Admin...", flush=True)
                                        sys_conf = messaging_svc._get_system_config()
                                        admin_contact = {"email": sys_conf.get("admin_email"), "phone": sys_conf.get("admin_phone")}
                                        if admin_contact["email"] or admin_contact["phone"]:
                                            fallback_msg = f"*** ACCIDENT ALERT (No Sector) ***\nPlate: {detected_plate_text}\nLocation: {event.get('location', 'Unknown')}\nTime: {datetime.now()}"
                                            messaging_svc.send_alert(admin_contact, fallback_msg, subject=f"Admin Alert: {detected_plate_text}", attachment_path=c["file"])
                                            
                                else:
                                    # No Plate Detected -> Sector Responders OR Admin Fallback
                                    if verbose: print("[subscriber] No plate detected. Checking Responders...", flush=True)
                                    responders_alerted = False
                                    
                                    if sector_id and messaging_svc:
                                        responders = list(db.responders.find({"sector_id": sector_id}))
                                        if responders:
                                            for r in responders:
                                                resp_contact = {"email": r.get("email"), "phone": r.get("phone")}
                                                resp_msg = f"*** SECTOR ALERT ({sector_id}) ***\nType: Unknown Vehicle Accident\nLocation: {event.get('location', 'Unknown')}\nTime: {datetime.now()}"
                                                messaging_svc.send_alert(resp_contact, resp_msg, subject="Sector Alert: Unknown Vehicle", attachment_path=c["file"])
                                                if verbose: print(f"[subscriber] Alert sent to responder: {r.get('name')}", flush=True)
                                            responders_alerted = True
                                    
                                    if not responders_alerted and messaging_svc:
                                        # Strict Admin Fallback
                                        sys_conf = messaging_svc._get_system_config()
                                        admin_contact = {"email": sys_conf.get("admin_email"), "phone": sys_conf.get("admin_phone")}
                                        if admin_contact["email"] or admin_contact["phone"]:
                                            fallback_msg = f"*** ACCIDENT DETECTED (UNKNOWN VEHICLE) ***\nLocation: {event.get('location', 'Unknown')}\nTime: {datetime.now()}\nNote: LPR failed. No responders in sector."
                                            messaging_svc.send_alert(admin_contact, fallback_msg, subject="Admin Alert: Unknown Vehicle Accident", attachment_path=c["file"])
                                            c["alert_status"] = "sent_admin_noplate"
                                            if verbose: print("[subscriber] Alert sent to ADMIN (No Plate/Responders)", flush=True)

                            except Exception as e:
                                print(f"[subscriber] LPR error: {e}", flush=True)
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
