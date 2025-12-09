from pymongo import MongoClient
import pprint

client = MongoClient("mongodb://127.0.0.1:27017")
db = client["accident_db"]

print("--- Config for demo_cam_main ---")
doc = db.cameras.find_one({"camera_id": "demo_cam_main"})
pprint.pprint(doc)

print("\n--- Recent Accidents (Last 5) ---")
for doc in db.accidents.find().sort("inserted_at", -1).limit(5):
    print(f"Time: {doc.get('inserted_at')}, Cam: {doc.get('camera_id')}")
