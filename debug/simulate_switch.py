import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_switch():
    print("Simulating frontend switch...")
    
    # 1. Update Custom Cam Source
    custom_source = r"C:\Users\Ram\Desktop\test_video.mp4"
    print(f"Setting custom_file source to: {custom_source}")
    resp = requests.post(f"{BASE_URL}/cameras/custom_file", json={"video_source": custom_source})
    print(f"Custom update status: {resp.status_code}")

    time.sleep(1)

    # 2. Update Demo Cam Source
    print(f"Switching detector to: {custom_source}")
    resp = requests.post(f"{BASE_URL}/cameras/demo_cam_main", json={"video_source": custom_source})
    print(f"Detector update status: {resp.status_code}")

if __name__ == "__main__":
    try:
        test_switch()
    except Exception as e:
        print(f"Test failed: {e}")
