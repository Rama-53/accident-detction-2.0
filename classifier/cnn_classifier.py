import os
# Force Keras to use Torch backend for GPU support on Windows
os.environ["KERAS_BACKEND"] = "torch"

import numpy as np
import keras
import torch
from PIL import Image

class AccidentClassifier:
    def __init__(self, model_path=None):
        if model_path is None:
            # Default to 'accidents.keras' in the same directory
            current_dir = os.path.dirname(os.path.abspath(__file__))
            model_path = os.path.join(current_dir, "accidents.keras")
            
        print(f"[AccidentClassifier] Loading Keras model (Torch Backend) from {model_path}...")
        
        # GPU Check (Torch)
        if torch.cuda.is_available():
            n_gpu = torch.cuda.device_count()
            print(f"[AccidentClassifier] GPU Detected: {n_gpu} device(s). Inference will be accelerated.")
            for i in range(n_gpu):
                print(f" - {torch.cuda.get_device_name(i)}")
        else:
            print("[AccidentClassifier] WARNING: No GPU detected. Inference will run on CPU.")

        try:
            self.model = keras.models.load_model(model_path)
            print("[AccidentClassifier] Model loaded successfully.")
        except Exception as e:
            print(f"[AccidentClassifier] ERROR loading model: {e}")
            raise e

        # Warmup
        try:
            dummy = np.zeros((1, 256, 256, 3), dtype=np.float32)
            # Keras 3 prediction
            self.model.predict(dummy, verbose=0)
            print("[AccidentClassifier] Warmup complete.")
        except Exception as e:
            print(f"[AccidentClassifier] Warmup failed: {e}")
            # Try to continue even if warmup fails

        self.classes = ["Accident", "No Accident"]

    def predict(self, pil_img: Image.Image):
        """
        Predicts class for a PIL image.
        Returns dict with label, severity, confidence.
        """
        # Preprocessing
        if pil_img.mode != "RGB":
            pil_img = pil_img.convert("RGB")
            
        # Resize to 256x256 as determined by model inspection
        img = pil_img.resize((256, 256))
        
        # Keras 3 image utils
        try:
            from keras.preprocessing.image import img_to_array
        except ImportError:
            from keras.utils import img_to_array

        img_array = img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        # img_array /= 255.0  # TRIAL: Removing normalization. Model might expect 0-255.

        # Predict (Optimized for single image)
        # For Keras 3 + Torch, .predict() handles tensor conversion efficiently enough for now, 
        # or we can pass numpy.
        predictions = self.model.predict(img_array, verbose=0)
        
        # Predictions might be a tensor or numpy array depending on backend/config
        # Ensure numpy
        if hasattr(predictions, "numpy"):
             predictions = predictions.numpy()
        
        # Assume output is softmax or sigmoid.
        # specific handling for binary vs categorical
        if predictions.shape[1] == 1:
            # Binary sigmoid
            score = predictions[0][0]
            # If 0 is Accident, 1 is No Accident
            confidence = 1.0 - score
            idx = 0 if score < 0.5 else 1
        else:
            # Softmax [Prob(Accident), Prob(No Accident)]
            probs = predictions[0]
            idx = np.argmax(probs)
            confidence = float(np.max(probs))

        label = self.classes[idx]
        
        # Map to system expectation
        result_label = "vehicle_collision" if label == "Accident" else "non_accident"
        
        return {
            "label": result_label,
            "severity": "high" if confidence > 0.8 else "medium", # heuristic
            "confidence": float(confidence),
            "raw_label": label,
            "note": f"Model prediction: {label} ({confidence:.2f})"
        }

if __name__ == "__main__":
    # Test block
    print("Testing AccidentClassifier...")
    try:
        clf = AccidentClassifier()
        dummy = Image.new('RGB', (224, 224), color='red')
        res = clf.predict(dummy)
        print("Result:", res)
    except Exception as e:
        print("Test failed:", e)
