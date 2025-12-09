from pymongo import MongoClient
import sys

client = MongoClient("mongodb://127.0.0.1:27017")
db = client["accident_db"]
latest = db.accidents.find_one(sort=[("inserted_at", -1)])

if latest:
    print(f"Latest Accident ID: {latest['_id']}")
    print(f"Location: {latest.get('location')}")
    
    if latest.get('location') == "Manual Test Location":
        print("SUCCESS: Location matches!")
    else:
        print(f"FAILURE: Location mismatch. Expected 'Manual Test Location', got '{latest.get('location')}'")
else:
    print("No accidents found in DB.")
