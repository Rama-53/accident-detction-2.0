import streamlit as st
import cv2
import numpy as np
import time
from ultralytics import YOLO
import norfair
from collections import defaultdict, deque

# Set page config
st.set_page_config(page_title="Accident Detector Fine-Tuning (Physics-Based)", layout="wide")

st.title("Accident Detector Fine-Tuning (Physics-Based)")

# Sidebar for parameters
st.sidebar.header("Detection Parameters")

CONF_THRESH = st.sidebar.slider("Confidence Threshold", 0.0, 1.0, 0.45, 0.01)

st.sidebar.subheader("Anomaly Weights")
DECEL_WEIGHT = st.sidebar.slider("Deceleration Weight", 0.0, 10.0, 5.0, 0.5)
ANGLE_WEIGHT = st.sidebar.slider("Angle Change Weight", 0.0, 10.0, 2.0, 0.5)

st.sidebar.subheader("Thresholds")
ANOMALY_THRESH = st.sidebar.slider("Anomaly Threshold (Stress)", 0.0, 100.0, 25.0, 1.0, help="Total anomaly score required to trigger a crash check.")
INTERACTION_RADIUS = st.sidebar.slider("Interaction Radius (pixels)", 10, 200, 50, 10, help="Max distance to nearest neighbor to confirm crash.")
MIN_SPEED = st.sidebar.slider("Min Speed (pixels/frame)", 0.0, 10.0, 1.0, 0.5, help="Ignore objects slower than this (reduces noise).")

st.sidebar.header("Tracking Parameters")
TRACKER_DIST_THRESH = st.sidebar.slider("Tracker Distance Threshold", 10.0, 200.0, 60.0, 5.0)
INITIALIZATION_DELAY = st.sidebar.slider("Initialization Delay (Frames to Start)", 0, 30, 10, 1)
HIT_COUNTER_MAX = st.sidebar.slider("Hit Counter Max (Frames to Keep Alive)", 1, 100, 25, 1)

# Constants
TARGET_CLASSES = {0, 2, 3, 7}  # person, car, motorcycle, truck
VEHICLE_CLASSES = {2, 3, 7}    # only vehicle-vehicle collisions
YOLO_MODEL_PATH = "yolov8s.pt"
VIDEO_SOURCE = "cctv_eg.mp4"

# Load Model (Cached)
@st.cache_resource
def load_model():
    return YOLO(YOLO_MODEL_PATH)

model = load_model()

# Video Control
st.subheader("Video Control")
cap = cv2.VideoCapture(VIDEO_SOURCE)
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
start_frame = st.slider("Start Frame", 0, total_frames, 0)
num_frames = st.slider("Number of Frames to Process", 10, 300, 60)
PLAYBACK_DELAY = st.sidebar.slider("Playback Delay (s)", 0.0, 1.0, 0.1, 0.05)

run_btn = st.button("Run Detection Sequence")

# Placeholders for display
frame_placeholder = st.empty()
status_placeholder = st.empty()
debug_placeholder = st.empty()

def get_angle(v):
    return np.degrees(np.arctan2(v[1], v[0]))

def angle_diff(a1, a2):
    diff = (a1 - a2 + 180) % 360 - 180
    return abs(diff)

if run_btn:
    # Reset tracker for this run
    tracker = norfair.Tracker(
        distance_function="mean_euclidean", 
        distance_threshold=TRACKER_DIST_THRESH,
        initialization_delay=INITIALIZATION_DELAY,
        hit_counter_max=HIT_COUNTER_MAX
    )
    
    # State tracking
    last_positions = {} # id -> (x, y)
    last_velocities = {} # id -> (vx, vy)
    
    # Crash persistence
    confirmed_crashed_ids = set()
    
    cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
    
    detected_crashes = []
    
    progress_bar = st.progress(0)
    
    for i in range(num_frames):
        ret, frame = cap.read()
        if not ret:
            break
            
        # YOLO Detection
        results = model(frame, conf=CONF_THRESH, verbose=False)[0]
        
        detections = []
        for box in results.boxes:
            cls = int(box.cls[0])
            if cls in TARGET_CLASSES:
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                conf = float(box.conf[0])
                xc, yc = (x1 + x2) / 2, (y1 + y2) / 2
                detections.append(norfair.Detection(
                    points=np.array([[xc, yc]]),
                    scores=np.array([conf]),
                    label=cls,
                    data=np.array([x1, y1, x2, y2]) # Store box
                ))
        
        # Update Tracker
        tracked_objects = tracker.update(detections=detections)
        
        # Map ID to Box
        tracker_to_box = {}
        for obj in tracked_objects:
            if obj.last_detection is not None:
                tracker_to_box[obj.id] = obj.last_detection.data

        # --- PHYSICS ANOMALY DETECTION ---
        
        frame_debug_info = []
        scores = {} # id -> score
        
        for obj in tracked_objects:
            cid = obj.id
            cx, cy = obj.estimate[0]
            
            # 1. Calculate Velocity
            curr_vel = (0.0, 0.0)
            if cid in last_positions:
                prev_pos = last_positions[cid]
                curr_vel = (cx - prev_pos[0], cy - prev_pos[1])
            
            speed = np.linalg.norm(curr_vel)
            
            # 2. Calculate Acceleration (Deceleration) & Angle Change
            decel_val = 0.0
            angle_change = 0.0
            
            if cid in last_velocities:
                prev_vel = last_velocities[cid]
                prev_speed = np.linalg.norm(prev_vel)
                
                accel_vec = (curr_vel[0] - prev_vel[0], curr_vel[1] - prev_vel[1])
                accel_mag = np.linalg.norm(accel_vec)
                decel_val = accel_mag
                
                if speed > MIN_SPEED and prev_speed > MIN_SPEED:
                    curr_angle = get_angle(curr_vel)
                    prev_angle = get_angle(prev_vel)
                    angle_change = angle_diff(curr_angle, prev_angle)
            
            # 3. Calculate Anomaly Score
            anomaly_score = 0.0
            if speed > MIN_SPEED or (cid in last_velocities and np.linalg.norm(last_velocities[cid]) > MIN_SPEED):
                anomaly_score = (decel_val * DECEL_WEIGHT) + (angle_change * ANGLE_WEIGHT)
            
            scores[cid] = anomaly_score
            
            # 4. Check for Spatial Interaction (Crash Trigger)
            is_crashed = False
            nearest_dist = float('inf')
            nearest_id = None
            
            if anomaly_score > ANOMALY_THRESH:
                # High stress! Check for neighbors.
                for other in tracked_objects:
                    if other.id != cid:
                        ocx, ocy = other.estimate[0]
                        dist = np.hypot(cx - ocx, cy - ocy)
                        if dist < nearest_dist:
                            nearest_dist = dist
                            nearest_id = other.id
                
                if nearest_dist < INTERACTION_RADIUS:
                    is_crashed = True
                
                # Also check for IOU intersection as a valid interaction
                if not is_crashed:
                    for other in tracked_objects:
                        if other.id != cid:
                            # Check IOU
                            if obj.id in tracker_to_box and other.id in tracker_to_box:
                                b1 = tracker_to_box[obj.id]
                                b2 = tracker_to_box[other.id]
                                # Simple intersection check
                                xA = max(b1[0], b2[0])
                                yA = max(b1[1], b2[1])
                                xB = min(b1[2], b2[2])
                                yB = min(b1[3], b2[3])
                                if xB > xA and yB > yA:
                                    is_crashed = True
                                    nearest_id = other.id
                                    nearest_dist = 0.0
                                    break

                if is_crashed:
                    confirmed_crashed_ids.add(cid)
                    if nearest_id is not None:
                        confirmed_crashed_ids.add(nearest_id)
                        detected_crashes.append(f"Frame {start_frame+i}: Crash detected! ID {cid} (Score {anomaly_score:.1f}) hit ID {nearest_id}")

            # Store state
            last_positions[cid] = (cx, cy)
            last_velocities[cid] = curr_vel
            
            # Debug Info
            if anomaly_score > 2.0: # Log lower scores for debug
                frame_debug_info.append({
                    "ID": cid,
                    "Speed": f"{speed:.1f}",
                    "Decel": f"{decel_val:.1f}",
                    "AngleChg": f"{angle_change:.1f}",
                    "Score": f"{anomaly_score:.1f}",
                    "Nearest": f"{nearest_id} ({nearest_dist:.1f})" if nearest_id else "None",
                    "Crashed": "YES" if is_crashed else "NO"
                })

        # Visualization
        out = frame.copy()
        
        # Draw tracks
        for obj in tracked_objects:
            tx, ty = int(obj.estimate[0][0]), int(obj.estimate[0][1])
            
            color = (0, 255, 0) # Green (Normal)
            if obj.id in confirmed_crashed_ids:
                color = (0, 0, 255) # Red (Crashed)
            
            # Draw Box if available
            if obj.id in tracker_to_box:
                b = tracker_to_box[obj.id]
                cv2.rectangle(out, (int(b[0]), int(b[1])), (int(b[2]), int(b[3])), color, 2)
                if obj.id in confirmed_crashed_ids:
                    cv2.putText(out, "CRASH", (int(b[0]), int(b[1])-10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,0,255), 2)
            
            cv2.putText(out, f"ID:{obj.id}", (tx, ty), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
            
            # Draw Anomaly Score
            if obj.id in scores:
                sc = scores[obj.id]
                if sc > 5.0:
                    cv2.putText(out, f"{sc:.1f}", (tx, ty-15), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)

        # Convert BGR to RGB for Streamlit
        out_rgb = cv2.cvtColor(out, cv2.COLOR_BGR2RGB)
        frame_placeholder.image(out_rgb, channels="RGB", caption=f"Frame {start_frame+i}")
        
        if frame_debug_info:
             debug_placeholder.table(frame_debug_info)
        else:
             debug_placeholder.text("No anomalies detected.")

        status_placeholder.text(f"Processing frame {i+1}/{num_frames}...")
        progress_bar.progress((i + 1) / num_frames)
        
        time.sleep(PLAYBACK_DELAY)
        
    st.success("Processing Complete")
    for msg in detected_crashes:
        st.write(msg)
