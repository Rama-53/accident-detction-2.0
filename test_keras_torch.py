import os
os.environ["KERAS_BACKEND"] = "torch"
import keras
import torch

print(f"Keras version: {keras.__version__}")
print(f"Backend: {keras.backend.backend()}")
print(f"Torch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")

try:
    # Try loading the model with Torch backend
    model_path = r"c:\Users\Ram\Desktop\Project Trial\accident-detction-2.0\classifier\accidents.keras"
    model = keras.models.load_model(model_path)
    print("Model loaded successfully with Torch backend!")
    
    # Inference test
    import numpy as np
    dummy = np.zeros((1, 256, 256, 3), dtype=np.float32)
    # Keras 3 with Torch backend accepts tensors or numpy
    # Move to GPU if possible? Keras handles placement usually or we use predictions
    pred = model.predict(dummy, verbose=0)
    print("Inference successful!")
    print("Prediction shape:", pred.shape)
except Exception as e:
    print(f"Failed to load/run model: {e}")
