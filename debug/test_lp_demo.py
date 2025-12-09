import cv2
import numpy as np
from ultralytics import YOLO
import easyocr
import time

# Configuration
VIDEO_PATH = "cctv_eg.mp4"
CAR_MODEL_PATH = "yolo11n.pt" # Standard model for vehicle detection
LP_MODEL_PATH = "license_plate_detector.pt" # Custom LP model

def main():
    print("Loading models...")
    # Load models
    car_model = YOLO(CAR_MODEL_PATH)
    lp_model = YOLO(LP_MODEL_PATH)
    
    print("Initializing OCR...")
    reader = easyocr.Reader(['en'], gpu=True) # Set gpu=False if you see CUDA errors
    
    cap = cv2.VideoCapture(VIDEO_PATH)
    if not cap.isOpened():
        print(f"Error: Could not open {VIDEO_PATH}")
        return

    # Resize for display if needed
    display_width = 1280
    
    print("Starting video processing... Press 'q' to quit.")
    
    frame_count = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            print("End of video.")
            break
            
        frame_count += 1
        
        # Optimization: Frame skip? (Optional, let's process every 3rd frame to be faster)
        # if frame_count % 3 != 0:
        #    continue

        # 1. Detect Vehicles
        # Added class 5 (bus) as per request.
        results = car_model(frame, classes=[2, 3, 5, 7], verbose=False)[0] 
        
        for box in results.boxes:
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
            conf = float(box.conf[0])
            
            # Draw Vehicle Box
            cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 0, 0), 2)
            
            # Crop Vehicle
            veh_crop = frame[y1:y2, x1:x2]
            if veh_crop.size == 0: continue
            
            # 2. Detect License Plate in Vehicle Crop
            lp_results = lp_model(veh_crop, verbose=False)[0]
            
            for lp_box in lp_results.boxes:
                lx1, ly1, lx2, ly2 = lp_box.xyxy[0].cpu().numpy().astype(int)
                l_conf = float(lp_box.conf[0])
                
                # Draw LP Box (Global coordinates)
                gx1, gy1, gx2, gy2 = x1+lx1, y1+ly1, x1+lx2, y1+ly2
                cv2.rectangle(frame, (gx1, gy1), (gx2, gy2), (0, 255, 0), 2)
                
                # 3. OCR Processing with THRESHOLDS
                lp_crop = veh_crop[ly1:ly2, lx1:lx2]
                
                if lp_crop.size == 0: continue

                try:
                    # User requested preprocessing:
                    # license_plate_crop_gray = cv2.cvtColor(license_plate_crop, cv2.COLOR_BGR2GRAY)
                    # _, license_plate_crop_thresh = cv2.threshold(license_plate_crop_gray, 64, 255, cv2.THRESH_BINARY_INV)
                    
                    lp_gray = cv2.cvtColor(lp_crop, cv2.COLOR_BGR2GRAY)
                    _, lp_thresh = cv2.threshold(lp_gray, 64, 255, cv2.THRESH_BINARY_INV)
                    
                    # Show the thresholded crop for debug (optional, maybe in a small corner or just use it)
                    # cv2.imshow("Debug Thresh", lp_thresh)
                    
                    # OCR on the thresholded image
                    ocr_res = reader.readtext(lp_thresh, detail=0, allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
                    text = "".join(ocr_res).strip().upper()
                    
                    if text:
                        print(f"Frame {frame_count}: Detected {text}")
                        # Draw Text
                        cv2.putText(frame, text, (gx1, gy1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
                except Exception as e:
                    # print(f"OCR Error: {e}")
                    pass

        # Display
        # Resize to fit screen
        h, w = frame.shape[:2]
        ratio = display_width / w
        disp_frame = cv2.resize(frame, (display_width, int(h * ratio)))
        
        cv2.imshow("License Plate Demo", disp_frame)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
