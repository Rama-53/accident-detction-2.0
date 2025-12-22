
from pymongo import MongoClient
import json

def check_config():
    client = MongoClient("mongodb://127.0.0.1:27017")
    db = client["accident_db"]
    config = db.system_config.find_one({"config_id": "main"})
    
    if config:
        # Convert ObjectId to str for printing
        if '_id' in config: del config['_id']
        print("Current System Config:")
        print(json.dumps(config, indent=4))
    else:
        print("No 'main' config found in 'system_config' collection. Using defaults (All False).")

if __name__ == "__main__":
    check_config()
