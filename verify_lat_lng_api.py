import requests
import json

url = "http://127.0.0.1:8000/cameras/demo_cam_main"
payload = {
    "name": "API Test Intersection",
    "location": "API Test Location",
    "lat": 12.345,
    "lng": 67.890
}
headers = {"Content-Type": "application/json"}

try:
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
