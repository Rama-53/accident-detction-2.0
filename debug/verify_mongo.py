from pymongo import MongoClient
import sys

client = MongoClient("mongodb://127.0.0.1:27017")
db = client["accident_db"]
latest = db.accidents.find_one(sort=[("inserted_at", -1)])

if latest:
    print(f"Latest Accident ID: {latest['_id']}")
    print(f"Camera ID: {latest.get('camera_id')}")
    print(f"Crops: {len(latest.get('crops', []))}")
    
    if latest.get('camera_id') == "demo_cam_main":
        print("SUCCESS: Camera ID matches!")
    else:
        print(f"FAILURE: Camera ID mismatch. Expected 'demo_cam_main', got '{latest.get('camera_id')}'")
else:
    print("No accidents found in DB.")
