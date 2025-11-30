"""
classifier/cnn_classifier.py
A small wrapper around your CNN model. Replace load_model() with your actual model-loading code.
"""
import numpy as np
from PIL import Image

class SimpleCNNClassifier:
    def __init__(self, model_path=None):
        # TODO: load your real model here (PyTorch / TF). This is a placeholder.
        self.model_path = model_path
        self.model = None
        if model_path:
            self.load_model(model_path)

    def load_model(self, path):
        # Replace with your model loading logic
        print(f"[classifier] (placeholder) would load model from: {path}")
        self.model = "dummy"

    def preprocess(self, pil_img: Image.Image, size=(224,224)) -> np.ndarray:
        img = pil_img.resize(size).convert('RGB')
        arr = np.array(img).astype('float32') / 255.0
        # shape (H,W,3) -> (1,3,H,W) for PyTorch or (1,H,W,3) for TF depending on your model
        return arr

    def predict(self, pil_img: Image.Image):
        # Replace with model inference
        # For now, simple heuristic: return dummy label + severity based on area
        w,h = pil_img.size
        area = w*h
        if area > 200*200:
            severity = 'high'
        elif area > 100*100:
            severity = 'medium'
        else:
            severity = 'low'
        return {"label": "vehicle_collision", "severity": severity, "confidence": 0.5}

# convenience function
def classify_pil_images(pil_images, classifier: SimpleCNNClassifier):
    results = []
    for img in pil_images:
        results.append(classifier.predict(img))
    return results
