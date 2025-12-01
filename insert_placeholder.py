from pathlib import Path
import base64
from datetime import datetime
from pymongo import MongoClient

IMG_B64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAEBAQEBAQEBAQECAQEBAQECAQEBAgICAgICAgICAgMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwP/wAALCAABAAEBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAgP/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdA//Z"

crops_dir = Path("accident_crops")
crops_dir.mkdir(exist_ok=True)
img_file = (crops_dir / "placeholder_alert.jpg").resolve()
img_file.write_bytes(base64.b64decode(IMG_B64))

client = MongoClient("mongodb://127.0.0.1:27017")
db = client["accident_db"]
now = datetime.utcnow()

doc = {
    "camera_id": "demo_placeholder_cam",
    "frame_idx": 0,
    "detector_ts": now,
    "inserted_at": now,
    "location": "Demo City - Junction 1",
    "crashes": [
        {"pair": [0, 1], "iou": 0.82, "note": "placeholder crash"}
    ],
    "bbox_count": 2,
    "crop_count": 1,
    "crops": [
        {
            "file": str(img_file),
            "width": 256,
            "height": 256,
            "prediction": {
                "label": "vehicle_collision",
                "severity": "high",
                "confidence": 0.95,
                "note": "placeholder"
            }
        }
    ],
    "raw_event": {"source": "placeholder_injection"}
}

res = db.accidents.insert_one(doc)
print(f"Inserted placeholder accident: {res.inserted_id}")
