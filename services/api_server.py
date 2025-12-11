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
from typing import Optional, List, Dict, Any, Generator

import cv2
from bson.objectid import ObjectId
from fastapi import FastAPI, HTTPException
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

# Default video source for the /video_feed endpoint.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
VIDEO_SOURCES: Dict[str, Dict[str, Any]] = {
    "demo_clip": {
        "label": "Demo clip (cctv_eg.mp4)",
        "type": "file",
        "description": "Sample CCTV clip bundled with the repo",
        "source": str(PROJECT_ROOT / "cctv_eg.mp4"),
        "requires_value": False,
        "camera_id": "demo_cam_main",
        "camera_name": "Demo Intersection",
        "location": "Demo City - Main & 5th",
        "location_lat": 37.3353,
        "location_lng": -121.8893,
    },
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
DEFAULT_VIDEO_SOURCE_ID = "demo_clip"

from pydantic import BaseModel

class CameraConfig(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    detection_enabled: Optional[bool] = False

CAMERA_METADATA: Dict[str, Dict[str, Any]] = {}
# 1. Initialize from hardcoded config
for cfg in VIDEO_SOURCES.values():
    cam_id = cfg.get("camera_id")
    if not cam_id:
        continue
    CAMERA_METADATA[cam_id] = {
        "name": cfg.get("camera_name"),
        "location": cfg.get("location"),
        "lat": cfg.get("location_lat"),
        "lng": cfg.get("location_lng"),
    }

# 2. Apply overrides from MongoDB
try:
    for stored_cam in db.cameras.find():
        c_id = stored_cam.get("camera_id")
        if c_id:
            if c_id not in CAMERA_METADATA:
                CAMERA_METADATA[c_id] = {}
            # Update fields if present in DB
            for f in ["name", "location", "lat", "lng", "detection_enabled"]:
                if stored_cam.get(f) is not None:
                    CAMERA_METADATA[c_id][f] = stored_cam.get(f)
    print(f"[api] Loaded {db.cameras.count_documents({})} camera overrides from DB")
except Exception as e:
    print(f"[api] Failed to load camera overrides: {e}")


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

    # 2. Persist to MongoDB
    if update_data:
        db.cameras.update_one(
            {"camera_id": camera_id},
            {"$set": update_data},
            upsert=True
        )
    
    return {"status": "updated", "camera_id": camera_id, "current_config": CAMERA_METADATA[camera_id]}


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
        # If it is a datetime, convert to UNIX seconds
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
    if camera_meta:
        if not location:
            location = camera_meta.get("location") or ""
        if location_lat is None or location_lng is None:
            location_lat = camera_meta.get("lat", location_lat)
            location_lng = camera_meta.get("lng", location_lng)

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
        "location": location,
        "location_lat": location_lat,
        "location_lng": location_lng,
        "snapshot_id": snapshot_id,
        "snapshot_path": snapshot_path,
        "snapshot_count": len(crops),
    }


@app.get("/events")
def get_events(camera_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    """
    Lightweight accident list for the dashboard "Recent Alerts" card.
    """
    query: Dict[str, Any] = {}
    if camera_id:
        query["camera_id"] = camera_id
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
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        # No video available; yield nothing (client will show blank)
        return

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                # restart from beginning for file sources
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
    finally:
        cap.release()


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
            meta = CAMERA_METADATA[cam_id]
            if meta.get("name"):
                cam_name = meta.get("name")
            if meta.get("location"):
                loc = meta.get("location")
            if meta.get("lat") is not None:
                lat = meta.get("lat")
            if meta.get("lng") is not None:
                lng = meta.get("lng")

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
                "detection_enabled": CAMERA_METADATA.get(cam_id, {}).get("detection_enabled", True) if cam_id else True
            }
        )
    return options
