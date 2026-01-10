from pymongo import MongoClient
client = MongoClient("mongodb://127.0.0.1:27017")
db = client["accident_db"]
config = db.system_config.find_one({"config_id": "main"})
print("System Config:", config)
