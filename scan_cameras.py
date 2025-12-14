import cv2
import time

print("Scanning for cameras (Indices 0-5)...")

for idx in range(6):
    print(f"\n--- Testing Camera Index {idx} ---")
    
    # Test DSHOW (DirectShow) - default for our new code
    cap_dshow = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
    if cap_dshow.isOpened():
        ret, frame = cap_dshow.read()
        if ret:
            print(f"[SUCCESS] Index {idx} works with CAP_DSHOW! Resolution: {frame.shape[1]}x{frame.shape[0]}")
        else:
            print(f"[WARNING] Index {idx} opened with CAP_DSHOW but returned no frame.")
        cap_dshow.release()
    else:
        print(f"[FAIL] Index {idx} failed with CAP_DSHOW.")

    # Test MSMF (Microsoft Media Foundation) - fallback
    cap_msmf = cv2.VideoCapture(idx, cv2.CAP_MSMF)
    if cap_msmf.isOpened():
        ret, frame = cap_msmf.read()
        if ret:
            print(f"[SUCCESS] Index {idx} works with CAP_MSMF! Resolution: {frame.shape[1]}x{frame.shape[0]}")
        else:
             print(f"[WARNING] Index {idx} opened with CAP_MSMF but returned no frame.")
        cap_msmf.release()
    else:
        print(f"[FAIL] Index {idx} failed with CAP_MSMF.")

print("\nScan Complete.")
