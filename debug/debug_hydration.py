from pymongo import MongoClient
import json

client = MongoClient("mongodb://127.0.0.1:27017")
db = client["accident_db"]

# Define standard cameras
CAMERAS = [
    {"camera_id": "demo_cam_main", "name": "Demo Intersection", "location": "Main St & 1st Ave", "sector_id": "SEC-MAIN-01", "video_source": "0"},
    {"camera_id": "custom_file", "name": "Custom Clip", "location": "Uploaded File", "sector_id": "SEC-CUSTOM-01", "video_source": None}, # Source will be updated dynamically
    {"camera_id": "webcam_0", "name": "Local Webcam", "location": "Local", "sector_id": "SEC-LOCAL-01", "video_source": "0"}
]

print("Existing cameras:")
for cam in db.cameras.find():
    print(cam)

print("\nSeeding/Updating cameras...")
for cam in CAMERAS:
    cid = cam["camera_id"]
    existing = db.cameras.find_one({"camera_id": cid})
    
    if not existing:
        db.cameras.insert_one(cam)
        print(f"Created {cid}")
    else:
        # Only update if fields are missing, preserve video_source if user set it
        update_fields = {}
        if "name" not in existing: update_fields["name"] = cam["name"]
        if "location" not in existing: update_fields["location"] = cam["location"]
        if "sector_id" not in existing: update_fields["sector_id"] = cam["sector_id"]
        
        if update_fields:
            db.cameras.update_one({"_id": existing["_id"]}, {"$set": update_fields})
            print(f"Updated {cid} with {update_fields}")
        else:
            print(f"{cid} OK")

print("\nFinal State:")
for cam in db.cameras.find():
    print(cam)
