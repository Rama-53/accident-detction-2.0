from pymongo import MongoClient

client = MongoClient("mongodb://127.0.0.1:27017")
db = client["accident_db"]

print("--- Camera Configurations in DB ---")
for doc in db.cameras.find():
    print(doc)
