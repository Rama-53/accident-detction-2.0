"""
services/api_server.py

FastAPI backend for the dashboard. It exposes:

- /health   -> simple health check
- /status   -> dashboard-friendly status
- /accidents -> raw MongoDB accident docs
- /events   -> simplified list of recent accidents for the dashboard
- /snapshots -> list of snapshot IDs
- /snapshot/{id} -> serves a JPEG crop for a given snapshot/accident ID

The classifier_subscriber.py script writes documents into MongoDB. Each document
contains a "crops" list with entries like:
  {
      "file": "/absolute/path/to/crop.jpg",
      "width": ...,
      "height": ...,
      "prediction": {
          "label": "...",
          "severity": "low|medium|high",
          "confidence": 0.5,
      }
  }

We translate those into lightweight event objects the React dashboard expects.
"""
from pathlib import Path
import shutil
from typing import Optional, List, Dict, Any, Generator

import cv2
from bson.objectid import ObjectId
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
from pymongo import MongoClient

app = FastAPI()

# Allow dashboard (Vite dev or static) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URI = "mongodb://127.0.0.1:27017"
DB_NAME = "accident_db"
client = MongoClient(MONGO_URI)
db = client[DB_NAME]

# Reset detection_enabled to False on startup
try:
    db.cameras.update_many({}, {"$set": {"detection_enabled": False}})
    print("[api] Reset all cameras to detection_enabled=False")
except Exception as e:
    print(f"[api] Warning: Failed to reset camera config: {e}")

# Default video source for the /video_feed endpoint.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
VIDEO_SOURCES: Dict[str, Dict[str, Any]] = {
    "demo_cam_main": {
        "label": "Demo clip (cctv_eg.mp4)",
        "type": "file",
        "description": "Sample CCTV clip bundled with the repo",
        "source": str(PROJECT_ROOT / "cctv_eg.mp4"),
        "requires_value": False,
        "camera_id": "demo_cam_main",
        "camera_name": "Demo Intersection",
        "location": "Main St & 1st Ave",
        "location_lat": 37.3353,
        "location_lng": -121.8893,
    },
    # ... (other sources)
    "detector_stream": {
        "label": "Detector Stream (with BBoxes)",
        "type": "ip",
        "description": "Live stream from the detector with bounding boxes",
        "source": "http://127.0.0.1:5001/stream.mjpg",
        "requires_value": False,
        "camera_id": "detector_stream",
        "camera_name": "Detector Live View",
        "location": "Processing Node",
    },
    "webcam_0": {
        "label": "Default webcam (index 0)",
        "type": "webcam",
        "description": "Built-in or primary USB webcam",
        "source": 0,
        "requires_value": False,
        "camera_id": "webcam_0",
        "camera_name": "Control Room Webcam",
        "location": "Operations HQ",
    },
    "webcam_1": {
        "label": "Second webcam (index 1)",
        "type": "webcam",
        "description": "Secondary USB webcam (edit index if needed)",
        "source": 1,
        "requires_value": False,
        "camera_id": "webcam_1",
        "camera_name": "Auxiliary Webcam",
        "location": "Spare Lab Cam",
    },

    "ip_cam_example": {
        "label": "IP camera (RTSP example)",
        "type": "ip",
        "description": "Update the RTSP URL to match your network camera",
        "source": "rtsp://username:password@192.168.1.10:554/stream",
        "requires_value": False,
        "camera_id": "ip_cam_example",
        "camera_name": "Parking Lot RTSP",
        "location": "Parking Lot Gate",
    },
    "droidcam_ip": {
        "label": "DroidCam (WiFi/IP)",
        "type": "ip",
        "description": "Use DroidCam via WiFi. Enter URL (e.g. http://192.168.1.5:4747/video)",
        "requires_value": True,
        "value_hint": "http://192.168.0.101:4747/video",
        "value_type": "text",
        "camera_id": "droidcam_ip",
        "camera_name": "DroidCam Mobile",
        "location": "Mobile Unit",
    },
    "custom_file": {
        "label": "Custom video file",
        "type": "file",
        "description": "Enter a full path to an MP4/MKV/etc. on this machine",
        "requires_value": True,
        "value_hint": r"C:\videos\intersection.mp4",
        "value_type": "text",
        "camera_id": "custom_file",
    },
    "custom_rtsp": {
        "label": "Custom IP / RTSP camera",
        "type": "ip",
        "description": "Paste an RTSP/HTTP URL (e.g. rtsp://user:pass@ip/stream)",
        "requires_value": True,
        "value_hint": "rtsp://192.168.1.50/live",
        "value_type": "text",
        "camera_id": "custom_rtsp",
    },
    "custom_webcam": {
        "label": "Custom webcam index",
        "type": "webcam",
        "description": "Enter the camera index (0,1,2...) or DirectShow name",
        "requires_value": True,
        "value_hint": "2",
        "value_type": "text",
        "camera_id": "custom_webcam",
    },
}
DEFAULT_VIDEO_SOURCE_ID = "demo_cam_main"

# Derived metadata for quick lookup
CAMERA_METADATA = {
    v["camera_id"]: {
        "name": v.get("camera_name", "Unknown Camera"),
        "location": v.get("location", ""),
        "lat": v.get("location_lat"),
        "lng": v.get("location_lng"),
    }
    for k, v in VIDEO_SOURCES.items()
    if "camera_id" in v
}

# Hydrate CAMERA_METADATA from MongoDB on startup
try:
    print("[api] Hydrating camera config from DB...")
    for cam_doc in db.cameras.find():
        cid = cam_doc.get("camera_id")
        if not cid:
            continue
            
        if cid not in CAMERA_METADATA:
            CAMERA_METADATA[cid] = {}

        # Merge fields
        if "name" in cam_doc:
            CAMERA_METADATA[cid]["name"] = cam_doc["name"]
        if "location" in cam_doc:
            CAMERA_METADATA[cid]["location"] = cam_doc["location"]
        if "lat" in cam_doc:
            CAMERA_METADATA[cid]["lat"] = cam_doc["lat"]
        if "lng" in cam_doc:
            CAMERA_METADATA[cid]["lng"] = cam_doc["lng"]
        if "detection_enabled" in cam_doc:
            CAMERA_METADATA[cid]["detection_enabled"] = cam_doc["detection_enabled"]
        if "sector_id" in cam_doc:
            CAMERA_METADATA[cid]["sector_id"] = cam_doc["sector_id"]
        if "video_source" in cam_doc:
            CAMERA_METADATA[cid]["video_source"] = cam_doc["video_source"]

    # SEED MISSING VIDEO SOURCES TO DB
    # This allows detector_publisher to find 'webcam_0' or 'custom_file' by looking up source in the DB.
    for key, cfg in VIDEO_SOURCES.items():
        cid = cfg.get("camera_id")
        
        # Determine the source to seed. 
        # For custom_file/custom_rtsp, the 'source' key might be missing in VIDEO_SOURCES config (it's dynamic),
        # so we don't force-seed a value if it's None, UNLESS we want to create the doc.
        # We SHOULD create the doc so detector_publisher can find it later (after frontend updates it).
        
        stored = db.cameras.find_one({"camera_id": cid})
        
        update_fields = {}
        if not stored:
            # New camera, seed all available metadata
            update_fields["camera_id"] = cid
            if cfg.get("camera_name"): update_fields["name"] = cfg.get("camera_name")
            if cfg.get("location"): update_fields["location"] = cfg.get("location")
            # For custom_file, we might not have a source yet, but create the doc anyway
            if cfg.get("source"): update_fields["video_source"] = str(cfg.get("source"))
            
            # Seed sector_id if missing (random placeholder or from config)
            if cfg.get("sector_id"): 
                update_fields["sector_id"] = cfg.get("sector_id")
            else:
                 # Default sector for new cams
                update_fields["sector_id"] = "SEC-GEN-01"

            db.cameras.insert_one(update_fields)
            print(f"[api] Seeded new camera doc for {cid}")

        else:
            # Existing doc, check if video_source is missing and we have a default
            if "video_source" not in stored and cfg.get("source"):
                db.cameras.update_one(
                    {"camera_id": cid},
                    {"$set": {"video_source": str(cfg["source"])}}
                )
                print(f"[api] Seeded video_source for {cid}")

    print(f"[api] Hydrated metadata for {len(CAMERA_METADATA)} cameras.")
except Exception as e:
    print(f"[api] Failed to hydrate camera config: {e}")

from pydantic import BaseModel

class CameraConfig(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    detection_enabled: Optional[bool] = None
    video_source: Optional[str] = None
    sector_id: Optional[str] = None

class SystemConfig(BaseModel):
    multi_detection_enabled: Optional[bool] = None
    video_recording_enabled: Optional[bool] = None
    email_alerts_enabled: Optional[bool] = None
    whatsapp_alerts_enabled: Optional[bool] = None
    admin_email: Optional[str] = None
    admin_email: Optional[str] = None
    admin_phone: Optional[str] = None
    alert_delay_minutes: Optional[int] = None

SYSTEM_CONFIG: Dict[str, Any] = {
    "multi_detection_enabled": False,
    "video_recording_enabled": False,  # Default OFF
    "email_alerts_enabled": True,    # Default ON
    "whatsapp_alerts_enabled": True, # Default ON
    "admin_email": "",
    "admin_phone": "",
    "alert_delay_minutes": 10 # Default 10 minutes
}

# ... (Camera metadata logic remains here) ...

# 3. Load System Config
try:
    sys_conf_doc = db.system_config.find_one({"config_id": "main"})
    if sys_conf_doc:
        for key in SYSTEM_CONFIG.keys():
            if key in sys_conf_doc:
                SYSTEM_CONFIG[key] = sys_conf_doc[key]
    print(f"[api] Loaded system config: {SYSTEM_CONFIG}")
except Exception as e:
    print(f"[api] Failed to load system config: {e}")

@app.get("/system/config")
def get_system_config():
    return SYSTEM_CONFIG

@app.post("/system/config")
def update_system_config(config: SystemConfig):
    if config.multi_detection_enabled is not None:
        SYSTEM_CONFIG["multi_detection_enabled"] = config.multi_detection_enabled
    
    if config.video_recording_enabled is not None:
        SYSTEM_CONFIG["video_recording_enabled"] = config.video_recording_enabled
    
    if config.email_alerts_enabled is not None:
        SYSTEM_CONFIG["email_alerts_enabled"] = config.email_alerts_enabled
    if config.whatsapp_alerts_enabled is not None:
        SYSTEM_CONFIG["whatsapp_alerts_enabled"] = config.whatsapp_alerts_enabled
    
    if config.admin_email is not None:
        SYSTEM_CONFIG["admin_email"] = config.admin_email
    if config.admin_phone is not None:
        SYSTEM_CONFIG["admin_phone"] = config.admin_phone

    if config.alert_delay_minutes is not None:
        SYSTEM_CONFIG["alert_delay_minutes"] = config.alert_delay_minutes
    
    # Persist
    db.system_config.update_one(
        {"config_id": "main"},
        {"$set": SYSTEM_CONFIG},
        upsert=True
    )
    return {"status": "updated", "config": SYSTEM_CONFIG}


@app.post("/cameras/{camera_id}")
def update_camera_config(camera_id: str, config: CameraConfig):
    """
    Update camera metadata (name, location) and persist to MongoDB.
    """
    # 1. Update in-memory
    if camera_id not in CAMERA_METADATA:
        CAMERA_METADATA[camera_id] = {}
    
    update_data = {}
    if config.name is not None:
        CAMERA_METADATA[camera_id]["name"] = config.name
        update_data["name"] = config.name
    if config.location is not None:
        CAMERA_METADATA[camera_id]["location"] = config.location
        update_data["location"] = config.location
    if config.lat is not None:
        CAMERA_METADATA[camera_id]["lat"] = config.lat
        update_data["lat"] = config.lat
    if config.lng is not None:
        CAMERA_METADATA[camera_id]["lng"] = config.lng
        update_data["lng"] = config.lng
    if config.detection_enabled is not None:
        CAMERA_METADATA[camera_id]["detection_enabled"] = config.detection_enabled
        update_data["detection_enabled"] = config.detection_enabled
    if config.video_source is not None:
        CAMERA_METADATA[camera_id]["video_source"] = config.video_source
        update_data["video_source"] = config.video_source
    if config.sector_id is not None:
        CAMERA_METADATA[camera_id]["sector_id"] = config.sector_id
        update_data["sector_id"] = config.sector_id

    # 2. Persist to MongoDB
    if update_data:
        db.cameras.update_one(
            {"camera_id": camera_id},
            {"$set": update_data},
            upsert=True
        )
    
    return {"status": "updated", "camera_id": camera_id, "current_config": CAMERA_METADATA[camera_id]}


class Responder(BaseModel):
    name: str
    role: str # police, ambulance, fire, admin
    sector_id: str
    email: str
    phone: Optional[str] = None

@app.get("/responders")
def get_responders():
    docs = list(db.responders.find())
    results = []
    for d in docs:
        d["_id"] = str(d["_id"])
        results.append(d)
    return results

@app.post("/responders")
def create_responder(responder: Responder):
    data = responder.dict()
    res = db.responders.insert_one(data)
    data["_id"] = str(res.inserted_id)
    return data

@app.delete("/responders/{responder_id}")
def delete_responder(responder_id: str):
    try:
        oid = ObjectId(responder_id)
        res = db.responders.delete_one({"_id": oid})
        return {"deleted_count": res.deleted_count}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/responders/export")
def export_responders():
    """
    Export all responders to an Excel file.
    """
    import pandas as pd
    import io

    try:
        docs = list(db.responders.find())
        # Drop _id for cleaner Excel
        for d in docs:
            d.pop("_id", None)
        
        df = pd.DataFrame(docs)
        if df.empty:
            # Create a template if empty
            df = pd.DataFrame(columns=["name", "role", "sector_id", "email", "phone"])

        # Reorder columns for usability
        cols = ["name", "role", "sector_id", "email", "phone"]
        # Add any extra columns that might exist in data
        existing_cols = [c for c in cols if c in df.columns] + [c for c in df.columns if c not in cols]
        df = df[existing_cols]

        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Responders')
        
        output.seek(0)
        
        headers = {
            'Content-Disposition': 'attachment; filename="responders.xlsx"'
        }
        return StreamingResponse(output, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

    except Exception as e:
        print(f"[api] Export failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/responders/import")
async def import_responders(file: UploadFile = File(...)):
    """
    Import responders from an Excel file.
    Replaces existing responders or Merges? 
    Let's simple APPEND for now, or Upsert based on Email?
    User asked to "Update", implies bulk edit.
    Simplest 'Bulk Edit' logic: Wipe and Replace, or Smart Upsert.
    Wipe and Replace is risky if user made mistake.
    Let's do: Iterate and Insert if new, Update if exists (match by email/phone?).
    Actually, simpler: Just add them. User can manage duplicates.
    Or: Wipe `db.responders` and load fresh from Excel (Sync mode).
    "Store info in Excel so it is easy to do operation" -> implies Excel is the master.
    So, WIPE and LOAD is the most intuitive "Sync" behavior.
    """
    import pandas as pd
    import io
    
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        # Validation
        required = ["name", "role", "sector_id", "email"]
        missing = [c for c in required if c not in df.columns]
        if missing:
            raise HTTPException(status_code=400, detail=f"Missing columns: {missing}")

        # Convert to records
        records = df.to_dict(orient='records')
        
        # Clean NaN values
        cleaned_records = []
        for r in records:
            clean_r = {}
            for k, v in r.items():
                if pd.notna(v):
                    clean_r[k] = str(v) if k in ['phone', 'sector_id'] else v # Ensure phone is string
            cleaned_records.append(clean_r)

        if not cleaned_records:
             return {"status": "skipped", "message": "No valid data found"}

        # EXECUTE SYNC (Wipe and Replace)
        # This aligns with "manage in Excel" philosophy.
        db.responders.delete_many({})
        if cleaned_records:
            db.responders.insert_many(cleaned_records)

        return {"status": "success", "count": len(cleaned_records)}

    except Exception as e:
        print(f"[api] Import failed: {e}")
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/status")
def status() -> Dict[str, str]:
    """Endpoint used by the dashboard to show backend status."""
    return {"status": "Running"}


@app.get("/accidents")
def get_accidents(camera_id: Optional[str] = None, limit: int = 50):
    """
    Returns raw accident documents as stored in MongoDB.
    Useful for debugging or external integrations.
    """
    q: Dict[str, Any] = {}
    if camera_id:
        q["camera_id"] = camera_id
    docs = list(db.accidents.find(q).sort("inserted_at", -1).limit(limit))
    for d in docs:
        d["_id"] = str(d["_id"])
    return JSONResponse(content={"count": len(docs), "items": docs})


@app.delete("/accidents")
def delete_accidents():
    """
    Clear all accident records from the database.
    """
    res = db.accidents.delete_many({})
    return {"status": "deleted", "count": res.deleted_count}


def _doc_to_event(doc: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert a Mongo accident document into the compact event shape the
    React dashboard expects:
      {
        id, type, severity, time, rel_speed, iou
      }
    """
    _id = str(doc.get("_id", ""))
    crops: List[Dict[str, Any]] = doc.get("crops", []) or []
    first_pred: Dict[str, Any] = crops[0].get("prediction", {}) if crops else {}

    # Fallbacks if prediction fields are missing
    event_type = first_pred.get("label", "accident")
    severity = first_pred.get("severity", "unknown")

    # Prefer detector_ts (when the frame was processed), fall back to inserted_at
    ts = doc.get("detector_ts") or doc.get("inserted_at")
    try:
        from datetime import timezone
        # If it is a datetime, convert to UNIX seconds
        # Ensure it's treated as UTC if naive
        if hasattr(ts, 'replace') and ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        time_val = ts.timestamp()  # type: ignore[attr-defined]
    except Exception:
        time_val = None

    # Optional detailed metrics – may be None; the frontend uses optional chaining
    rel_speed = None
    iou = None
    crashes = doc.get("crashes") or []
    if crashes:
        # If detector stored IOU per crash, surface the first one
        crash0 = crashes[0]
        iou = crash0.get("iou")

    # Camera identifier (set by detector_publisher / classifier_subscriber).
    camera_id = doc.get("camera_id") or ""

    # Location metadata (string + optional lat/lng for the dashboard map view)
    location = doc.get("location") or ""
    location_lat = doc.get("location_lat")
    location_lng = doc.get("location_lng")
    if not location_lat and not location_lng:
        coords = doc.get("location_coords")
        if isinstance(coords, dict):
            location_lat = coords.get("lat")
            location_lng = coords.get("lng")

    camera_meta = CAMERA_METADATA.get(camera_id or "")
    
    # Prefer stored name, fallback to live config
    camera_name = doc.get("camera_name") or ""
    
    if camera_meta:
        if not location:
            location = camera_meta.get("location") or ""
        if not camera_name:
            camera_name = camera_meta.get("name") or camera_meta.get("camera_name") or ""
        if location_lat is None or location_lng is None:
            location_lat = camera_meta.get("lat", location_lat)
            location_lng = camera_meta.get("lng", location_lng)
    
    sector_id = ""
    # Prefer stored sector_id (historic truth), fallback to current config
    if doc.get("sector_id"):
        sector_id = doc.get("sector_id")
    elif camera_meta:
        sector_id = camera_meta.get("sector_id") or ""

    # If we have at least one crop, attach snapshot metadata so the
    # dashboard can render a thumbnail next to the alert.
    snapshot_id = _id if crops else None
    snapshot_path = crops[0].get("file") if crops else None

    return {
        "id": _id,
        "type": event_type,
        "severity": severity,
        "time": time_val,
        "rel_speed": rel_speed,
        "iou": iou,
        "camera_id": camera_id,
        "camera_name": camera_name,
        "location": location,
        "location_lat": location_lat,
        "location_lng": location_lng,
        "sector_id": sector_id,
        "snapshot_id": snapshot_id,
        "snapshot_path": snapshot_path,
        "snapshot_count": len(crops),
        "snapshots": [
            {
                "idx": i,
                "label": c.get("prediction", {}).get("label", "unknown"),
                "severity": c.get("prediction", {}).get("severity", "unknown"),
                "file": c.get("file")
            }
            for i, c in enumerate(crops)
        ]
    }


@app.get("/events")
def get_events(
    camera_id: Optional[str] = None, 
    start_time: Optional[float] = None,
    end_time: Optional[float] = None,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """
    Lightweight accident list for the dashboard "Recent Alerts" card.
    Supports filtering by camera and time range.
    """
    query: Dict[str, Any] = {}
    if camera_id:
        query["camera_id"] = camera_id
    
    if start_time or end_time:
        query["inserted_at"] = {}
        if start_time:
            query["inserted_at"]["$gte"] = start_time
        if end_time:
            query["inserted_at"]["$lte"] = end_time

    docs = list(db.accidents.find(query).sort("inserted_at", -1).limit(limit))
    return [_doc_to_event(d) for d in docs]


@app.get("/cameras")
def list_cameras() -> List[str]:
    """
    Return a list of distinct camera_ids that have produced accidents.
    Useful for multi-camera dashboards and filtering.
    """
    return sorted(db.accidents.distinct("camera_id") or [])


@app.get("/snapshots")
def list_snapshots(limit: int = 50) -> List[str]:
    """
    Return a list of accident IDs that have at least one crop.
    The dashboard will link to /snapshot/{id}.
    """
    docs = list(
        db.accidents.find({"crops.0": {"$exists": True}})
        .sort("inserted_at", -1)
        .limit(limit)
    )
    return [str(d["_id"]) for d in docs]


@app.get("/snapshot/{accident_id}")
def get_snapshot(accident_id: str, crop_idx: int = 0):
    """
    Serve a specific crop image for a given accident ID as a JPEG file.
    Use ?crop_idx=N to get the N-th crop.
    """
    try:
        oid = ObjectId(accident_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid accident ID")

    doc = db.accidents.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Accident not found")

    crops = doc.get("crops") or []
    if not crops:
        raise HTTPException(status_code=404, detail="No crops for this accident")

    if crop_idx < 0 or crop_idx >= len(crops):
        # Fallback to 0 if out of range, or raise error?
        # Let's raise 404 to be clear
        raise HTTPException(status_code=404, detail=f"Crop index {crop_idx} out of range (0..{len(crops)-1})")

    file_path = crops[crop_idx].get("file")
    if not file_path:
        raise HTTPException(status_code=404, detail="Crop file path missing")

    path = Path(file_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Crop file not found on disk")

    return FileResponse(path, media_type="image/jpeg")


@app.get("/video/{video_filename}")
def get_video(video_filename: str):
    """
    Serve recorded accident videos from the accident_crops/videos directory.
    """
    # Security: Only allow filenames, not paths
    if "/" in video_filename or "\\" in video_filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    # Construct path to video file
    video_dir = PROJECT_ROOT / "accident_crops" / "videos"
    video_path = video_dir / video_filename
    
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found")
    
    return FileResponse(video_path, media_type="video/mp4")



def _proxy_stream_generator(url: str) -> Generator[bytes, None, None]:
    """
    Proxy an MJPEG stream directly from a URL (e.g., detector output) to the client.
    This avoids decoding and re-encoding with OpenCV, which reduces latency and CPU usage.
    """
    import urllib.request
    try:
        # Open the stream
        stream = urllib.request.urlopen(url)
        # Read and yield chunks indefinitely
        while True:
            chunk = stream.read(1024 * 8)
            if not chunk:
                break
            yield chunk
    except Exception as e:
        print(f"[api] Error proxying stream from {url}: {e}")
        return

def _video_frame_generator(source: str) -> Generator[bytes, None, None]:
    """
    Simple frame generator that loops over a video source and yields JPEG bytes
    in multipart/x-mixed-replace format for <img src> streaming.
    Only used for local files or webcams (not HTTP streams).
    """
    MAX_RETRIES = 5
    retry_count = 0
    cap = cv2.VideoCapture(source)
    
    if not cap.isOpened():
        # Yield a single placeholder frame instead of failing silently or crashing
        import numpy as np
        blank = np.zeros((480, 640, 3), np.uint8)
        cv2.putText(blank, "CAMERA BUSY / UNAVAILABLE", (50, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        ok, buf = cv2.imencode(".jpg", blank)
        if ok:
             yield (b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + buf.tobytes() + b"\r\n")
        return

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                # If we lose the camera (or file ends), handle it
                if isinstance(source, int) or (isinstance(source, str) and source.isdigit()):
                     # Webcam lost? Release and break to stop spam.
                     print(f"[api] Lost connection to source {source}")
                     break
                else: 
                     # File restart
                     cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                     continue
            
            ok, buffer = cv2.imencode(".jpg", frame)
            if not ok:
                continue
            frame_bytes = buffer.tobytes()
            # Add a small delay to simulate ~30 FPS
            import time
            time.sleep(0.033)
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
            )
    except GeneratorExit:
        print(f"[api] Client disconnected from stream {source}")
    except Exception as e:
        print(f"[api] Stream error: {e}")
    finally:
        cap.release()



@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Handle file uploads from the dashboard (e.g. for custom video files).
    Saves the file to 'temp_uploads' and returns the absolute path.
    """
    import os
    try:
        upload_dir = PROJECT_ROOT / "temp_uploads"
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # We might want to sanitize the filename or ensure uniqueness, 
        # but for now, simple overwrite is okay for this local tool.
        file_path = upload_dir / file.filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        print(f"[api] Uploaded file to {file_path}")
        return {
            "path": str(file_path.absolute()), 
            "filename": file.filename
        }
    except Exception as e:
        print(f"[api] Upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/video_feed")
def video_feed(source_id: str = DEFAULT_VIDEO_SOURCE_ID, source_value: Optional[str] = None):
    """
    Basic MJPEG video stream used by the dashboard's Live Feed card.
    Choose source via ?source_id=. Options are defined in VIDEO_SOURCES.

    Note: This is independent from the detector_publisher pipeline; it is
    purely for visual live preview in the dashboard.
    """
    source_cfg = VIDEO_SOURCES.get(source_id) or VIDEO_SOURCES[DEFAULT_VIDEO_SOURCE_ID]
    requires_value = bool(source_cfg.get("requires_value"))

    if requires_value:
        if not source_value:
            raise HTTPException(status_code=400, detail="source_value is required for this source")
        value_type = source_cfg.get("value_type", "text")
        if source_cfg.get("type") == "webcam" and value_type != "text":
            # keep compatibility if value_type explicitly number
            value_type = source_cfg.get("value_type")
        if source_cfg.get("type") == "webcam":
            # allow numeric index or DirectShow name
            try:
                source = int(source_value)
            except ValueError:
                source = source_value
        else:
            source = source_value
    else:
        source = source_cfg.get("source")

    if source is None:
        raise HTTPException(status_code=400, detail="Invalid or unsupported video source")
    
    print(f"[api] video_feed requested source_id={source_id}", flush=True)
    print(f"[api] resolved source={source}", flush=True)

    if isinstance(source, str) and source.startswith("http"):
        # Use direct proxy for HTTP streams (detector)
        return StreamingResponse(
            _proxy_stream_generator(source),
            media_type="multipart/x-mixed-replace; boundary=frame",
        )
    else:
        # Use OpenCV for local files / webcams
        return StreamingResponse(
            _video_frame_generator(source),
            media_type="multipart/x-mixed-replace; boundary=frame",
        )


@app.get("/video_sources")
def video_sources():
    """
    Expose configured video sources so the dashboard can render a dropdown.
    """
    options = []
    for source_id, cfg in VIDEO_SOURCES.items():
        # Start with defaults from config
        label = cfg.get("label", source_id)
        cam_id = cfg.get("camera_id")
        cam_name = cfg.get("camera_name")
        loc = cfg.get("location")
        lat = cfg.get("location_lat")
        lng = cfg.get("location_lng")

        # Overlay dynamic metadata if available
        if cam_id and cam_id in CAMERA_METADATA:
            # Skip overlay if it is the detector stream (user request)
            # But we still want to show the stream in the list!
            if cam_id == "detector_stream":
                pass
            else:
                meta = CAMERA_METADATA[cam_id]
                if meta.get("name"):
                    cam_name = meta.get("name")
                if meta.get("location"):
                    loc = meta.get("location")
                if meta.get("lat") is not None:
                    lat = meta.get("lat")
                if meta.get("lng") is not None:
                    lng = meta.get("lng")
                if meta.get("sector_id"):
                    sector_id = meta.get("sector_id")
                if meta.get("video_source"):
                    # For listing, we might want to show the underlying source?
                    # But the frontend uses source_id.
                    pass
            if meta.get("name"):
                cam_name = meta.get("name")
            if meta.get("location"):
                loc = meta.get("location")
            if meta.get("lat") is not None:
                lat = meta.get("lat")
            if meta.get("lng") is not None:
                lng = meta.get("lng")
            if meta.get("sector_id"):
                sector_id = meta.get("sector_id")
            else:
                sector_id = None

        options.append(
            {
                "id": source_id,
                "label": label,
                "type": cfg.get("type", "unknown"),
                "description": cfg.get("description", ""),
                "is_default": source_id == DEFAULT_VIDEO_SOURCE_ID,
                "requires_value": bool(cfg.get("requires_value")),
                "value_hint": cfg.get("value_hint", ""),
                "value_type": cfg.get("value_type", "text"),
                "camera_id": cam_id,
                "camera_name": cam_name,
                "location": loc,
                "location_lat": lat,
                "location_lng": lng,
                "detection_enabled": CAMERA_METADATA.get(cam_id, {}).get("detection_enabled", False) if cam_id else False,
                "sector_id": CAMERA_METADATA.get(cam_id, {}).get("sector_id", ""),
                "video_source": cfg.get("source"), # Default from config
                "source": cfg.get("source") # Explicitly expose source for frontend logic
            }
        )
    return options
