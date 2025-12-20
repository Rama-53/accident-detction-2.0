from pymongo import MongoClient
from bson.objectid import ObjectId
from typing import List, Dict, Optional, Any
from datetime import datetime

class ResponderService:
    def __init__(self, db_client: MongoClient, db_name: str = "accident_db"):
        self.db = db_client[db_name]
        self.collection = self.db.responders

    def create_responder(self, name: str, role: str, sector_id: str, email: str, phone: str = "") -> str:
        """
        Creates a new responder and returns their ID.
        """
        doc = {
            "name": name,
            "role": role,          # e.g. police, ambulance, fire
            "sector_id": sector_id,
            "email": email,
            "phone": phone,
            "is_active": True,
            "created_at": datetime.utcnow()
        }
        res = self.collection.insert_one(doc)
        return str(res.inserted_id)

    def get_all_responders(self) -> List[Dict[str, Any]]:
        """
        Returns a list of all responders.
        """
        docs = list(self.collection.find().sort("created_at", -1))
        # Convert ObjectId to str
        for d in docs:
            d["_id"] = str(d["_id"])
        return docs

    def get_responders_by_sector(self, sector_id: str) -> List[Dict[str, Any]]:
        """
        Finds active responders in a specific sector.
        """
        query = {
            "sector_id": sector_id,
            "is_active": True
        }
        docs = list(self.collection.find(query))
        for d in docs:
            d["_id"] = str(d["_id"])
        return docs

    def update_responder(self, responder_id: str, updates: Dict[str, Any]) -> bool:
        """
        Updates responder details.
        """
        try:
            res = self.collection.update_one(
                {"_id": ObjectId(responder_id)},
                {"$set": updates}
            )
            return res.modified_count > 0
        except Exception:
            return False

    def delete_responder(self, responder_id: str) -> bool:
        """
        Removes a responder.
        """
        try:
            res = self.collection.delete_one({"_id": ObjectId(responder_id)})
            return res.deleted_count > 0
        except Exception:
            return False
