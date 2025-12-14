import requests
try:
    print("Sending update request...")
    res = requests.post("http://localhost:8000/cameras/demo_cam_main", json={"video_source": "1"})
    print(f"Status: {res.status_code}")
    print(f"Body: {res.text}")
except Exception as e:
    print(f"Error: {e}")
