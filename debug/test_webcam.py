
import cv2
import time
import sys

def test_source(index, backend_name, backend_id):
    print(f"\n--- Testing Camera {index} with {backend_name} ---")
    cap = cv2.VideoCapture(index, backend_id)
    
    if not cap.isOpened():
        print(f"FAILED to open camera {index} with {backend_name}")
        return
    
    print(f"Opened camera {index} with {backend_name}")
    print(f"Backend used: {cap.getBackendName()}")
    
    # Try reading frames
    success_count = 0
    start = time.time()
    while time.time() - start < 3.0:
        ret, frame = cap.read()
        if ret:
            success_count += 1
            if success_count % 10 == 0:
                print(f"  Got {success_count} frames...", end="\r")
        else:
            print(f"  Failed to grab frame. Error code might follow.")
            time.sleep(0.1)
            
    print(f"\nResult: Grabbed {success_count} frames in 3 seconds.")
    cap.release()

if __name__ == "__main__":
    for i in range(5):
        print(f"\nScanning index {i}...")
        test_source(i, "CAP_DSHOW", cv2.CAP_DSHOW)
