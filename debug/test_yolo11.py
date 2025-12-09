from ultralytics import YOLO
import sys

try:
    print("Attempting to load YOLOv11n...")
    model = YOLO("yolo11n.pt")
    print("Successfully loaded YOLOv11n")
    print("Model info:", model.info())
except Exception as e:
    print(f"Failed to load YOLOv11n: {e}")
    sys.exit(1)
