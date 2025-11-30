"""
services/api_server.py
A minimal FastAPI server that can serve accident records from MongoDB to your dashboard.
"""
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pymongo import MongoClient
from pydantic import BaseModel
from typing import Optional

app = FastAPI()

MONGO_URI = "mongodb://127.0.0.1:27017"
DB_NAME = "accident_db"
client = MongoClient(MONGO_URI)
db = client[DB_NAME]

class QueryParams(BaseModel):
    camera_id: Optional[str] = None
    limit: Optional[int] = 50

@app.get("/accidents")
def get_accidents(camera_id: Optional[str] = None, limit: int = 50):
    q = {}
    if camera_id:
        q["camera_id"] = camera_id
    docs = list(db.accidents.find(q).sort("inserted_at", -1).limit(limit))
    for d in docs:
        d['_id'] = str(d['_id'])
    return JSONResponse(content={"count": len(docs), "items": docs})

@app.get("/health")
def health():
    return {"status": "ok"}
