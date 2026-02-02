import time
import numpy as np
import os
import sys
from PIL import Image

# Add classifier folder to path
sys.path.insert(0, os.path.join(os.getcwd(), 'classifier'))

try:
    from hybrid_classifier import HybridAccidentClassifier
except ImportError:
    # Fallback if running from a different directory
    sys.path.insert(0, 'classifier')
    from hybrid_classifier import HybridAccidentClassifier

def measure_latency():
    print("Initializing Hybrid Classifier...")
    try:
        classifier = HybridAccidentClassifier()
    except Exception as e:
        print(f"Failed to initialize classifier: {e}")
        return

    # Create dummy image
    dummy_img = Image.new('RGB', (224, 224), color='red')
    
    # Warmup
    print("Warming up...")
    for _ in range(5):
        classifier.predict(dummy_img)
        
    iterations = 20
    print(f"Measuring latency over {iterations} iterations...")
    
    # Measure Primary Only
    # We can access internal methods _predict_primary
    
    start_time = time.time()
    for _ in range(iterations):
        classifier._predict_primary(dummy_img)
    end_time = time.time()
    avg_primary = (end_time - start_time) / iterations * 1000
    print(f"Primary Model (accidents.keras) Average Latency: {avg_primary:.2f} ms")
    
    # Measure Secondary Only
    if classifier.secondary_model:
        start_time = time.time()
        for _ in range(iterations):
            classifier._predict_secondary(dummy_img)
        end_time = time.time()
        avg_secondary = (end_time - start_time) / iterations * 1000
        print(f"Secondary Model (ResNet50) Average Latency: {avg_secondary:.2f} ms")
    else:
        print("Secondary model not loaded.")
        avg_secondary = 0
        
    # Measure Hybrid (End-to-End)
    start_time = time.time()
    for _ in range(iterations):
        classifier.predict(dummy_img)
    end_time = time.time()
    avg_hybrid = (end_time - start_time) / iterations * 1000
    print(f"Hybrid System Average Latency: {avg_hybrid:.2f} ms")
    
    return avg_primary, avg_secondary, avg_hybrid

if __name__ == "__main__":
    measure_latency()
