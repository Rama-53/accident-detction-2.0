from pymongo import MongoClient

try:
    client = MongoClient('mongodb://127.0.0.1:27017')
    db = client.accident_db
    res = db.system_config.update_one(
        {'config_id': 'main'}, 
        {'$set': {'email_alerts_enabled': True, 'whatsapp_alerts_enabled': True}}, 
        upsert=True
    )
    print(f"Update acknowledged: {res.acknowledged}")
    print(f"Matched: {res.matched_count}, Modified: {res.modified_count}, Upserted: {res.upserted_id}")
    
    # Verify
    doc = db.system_config.find_one({'config_id': 'main'})
    print("Current Config:", doc)
except Exception as e:
    print("Error:", e)
