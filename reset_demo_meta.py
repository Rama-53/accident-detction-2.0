from pymongo import MongoClient

client = MongoClient("mongodb://127.0.0.1:27017")
db = client["accident_db"]

cid = "demo_cam_main"
print(f"Resetting metadata for {cid}...")

db.cameras.update_one(
    {"camera_id": cid},
    {"$set": {
        "name": "Demo Intersection",
        "location": "Main St & 1st Ave",
        "sector_id": "SEC-MAIN-01",
        "lat": None, # Clear if not needed, or set to some default
        "lng": None
    }}
)

# Verify
updated = db.cameras.find_one({"camera_id": cid})
print("Updated Doc:")
print(updated)
