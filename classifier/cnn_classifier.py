import os
import numpy as np
import tensorflow as tf
from PIL import Image

class AccidentClassifier:
    def __init__(self, model_path=None):
        if model_path is None:
            # Default to 'accidents.keras' in the same directory
            current_dir = os.path.dirname(os.path.abspath(__file__))
            model_path = os.path.join(current_dir, "accidents.keras")
            
        print(f"[AccidentClassifier] Loading Keras model from {model_path}...")
        try:
            self.model = tf.keras.models.load_model(model_path)
            print("[AccidentClassifier] Model loaded successfully.")
        except Exception as e:
            print(f"[AccidentClassifier] ERROR loading model: {e}")
            raise e

        # Class mapping assumption: 
        # The model likely outputs probabilities for [Accident, No Accident] or similar.
        # We will assume a standard binary classification or verify output shape.
        # Common convention: 0 and 1. 
        # If the user's previous notebook used 'ImageDataGenerator', classes are usually sorted alphabetically.
        # "Accident" vs "No Accident" -> 0="Accident", 1="No Accident".
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
        img_array = tf.keras.preprocessing.image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        # img_array /= 255.0  # TRIAL: Removing normalization. Model might expect 0-255.

        # Predict
        predictions = self.model.predict(img_array, verbose=0)
        
        # Assume output is softmax or sigmoid.
        # specific handling for binary vs categorical
        if predictions.shape[1] == 1:
            # Binary sigmoid
            score = predictions[0][0]
            # If 0 is Accident, 1 is No Accident (based on alpha sort "Accident" < "No Accident")
            # Then score < 0.5 is Accident? Or if "Accident" is class 1?
            # Usually Keras 'flow_from_directory' maps alphabetically:
            # 0: Accident
            # 1: No Accident
            # So if model output (1 unit) is probability of class 1 ("No Accident"):
            # Prob(Accident) = 1 - score
            confidence = 1.0 - score
            idx = 0 if score < 0.5 else 1
        else:
            # Softmax [Prob(Accident), Prob(No Accident)]
            probs = predictions[0]
            idx = np.argmax(probs)
            confidence = float(np.max(probs))

        label = self.classes[idx]
        
        # Map to system expectation
        # The system expects 'vehicle_collision' for accidents to trigger alerts
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
