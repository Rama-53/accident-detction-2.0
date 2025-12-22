from pymongo import MongoClient
import sys

client = MongoClient("mongodb://127.0.0.1:27017")
db = client["accident_db"]

# 1. Inspect and Remove 'demo_clip' if it has the bad metadata
bad_doc = db.cameras.find_one({"camera_id": "demo_clip"})
if bad_doc:
    print(f"Found bad doc: {bad_doc.get('location')}")
    if bad_doc.get("location") == "Kothamangalam Highroad":
        db.cameras.delete_one({"_id": bad_doc["_id"]})
        print("Deleted 'demo_clip' to remove bad metadata.")
    else:
        print("demo_clip exists but location doesn't match 'Kothamangalam Highroad'. Keeping it.")
else:
    print("'demo_clip' not found. Good.")

# 2. Ensure 'custom_file' exists with correct metadata
cid = "custom_file"
custom_doc = db.cameras.find_one({"camera_id": cid})
if not custom_doc:
    print(f"'{cid}' missing. Creating it...")
    db.cameras.insert_one({
        "camera_id": cid,
        "name": "Custom Video File",
        "location": "Uploaded File",
        "sector_id": "SEC-CUSTOM-01",
        "video_source": None, # Will be set by API
        "detection_enabled": False
    })
    print(f"Created '{cid}'.")
else:
    print(f"'{cid}' exists. Metadata: {custom_doc.get('name')}, {custom_doc.get('location')}")
    # Force update metadata if it looks wrong (e.g. if it somehow got the bad data)
    db.cameras.update_one(
        {"camera_id": cid},
        {"$set": {
            "name": "Custom Video File",
            "location": "Uploaded File",
            "sector_id": "SEC-CUSTOM-01"
        }}
    )
    print(f"Forced metadata correction for '{cid}'.")

# 3. List all cameras to verify
print("\nActive Cameras:")
for cam in db.cameras.find():
    print(f"{cam.get('camera_id')}: {cam.get('video_source')} | {cam.get('location')}")
