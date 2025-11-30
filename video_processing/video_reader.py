"""
video_processing/video_reader.py
Simple video reader that yields frames and metadata.
"""
import cv2
from typing import Iterator, Tuple

class VideoReader:
    def __init__(self, source=0, resize_to=None):
        """source: path or webcam index; resize_to: (w,h) tuple or None."""
        self.source = source
        self.resize_to = resize_to
        self.cap = None

    def __enter__(self):
        self.cap = cv2.VideoCapture(self.source)
        if not self.cap.isOpened():
            raise RuntimeError(f"Cannot open video source: {self.source}")
        return self

    def __exit__(self, exc_type, exc, tb):
        if self.cap:
            self.cap.release()

    def frames(self) -> Iterator[Tuple[int, any]]:
        idx = 0
        while True:
            ret, frame = self.cap.read()
            if not ret:
                break
            idx += 1
            if self.resize_to:
                frame = cv2.resize(frame, self.resize_to)
            yield idx, frame
