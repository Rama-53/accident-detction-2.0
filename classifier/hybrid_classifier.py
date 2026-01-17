import os
# Force Keras to use Torch backend for GPU support on Windows
os.environ["KERAS_BACKEND"] = "torch"

import numpy as np
import keras
import torch
from PIL import Image

class HybridAccidentClassifier:
    """
    Hybrid classifier using two models:
    1. accidents.keras - High recall (catches all accidents, many false alarms)
    2. resnet50_phase2_best.keras - Better precision (fewer false alarms)
    
    Strategy: Use model 1 as primary detector, model 2 to filter false alarms
    """
    
    Strategy: Use model 1 as primary detector, model 2 to filter false alarms
    """
    
    def __init__(self, primary_model_path=None, secondary_model_path=None):
        # --- MONKEY PATCH FIX ---
        # Robustly handle 'quantization_config' error by patching Dense globally.
        # This works even if Keras deserialization bypasses custom objects.
        try:
            original_dense_init = keras.layers.Dense.__init__
            def patched_dense_init(self, *args, **kwargs):
                if 'quantization_config' in kwargs:
                    kwargs.pop('quantization_config')
                original_dense_init(self, *args, **kwargs)
            keras.layers.Dense.__init__ = patched_dense_init
            print("[HybridClassifier] Applied global patch to keras.layers.Dense")
        except Exception as e:
            print(f"[HybridClassifier] Warning: Failed to patch Dense: {e}")

        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Primary model: accidents.keras (catches everything)
        if primary_model_path is None:
            primary_model_path = os.path.join(current_dir, "accidents.keras")
        
        # Secondary model: ResNet50 (better accuracy)
        if secondary_model_path is None:
            # Look for model in the same directory as primary model
            secondary_model_path = os.path.join(current_dir, "resnet50_phase2_best.keras")
            
        print(f"[HybridClassifier] Initializing dual-model system...")
        print(f"[HybridClassifier] Primary (Safety): {primary_model_path}")
        print(f"[HybridClassifier] Secondary (Accuracy): {secondary_model_path}")
        
        # GPU Check
        if torch.cuda.is_available():
            n_gpu = torch.cuda.device_count()
            print(f"[HybridClassifier] GPU Detected: {n_gpu} device(s)")
            for i in range(n_gpu):
                print(f" - {torch.cuda.get_device_name(i)}")
        else:
            print("[HybridClassifier] WARNING: No GPU detected. Running on CPU.")

        # Load primary model (accidents.keras)
        try:
            print("[HybridClassifier] Loading primary model (accidents.keras)...")
        try:
            print("[HybridClassifier] Loading primary model (accidents.keras)...")
            self.primary_model = keras.models.load_model(primary_model_path)
            self.primary_img_size = (256, 256)  # accidents.keras uses 256x256
            print("[HybridClassifier] ✓ Primary model loaded")
        except Exception as e:
            print(f"[HybridClassifier] ERROR loading primary model: {e}")
            raise e

        # Load secondary model (ResNet50)
        try:
            print("[HybridClassifier] Loading secondary model (ResNet50)...")
            # Load with custom objects for focal loss
            import tensorflow.keras.backend as K
            
            def focal_loss(gamma=2.0, alpha=0.75):
                def loss_fn(y_true, y_pred):
                    epsilon = K.epsilon()
                    y_pred = K.clip(y_pred, epsilon, 1.0 - epsilon)
                    cross_entropy = -y_true * K.log(y_pred)
                    weight = alpha * K.pow(1 - y_pred, gamma)
                    return K.sum(weight * cross_entropy, axis=-1)
                return loss_fn
            
            self.secondary_model = keras.models.load_model(
                secondary_model_path,
                custom_objects={'loss_fn': focal_loss(gamma=2.0, alpha=0.75)}
            )
            self.secondary_img_size = (224, 224)  # ResNet50 uses 224x224
            print("[HybridClassifier] ✓ Secondary model loaded")
        except Exception as e:
            print(f"[HybridClassifier] WARNING: Could not load secondary model: {e}")
            print("[HybridClassifier] Falling back to primary model only")
            self.secondary_model = None

        # Warmup
        try:
            dummy_primary = np.zeros((1, 256, 256, 3), dtype=np.float32)
            self.primary_model.predict(dummy_primary, verbose=0)
            
            if self.secondary_model:
                dummy_secondary = np.zeros((1, 224, 224, 3), dtype=np.float32)
                self.secondary_model.predict(dummy_secondary, verbose=0)
            
            print("[HybridClassifier] Warmup complete")
        except Exception as e:
            print(f"[HybridClassifier] Warmup failed: {e}")

        self.classes = ["Accident", "No Accident"]

    def predict(self, pil_img: Image.Image):
        """
        Hybrid prediction using both models.
        Returns dict with label, severity, confidence, and model agreement info.
        """
        if pil_img.mode != "RGB":
            pil_img = pil_img.convert("RGB")

        # Get prediction from primary model (accidents.keras)
        primary_result = self._predict_primary(pil_img)
        
        # If secondary model is not available, return primary result
        if self.secondary_model is None:
            return primary_result
        
        # Get prediction from secondary model (ResNet50)
        secondary_result = self._predict_secondary(pil_img)
        
        # Combine predictions
        return self._combine_predictions(primary_result, secondary_result)

    def _predict_primary(self, pil_img):
        """Predict using primary model (accidents.keras)"""
        img = pil_img.resize(self.primary_img_size)
        
        try:
            from keras.preprocessing.image import img_to_array
        except ImportError:
            from keras.utils import img_to_array

        img_array = img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        
        predictions = self.primary_model.predict(img_array, verbose=0)
        
        if hasattr(predictions, "numpy"):
            predictions = predictions.numpy()
        
        if predictions.shape[1] == 1:
            score = predictions[0][0]
            confidence = 1.0 - score
            idx = 0 if score < 0.5 else 1
        else:
            probs = predictions[0]
            idx = np.argmax(probs)
            confidence = float(np.max(probs))

        label = self.classes[idx]
        return {
            "label": label,
            "confidence": confidence,
            "is_accident": (label == "Accident")
        }

    def _predict_secondary(self, pil_img):
        """Predict using secondary model (ResNet50)"""
        img = pil_img.resize(self.secondary_img_size)
        
        try:
            from keras.preprocessing.image import img_to_array
        except ImportError:
            from keras.utils import img_to_array

        img_array = img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        img_array /= 255.0  # ResNet50 expects normalized input
        
        predictions = self.secondary_model.predict(img_array, verbose=0)
        
        if hasattr(predictions, "numpy"):
            predictions = predictions.numpy()
        
        probs = predictions[0]
        idx = np.argmax(probs)
        confidence = float(np.max(probs))
        label = self.classes[idx]
        
        return {
            "label": label,
            "confidence": confidence,
            "is_accident": (label == "Accident")
        }

    def _combine_predictions(self, primary, secondary):
        """
        Combine predictions from both models.
        
        Strategy:
        - If primary says "No Accident" -> Trust it (unlikely, but respect it)
        - If primary says "Accident":
          - If secondary agrees -> HIGH confidence (likely real accident)
          - If secondary disagrees -> MEDIUM confidence (possible false alarm)
        """
        # Both models agree it's NOT an accident (rare with current model)
        if not primary["is_accident"] and not secondary["is_accident"]:
            return {
                "label": "non_accident",
                "severity": "low",
                "confidence": (primary["confidence"] + secondary["confidence"]) / 2,
                "raw_label": "No Accident",
                "note": "Both models agree: No Accident",
                "model_agreement": "BOTH_NO_ACCIDENT",
                "primary_confidence": primary["confidence"],
                "secondary_confidence": secondary["confidence"]
            }
        
        # Both models agree it's an accident
        if primary["is_accident"] and secondary["is_accident"]:
            avg_confidence = (primary["confidence"] + secondary["confidence"]) / 2
            return {
                "label": "vehicle_collision",
                "severity": "high" if avg_confidence > 0.7 else "medium",
                "confidence": avg_confidence,
                "raw_label": "Accident",
                "note": f"Both models agree: Accident (Primary: {primary['confidence']:.2f}, Secondary: {secondary['confidence']:.2f})",
                "model_agreement": "BOTH_ACCIDENT",
                "primary_confidence": primary["confidence"],
                "secondary_confidence": secondary["confidence"]
            }
        
        # Primary says accident, secondary says no accident (likely false alarm)
        if primary["is_accident"] and not secondary["is_accident"]:
            return {
                "label": "vehicle_collision",
                "severity": "medium",  # Lower severity for disagreement
                "confidence": primary["confidence"] * 0.6,  # Reduce confidence
                "raw_label": "Accident (Uncertain)",
                "note": f"Models disagree - Primary: Accident ({primary['confidence']:.2f}), Secondary: No Accident ({secondary['confidence']:.2f})",
                "model_agreement": "DISAGREEMENT",
                "primary_confidence": primary["confidence"],
                "secondary_confidence": secondary["confidence"]
            }
        
        # Primary says no accident, secondary says accident (very rare)
        # Trust primary since it has 100% recall
        return {
            "label": "non_accident",
            "severity": "low",
            "confidence": primary["confidence"],
            "raw_label": "No Accident",
            "note": f"Primary model (safety-first) says No Accident",
            "model_agreement": "PRIMARY_NO_ACCIDENT",
            "primary_confidence": primary["confidence"],
            "secondary_confidence": secondary["confidence"]
        }

if __name__ == "__main__":
    # Test block
    print("Testing HybridAccidentClassifier...")
    try:
        clf = HybridAccidentClassifier()
        dummy = Image.new('RGB', (224, 224), color='red')
        res = clf.predict(dummy)
        print("Result:", res)
    except Exception as e:
        print("Test failed:", e)
