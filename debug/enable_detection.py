from pymongo import MongoClient
db = MongoClient().accident_db
db.cameras.update_one({"camera_id": "demo_cam_main"}, {"$set": {"detection_enabled": True}})
print("Enabled detection for demo_cam_main")
