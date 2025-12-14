from pymongo import MongoClient
import pprint

client = MongoClient("mongodb://127.0.0.1:27017")
db = client["accident_db"]
doc = db.cameras.find_one({"camera_id": "demo_cam_main"})
print("--- DB Start ---")
pprint.pprint(doc)
print("--- DB End ---")
