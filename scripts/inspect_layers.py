import os
import sys
import io

# Force CPU to avoid CUDA initialization issues just for inspection
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
os.environ["KERAS_BACKEND"] = "tensorflow" # Use tensorflow for inspection if possible, or torch

import keras
from keras import layers

def focal_loss(gamma=2.0, alpha=0.75):
    import tensorflow.keras.backend as K
    def loss_fn(y_true, y_pred):
        epsilon = K.epsilon()
        y_pred = K.clip(y_pred, epsilon, 1.0 - epsilon)
        cross_entropy = -y_true * K.log(y_pred)
        weight = alpha * K.pow(1 - y_pred, gamma)
        return K.sum(weight * cross_entropy, axis=-1)
    return loss_fn

def inspect_model(model_path, model_name):
    print(f"\n{'='*50}")
    print(f"INSPECTING: {model_name}")
    print(f"Path: {model_path}")
    print(f"{'='*50}")
    
    try:
        # Patch Dense for potential deserialization issues
        original_dense_init = keras.layers.Dense.__init__
        def patched_dense_init(self, *args, **kwargs):
            if 'quantization_config' in kwargs:
                kwargs.pop('quantization_config')
            original_dense_init(self, *args, **kwargs)
        keras.layers.Dense.__init__ = patched_dense_init

        # Load model
        # Try loading with custom objects just in case
        try:
            model = keras.models.load_model(model_path, custom_objects={'loss_fn': focal_loss()})
        except:
             # Fallback without custom objects
            model = keras.models.load_model(model_path)
            
        # Capture summary
        stream = io.StringIO()
        model.summary(print_fn=lambda x: stream.write(x + '\n'))
        summary_str = stream.getvalue()
        print(summary_str)
        
        # Also print detailed layer config for the first few layers to confirm filters
        print("\n--- Detailed Layer Config (First 5 layers) ---")
        for i, layer in enumerate(model.layers[:5]):
            print(f"{i}. {layer.name} ({layer.__class__.__name__})")
            if hasattr(layer, 'filters'):
                print(f"   Filters: {layer.filters}, Kernel: {layer.kernel_size}, Strides: {layer.strides}")
            if hasattr(layer, 'input_shape'):
                print(f"   Input: {layer.input_shape}")
            if hasattr(layer, 'output_shape'):
                print(f"   Output: {layer.output_shape}")
                
    except Exception as e:
        print(f"ERROR inspecting {model_name}: {e}")

if __name__ == "__main__":
    base_dir = r"C:\Users\Ram\Desktop\Project Trial\accident-detction-2.0"
    
    # Write to file
    with open("model_layers.txt", "w", encoding="utf-8") as f:
        # 1. Inspect Primary CNN
        primary_path = os.path.join(base_dir, "classifier", "accidents.keras")
        
        # Capture stdout to file
        sys.stdout = f
        inspect_model(primary_path, "Primary CNN (accidents.keras)")
        
        # 2. Inspect Secondary ResNet
        secondary_path = os.path.join(base_dir, "classifier", "resnet50_phase2_best.keras")
        inspect_model(secondary_path, "Secondary ResNet50")
        
    print("Done writing to model_layers.txt", file=sys.__stdout__)
