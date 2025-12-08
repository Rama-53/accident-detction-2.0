try:
    import pandas
    print("pandas: OK")
except ImportError:
    print("pandas: MISSING")

try:
    import easyocr
    print("easyocr: OK")
except ImportError:
    print("easyocr: MISSING")

try:
    from ultralytics import YOLO
    print("ultralytics: OK")
except ImportError:
    print("ultralytics: MISSING")
