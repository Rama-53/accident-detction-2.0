import requests
import json

try:
    print("Testing /health...")
    r = requests.get("http://localhost:8000/health")
    print(f"Health: {r.status_code} {r.text}")

    print("Testing /events...")
    r = requests.get("http://localhost:8000/events")
    print(f"Events Status: {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        print(f"Events Count: {len(data)}")
        if len(data) > 0:
            print("First Event:", json.dumps(data[0], indent=2))
    else:
        print("Events Error:", r.text)
except Exception as e:
    print("Exception:", e)
