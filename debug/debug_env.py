import sys
import os

print(f"Python Executable: {sys.executable}")
print(f"CWD: {os.getcwd()}")
print("sys.path:")
for p in sys.path:
    print(f"  {p}")

try:
    import cv2
    print(f"cv2: {cv2.__file__}")
except ImportError as e:
    print(f"cv2: MISSING ({e})")

try:
    import easyocr
    print(f"easyocr: {easyocr.__file__}")
except ImportError as e:
    print(f"easyocr: MISSING ({e})")
