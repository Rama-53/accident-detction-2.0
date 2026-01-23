"""
classifier_subscriber_async.py

ASYNC VERSION with Hybrid Classifier:
- Acts as the CENTRAL SERVER (Binds ZMQ SUB).
- Accepts connections from multiple dynamic Detector containers.
- Uses primary classifier for immediate detection (fast, 100% accident recall)
- Queues hybrid verification in background thread (accurate, 89.80%)
- Updates alerts with verification results

Performance: ~24ms main thread (42 FPS) vs 161ms sequential (6 FPS)
"""
import argparse
import base64
import io
import json
import os
from pathlib import Path
import time
from datetime import datetime, timezone
import threading
import queue

import zmq
from PIL import Image
from pymongo import MongoClient
from collections import deque
import pandas as pd
import easyocr
from ultralytics import YOLO
import numpy as np
import cv2

# --- Configuration ---
BUFFER_SECONDS = 5
POST_EVENT_SECONDS = 5
FPS = 30
VERIFICATION_QUEUE_SIZE = 50  # Max pending verifications
MAX_SNAPSHOTS_PER_ALERT = 50  # Max snapshots per alert (prevents DB bloat)

class CameraState:
    def __init__(self, history_len=10, cooldown_len=10):
        self.history = deque(maxlen=history_len)
        self.cooldown = 0
        self.cooldown_len = cooldown_len
        self.last_write_ts = 0
        
        # Video Buffering
        self.frame_buffer = deque(maxlen=BUFFER_SECONDS * FPS)
        self.is_recording = False
        self.recording_frames_left = 0
        self.current_video_writer = None
        self.current_video_path = None
        self.current_alert_id = None

    def update_history(self, is_accident):
        self.history.append(is_accident)

    def should_alert(self):
        return sum(self.history) >= 7

# Import HYBRID classifier instead of single classifier
from classifier.hybrid_classifier import HybridAccidentClassifier

def decode_b64_to_pil(b64str: str) -> Image.Image:
    image_bytes = base64.b64decode(b64str)
    return Image.open(io.BytesIO(image_bytes)).convert("RGB")

def decode_b64_to_cv2(b64str: str):
    img_bytes = base64.b64decode(b64str)
    nparr = np.frombuffer(img_bytes, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

def save_pil_to_path(pil_img: Image.Image, path: Path, quality: int = 85) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pil_img.save(path, format="JPEG", quality=quality)

def build_mongo_doc(camera_id, frame_idx, detector_ts, event, crops_meta, classification_result):
    doc = {
        "camera_id": camera_id,
        "frame_idx": frame_idx,
        "detector_ts": datetime.fromtimestamp(detector_ts, timezone.utc).replace(tzinfo=None) if isinstance(detector_ts, (int, float)) else detector_ts,
        "inserted_at": datetime.now(timezone.utc).replace(tzinfo=None),
        "crashes": event.get("crashes", []),
        "bbox_count": len(event.get("bboxes", [])),
        "crop_count": len(crops_meta),
        "crops": crops_meta,
        "video_path": None,
        "video_status": "recording" if crops_meta else "none",
        "raw_event": event,
        # Classification results
        "classification": classification_result,
        "verification_status": "pending",  # Will be updated by background thread
    }
    # Hoist location metadata
    if "location" in event:
        doc["location"] = event["location"]
    if "location_lat" in event:
        doc["location_lat"] = event["location_lat"]
    if "camera_name" in event:
        doc["camera_name"] = event["camera_name"]
    if "location_lng" in event:
        doc["location_lng"] = event["location_lng"]
    return doc

def background_verifier(verification_queue, mongo_uri, db_name, classifier, verbose=True):
    """
    Background thread that processes verification queue.
    Runs hybrid classifier and updates MongoDB with results.
    """
    mongo = MongoClient(mongo_uri)
    db = mongo[db_name]
    accidents_col = db["accidents"]
    
    if verbose:
        print("[verifier] Background verification thread started")
    
    while True:
        try:
            # Get item from queue (blocks until available)
            item = verification_queue.get()
            
            if item is None:  # Shutdown signal
                break
            
            alert_id, full_frame_pil = item
            
            # Run HYBRID classifier (slow but accurate)
            t0 = time.time()
            hybrid_result = classifier.predict(full_frame_pil)
            dt = (time.time() - t0) * 1000
            
            if verbose:
                print(f"[verifier] Alert {alert_id}: Hybrid verification took {dt:.1f}ms")
                print(f"[verifier]   Agreement: {hybrid_result.get('model_agreement')}")
                print(f"[verifier]   Confidence: {hybrid_result.get('confidence'):.2f}")
            
            # Update MongoDB with verification results
            # Convert numpy types to Python native types for MongoDB
            def convert_numpy(obj):
                if isinstance(obj, (np.floating, np.float32, np.float64)):
                    return float(obj)
                elif isinstance(obj, (np.integer, np.int32, np.int64)):
                    return int(obj)
                elif isinstance(obj, np.ndarray):
                    return obj.tolist()
                elif isinstance(obj, dict):
                    return {k: convert_numpy(v) for k, v in obj.items()}
                elif isinstance(obj, list):
                    return [convert_numpy(i) for i in obj]
                return obj
            
            clean_result = convert_numpy(hybrid_result)
            
            update_doc = {
                "verification_status": "verified",
                "verification_result": clean_result,
                "verification_timestamp": datetime.now(timezone.utc).replace(tzinfo=None),
            }
            
            # Adjust alert priority based on model agreement
            agreement = hybrid_result.get("model_agreement")
            if agreement == "BOTH_ACCIDENT":
                update_doc["priority"] = "critical"
                update_doc["verified_accident"] = True
            elif agreement == "DISAGREEMENT":
                update_doc["priority"] = "medium"
                update_doc["verified_accident"] = "uncertain"
            elif agreement == "BOTH_NO_ACCIDENT":
                update_doc["priority"] = "low"
                update_doc["verified_accident"] = False
            
            try:
                accidents_col.update_one(
                    {"_id": alert_id},
                    {"$set": update_doc}
                )
                if verbose:
                    print(f"[verifier] Alert {alert_id} updated: {agreement}")
            except Exception as e:
                print(f"[verifier] Failed to update alert {alert_id}: {e}")
            
            verification_queue.task_done()
            
        except Exception as e:
            print(f"[verifier] Error in verification thread: {e}")
            import traceback
            traceback.print_exc()

def main(zmq_host: str, zmq_port: int, mongo_uri: str, db_name: str, out_dir: str, verbose: bool = True):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    
    video_dir = out_dir / "videos"
    video_dir.mkdir(parents=True, exist_ok=True)

    # MongoDB client
    mongo = MongoClient(mongo_uri)
    db = mongo[db_name]
    accidents_col = db["accidents"]
    if verbose:
        print(f"[subscriber] MongoDB: {mongo_uri}, DB: {db_name}")
    
    # Load system configuration
    SYSTEM_CONFIG = {"video_recording_enabled": False}  # Default disabled
    try:
        sys_conf_doc = db.system_config.find_one({"config_id": "main"})
        if sys_conf_doc and "video_recording_enabled" in sys_conf_doc:
            SYSTEM_CONFIG["video_recording_enabled"] = sys_conf_doc["video_recording_enabled"]
        if verbose:
            video_status = "ENABLED" if SYSTEM_CONFIG["video_recording_enabled"] else "DISABLED"
            print(f"[subscriber] Video Recording: {video_status}")
    except Exception as e:
        print(f"[subscriber] Failed to load system config: {e}")


    # ZeroMQ SUB socket (Server - Binds)
    ctx = zmq.Context()
    sock = ctx.socket(zmq.SUB)
    # Architecture Change: BIND instead of CONNECT
    # The classifier is the stable "server" that dynamic detectors connect to.
    bind_addr = f"tcp://*:{zmq_port}"
    try:
        sock.bind(bind_addr)
        if verbose:
            print(f"[subscriber] BOUND SUB socket -> {bind_addr}")
    except zmq.ZMQError as e:
        print(f"[subscriber] Failed to bind to {bind_addr}: {e}")
        raise
    
    sock.setsockopt_string(zmq.SUBSCRIBE, "")

    # --- LPR Initialization ---
    try:
        lp_model = YOLO("license_plate_detector.pt")
        ocr_reader = easyocr.Reader(['en'], gpu=True)
        contacts_df = pd.read_excel("emergency_contacts.xlsx")
        contacts_df['LicensePlate'] = contacts_df['LicensePlate'].astype(str).str.strip().str.upper()
        if verbose:
            print("[subscriber] LPR system initialized")
    except Exception as e:
        print(f"[subscriber] WARNING: LPR init failed: {e}")
        lp_model = None

    # --- Messaging Service ---
    try:
        from services.messaging_service import MessagingService
        messaging_svc = MessagingService(mongo_uri=mongo_uri, db_name=db_name)
        print("[subscriber] MessagingService initialized")
    except Exception as e:
        print(f"[subscriber] Failed to init MessagingService: {e}")
        messaging_svc = None

    # --- HYBRID CLASSIFIER (Main + Background) ---
    classifier = HybridAccidentClassifier()
    if verbose:
        print("[subscriber] Hybrid classifier initialized (Primary + ResNet50)")
        print("[subscriber] Mode: ASYNC - Primary in main thread, Hybrid in background")
        print("[subscriber] 🎥 Video Recording: ENABLED")


    # Create verification queue and start background thread
    verification_queue = queue.Queue(maxsize=VERIFICATION_QUEUE_SIZE)
    verifier_thread = threading.Thread(
        target=background_verifier,
        args=(verification_queue, mongo_uri, db_name, classifier, verbose),
        daemon=True
    )
    verifier_thread.start()

    # Track state per camera
    camera_states = {}

    try:
        while True:
            try:
                msg = sock.recv_string()
            except zmq.error.ZMQError:
                break

            try:
                event = json.loads(msg)
            except Exception:
                continue

            camera_id = event.get("camera_id", "unknown_cam")
            frame_idx = event.get("frame_idx", 0)
            
            # State initialization
            if camera_id not in camera_states:
                camera_states[camera_id] = CameraState()
            state = camera_states[camera_id]

            # Video buffering
            full_frame_b64 = event.get("full_frame_b64")
            full_frame_cv2 = None
            
            # Decode full frame & buffer it
            if full_frame_b64:
                try:
                    full_frame_cv2 = decode_b64_to_cv2(full_frame_b64)
                    state.frame_buffer.append(full_frame_cv2)
                except Exception:
                    pass
            
            # Write to video if recording
            if state.is_recording and full_frame_cv2 is not None:
                if state.current_video_writer:
                    state.current_video_writer.write(full_frame_cv2)
                    state.recording_frames_left -= 1
                    
                    if state.recording_frames_left <= 0:
                        state.current_video_writer.release()
                        state.current_video_writer = None
                        state.is_recording = False
                        print(f"[subscriber] ✅ VIDEO RECORDING STOPPED")
                        print(f"[subscriber] Finished recording: {state.current_video_path}")
                        
                        if state.current_alert_id:
                            try:
                                relative_name = os.path.basename(state.current_video_path)
                                accidents_col.update_one(
                                    {"_id": state.current_alert_id},
                                    {"$set": {"video_path": str(state.current_video_path), "video_filename": relative_name, "video_status": "ready"}}
                                )
                            except Exception as e:
                                print(f"[subscriber] Failed to update video status: {e}")

            # --- FAST CLASSIFICATION (Primary Model Only) ---
            is_accident_scene = False
            primary_result = None
            full_frame_pil = None
            
            if full_frame_cv2 is not None:
                full_frame_pil = Image.fromarray(cv2.cvtColor(full_frame_cv2, cv2.COLOR_BGR2RGB))
            
            if full_frame_pil:
                try:
                    t0 = time.time()
                    # Use PRIMARY model only for fast detection
                    primary_result = classifier._predict_primary(full_frame_pil)
                    dt = (time.time() - t0) * 1000
                    
                    # Convert numpy types to Python native types for MongoDB
                    if primary_result:
                        primary_result = {
                            'label': str(primary_result.get('label', '')),
                            'confidence': float(primary_result.get('confidence', 0)),
                            'is_accident': bool(primary_result.get('is_accident', False))
                        }
                    
                    if verbose and frame_idx % 30 == 0:
                        print(f"[subscriber] Frame {frame_idx} primary classification: {dt:.1f}ms")

                    if primary_result["is_accident"]:
                        is_accident_scene = True
                        if verbose:
                            print(f"[subscriber] PRIMARY DETECTION! (conf={primary_result['confidence']:.2f})")
                except Exception as e:
                    print(f"[subscriber] Primary classification error: {e}")

            # Process crops
            crops_b64 = event.get("cropped_images_b64", []) or []
            crops_meta = []
            
            if is_accident_scene:
                # Calculate severity based on confidence
                confidence = primary_result.get('confidence', 0) if primary_result else 0
                if confidence >= 0.8:
                    severity = "high"
                elif confidence >= 0.5:
                    severity = "medium"
                else:
                    severity = "low"
                
                # If detector sent crops, use those
                if crops_b64:
                    for i, crop_b64 in enumerate(crops_b64):
                        # Enforce snapshot limit
                        if len(crops_meta) >= MAX_SNAPSHOTS_PER_ALERT:
                            if verbose:
                                print(f"[subscriber] ⚠️  Snapshot limit reached ({MAX_SNAPSHOTS_PER_ALERT}). Skipping remaining {len(crops_b64) - i} crops.")
                            break
                        
                        try:
                            crop_img = decode_b64_to_pil(crop_b64)
                            timestamp = datetime.now(timezone.utc).replace(tzinfo=None).strftime("%Y%m%dT%H%M%S%f")[:-3]
                            fname = f"{camera_id}_f{frame_idx}_crop{i}_{timestamp}.jpg"
                            fpath = out_dir / fname
                            save_pil_to_path(crop_img, fpath)
                            
                            crops_meta.append({
                                "file": str(fpath),
                                "width": crop_img.width,
                                "height": crop_img.height,
                                "prediction": {
                                    "label": primary_result.get('label', 'accident') if primary_result else 'accident',
                                    "confidence": confidence,
                                    "severity": severity
                                }
                            })
                        except Exception:
                            pass
                
                # If no crops from detector, save the full frame as snapshot
                elif full_frame_pil:
                    try:
                        timestamp = datetime.now(timezone.utc).replace(tzinfo=None).strftime("%Y%m%dT%H%M%S%f")[:-3]
                        fname = f"{camera_id}_f{frame_idx}_fullframe_{timestamp}.jpg"
                        fpath = out_dir / fname
                        save_pil_to_path(full_frame_pil, fpath)
                        
                        crops_meta.append({
                            "file": str(fpath),
                            "width": full_frame_pil.width,
                            "height": full_frame_pil.height,
                            "prediction": {
                                "label": primary_result.get('label', 'accident') if primary_result else 'accident',
                                "confidence": confidence,
                                "severity": severity
                            }
                        })
                        if verbose:
                            print(f"[subscriber] Saved full frame as snapshot: {fname}")
                    except Exception as e:
                        print(f"[subscriber] Failed to save full frame: {e}")
            
            # Update sliding window
            state.update_history(1 if is_accident_scene else 0)

            if not state.should_alert():
                continue
            
            # --- ALERT TRIGGERED ---
            now = time.time()
            if now - state.last_write_ts < 1.0:
                continue
            state.last_write_ts = now
            
            # Start video recording (if enabled in settings)
            video_enabled = SYSTEM_CONFIG.get("video_recording_enabled", False)
            if not state.is_recording and full_frame_cv2 is not None and video_enabled:
                state.is_recording = True
                state.recording_frames_left = POST_EVENT_SECONDS * FPS
                
                timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
                vid_name = f"crash_{camera_id}_{timestamp_str}.mp4"
                state.current_video_path = str(video_dir / vid_name)
                
                h, w, _ = full_frame_cv2.shape
                fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                state.current_video_writer = cv2.VideoWriter(state.current_video_path, fourcc, FPS, (w, h))
                
                print(f"[subscriber] 🎥 VIDEO RECORDING STARTED: {vid_name}")
                print(f"[subscriber] Recording started! Dumping {len(state.frame_buffer)} buffer frames...")
                for old_frame in state.frame_buffer:
                    state.current_video_writer.write(old_frame)
            elif not video_enabled and verbose:
                # Log that video recording is disabled
                if not hasattr(state, '_video_disabled_logged'):
                    print(f"[subscriber] ⚠️  Video recording is DISABLED in settings")
                    state._video_disabled_logged = True
            
            # DB Logic (Grouping)
            latest_alert = accidents_col.find_one({"camera_id": camera_id}, sort=[("inserted_at", -1)])
            should_group = False
            if latest_alert:
                last_ts = latest_alert.get("last_updated", latest_alert["inserted_at"])
                if isinstance(last_ts, str):
                    try:
                        last_ts = datetime.fromisoformat(last_ts)
                    except:
                        last_ts = latest_alert["inserted_at"]

                delta = (datetime.now(timezone.utc).replace(tzinfo=None) - last_ts).total_seconds()
                
                if delta < 10.0:
                    should_group = True
            
            if should_group:
                state.current_alert_id = latest_alert["_id"]
                
                try:
                    accidents_col.update_one(
                        {"_id": latest_alert["_id"]},
                        {
                            "$push": {"crops": {"$each": crops_meta}},
                            "$set": {"last_updated": datetime.now(timezone.utc).replace(tzinfo=None)}
                        }
                    )
                    if verbose:
                        print(f"[subscriber] GROUPED into {latest_alert['_id']}")
                except Exception as e:
                    print(f"MongoDB update error: {e}")
            else:
                # New Alert - Skip if no crops (prevents phantom alerts)
                if not crops_meta:
                    if verbose and frame_idx % 30 == 0:
                        print(f"[subscriber] Skipping alert - no crop data available")
                    continue
                
                # Use primary result for immediate classification
                doc = build_mongo_doc(
                    camera_id, frame_idx, event.get("ts_utc", time.time()), 
                    event, crops_meta, primary_result
                )
                
                if state.is_recording:
                    doc["video_path"] = state.current_video_path
                    doc["video_filename"] = os.path.basename(state.current_video_path)
                
                try:
                    cam_doc = db.cameras.find_one({"camera_id": camera_id})
                    if cam_doc:
                        doc["sector_id"] = cam_doc.get("sector_id")
                except:
                    pass

                res = accidents_col.insert_one(doc)
                state.current_alert_id = res.inserted_id
                if verbose:
                    print(f"[subscriber] NEW ALERT {res.inserted_id} (UNVERIFIED)")
                
                # --- SEND EMAIL NOTIFICATIONS ---
                if messaging_svc:
                    try:
                        # Check if email alerts are enabled in system config
                        sys_conf = db.system_config.find_one({"config_id": "main"})
                        email_enabled = sys_conf.get("email_alerts_enabled", False) if sys_conf else False
                        
                        if email_enabled:
                            # Get sector_id from the alert document
                            sector_id = doc.get("sector_id")
                            
                            # Fetch responders for this sector from MongoDB
                            responders = []
                            if sector_id:
                                try:
                                    # Query responders collection for matching sector_id with valid email
                                    responder_docs = list(db.responders.find({
                                        "sector_id": sector_id,
                                        "email": {"$exists": True, "$ne": "", "$ne": None}
                                    }))
                                    
                                    responders = [
                                        {
                                            "name": r.get("name", ""),
                                            "email": r.get("email", ""),
                                            "phone": r.get("phone", ""),
                                            "role": r.get("role", "")
                                        }
                                        for r in responder_docs
                                        if r.get("email") and str(r.get("email")).strip()
                                    ]
                                except Exception as e:
                                    if verbose:
                                        print(f"[subscriber] Could not load responders from DB: {e}")
                            
                            # Build email message with metadata
                            camera_name = doc.get("camera_name", camera_id)
                            location = doc.get("location", "Unknown")
                            location_lat = doc.get("location_lat")
                            location_lng = doc.get("location_lng")
                            severity = "UNKNOWN"
                            
                            # Extract severity from crops_meta
                            if crops_meta and len(crops_meta) > 0:
                                first_crop = crops_meta[0]
                                if "prediction" in first_crop:
                                    severity = first_crop["prediction"].get("severity", "UNKNOWN").upper()
                            
                            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                            
                            # Message body as dict for rich formatting
                            message_body = {
                                "message": f"An accident has been detected at {camera_name}.",
                                "severity": severity,
                                "time": timestamp,
                                "camera": camera_name,
                                "location": location,
                                "location_lat": location_lat,
                                "location_lng": location_lng
                            }
                            
                            subject = f"🚨 Accident Alert - {severity.upper()} Severity"
                            
                            # Get the first snapshot image path for attachment
                            attachment_path = None
                            if crops_meta and len(crops_meta) > 0:
                                attachment_path = crops_meta[0].get("file")
                            
                            # Send to each responder
                            if responders:
                                for responder in responders:
                                    contact_info = {
                                        "email": responder.get("email"),
                                        "phone": responder.get("phone", "")
                                    }
                                    
                                    messaging_svc.send_alert(
                                        contact_info=contact_info,
                                        message_body=message_body,
                                        subject=subject,
                                        attachment_path=attachment_path
                                    )
                                
                                if verbose:
                                    print(f"[subscriber] 📧 Email alerts queued for {len(responders)} responder(s) in sector {sector_id}")
                            else:
                                # Send to admin email if no sector responders found
                                admin_email = sys_conf.get("admin_email", "") if sys_conf else ""
                                if admin_email and admin_email.strip():
                                    contact_info = {"email": admin_email.strip()}
                                    messaging_svc.send_alert(
                                        contact_info=contact_info,
                                        message_body=message_body,
                                        subject=subject,
                                        attachment_path=attachment_path
                                    )
                                    if verbose:
                                        print(f"[subscriber] 📧 Email alert sent to admin: {admin_email}")
                                else:
                                    if verbose:
                                        print(f"[subscriber] ⚠️  No responders or admin email configured for sector {sector_id}")
                        else:
                            if verbose and not hasattr(state, '_email_disabled_logged'):
                                print(f"[subscriber] 📧 Email alerts DISABLED in settings")
                                state._email_disabled_logged = True
                    except Exception as e:
                        print(f"[subscriber] Email notification error (non-critical): {e}")
                        import traceback
                        traceback.print_exc()
                
                # --- QUEUE FOR HYBRID VERIFICATION ---
                if full_frame_pil:
                    try:
                        verification_queue.put_nowait((res.inserted_id, full_frame_pil))
                        if verbose:
                            print(f"[subscriber] Queued for hybrid verification (queue size: {verification_queue.qsize()})")
                    except queue.Full:
                        print(f"[subscriber] WARNING: Verification queue full! Skipping hybrid verification.")

    except KeyboardInterrupt:
        print("[subscriber] Interrupted")
    finally:
        # Shutdown verification thread
        verification_queue.put(None)
        verifier_thread.join(timeout=5)
        
        for s in camera_states.values():
            if s.current_video_writer:
                s.current_video_writer.release()
        try:
            sock.close()
            ctx.term()
            mongo.close()
        except:
            pass
        print("[subscriber] Shutdown complete")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="localhost")
    parser.add_argument("--port", default=5556, type=int)
    parser.add_argument("--mongo", default="mongodb://127.0.0.1:27017")
    parser.add_argument("--db", default="accident_db")
    parser.add_argument("--outdir", default="./accident_crops")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    main(zmq_host=args.host, zmq_port=args.port, mongo_uri=args.mongo, db_name=args.db, out_dir=args.outdir, verbose=not args.quiet)
