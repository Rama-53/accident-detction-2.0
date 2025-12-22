
import sys
import os
from pymongo import MongoClient
import traceback

# Add current dir to path to allow imports
sys.path.append(os.getcwd())

try:
    from services.api_server import _doc_to_event
except ImportError:
    print("Could not import _doc_to_event. Defining it locally based on view_file...")
    # I will rely on the import working first. 
    # If it fails, I'll need to define it or see why.
    sys.exit(1)

def main():
    db = MongoClient("mongodb://127.0.0.1:27017").accident_db
    docs = list(db.accidents.find().sort("inserted_at", -1).limit(50))
    print(f"Found {len(docs)} docs. Testing conversion...")

    for i, doc in enumerate(docs):
        try:
            evt = _doc_to_event(doc)
        except Exception as e:
            print(f"CRASH on doc index {i}, ID: {doc.get('_id')}")
            print(f"Doc keys: {list(doc.keys())}")
            print(f"Error: {e}")
            traceback.print_exc()
            return
    
    print("All docs converted successfully!")

if __name__ == "__main__":
    main()
