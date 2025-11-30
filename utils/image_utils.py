"""
utils/image_utils.py
Utilities for image conversion and I/O used across modules.
"""
import base64
import io
from PIL import Image
import numpy as np


def b64_to_pil(b64str: str) -> Image.Image:
    data = base64.b64decode(b64str)
    return Image.open(io.BytesIO(data)).convert('RGB')


def pil_to_b64(pil_img: Image.Image, fmt='JPEG', quality=85) -> str:
    buf = io.BytesIO()
    pil_img.save(buf, format=fmt, quality=quality)
    b = buf.getvalue()
    return base64.b64encode(b).decode('ascii')


def npbgr_to_pil(img_np):
    # img_np is OpenCV BGR image
    import cv2
    rgb = cv2.cvtColor(img_np, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb)
