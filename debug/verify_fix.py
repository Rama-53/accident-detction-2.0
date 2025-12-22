import requests
import time

BASE_URL = "http://localhost:8000"

def verify_identity():
    # 1. Setup 'custom_file' with a known source
    test_source = r"C:\Users\Ram\Desktop\verification_clip.mp4"
    print(f"Setting custom_file source -> {test_source}")
    requests.post(f"{BASE_URL}/cameras/custom_file", json={"video_source": test_source})
    
    # 2. Tell detector to use that source
    print(f"Switching detector -> {test_source}")
    requests.post(f"{BASE_URL}/cameras/demo_cam_main", json={"video_source": test_source})

    print("Check detector logs for: 'Dynamic Identity Switch: ... -> custom_file'")

if __name__ == "__main__":
    verify_identity()
