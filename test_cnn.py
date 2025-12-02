
import torch
from PIL import Image
from classifier.cnn_classifier import AccidentClassifier

def test_classifier():
    print("Initializing classifier...")
    try:
        classifier = AccidentClassifier()
        print("Classifier initialized successfully.")
    except Exception as e:
        print(f"Failed to initialize classifier: {e}")
        return

    # Create a dummy image (black square)
    print("Creating dummy image...")
    img = Image.new('RGB', (224, 224), color = 'black')

    print("Running prediction...")
    try:
        result = classifier.predict(img)
        print("Prediction result:", result)
        
        expected_keys = ["label", "severity", "confidence"]
        if all(k in result for k in expected_keys):
            print("Verification PASSED: Output format is correct.")
        else:
            print(f"Verification FAILED: Missing keys. Got {list(result.keys())}")
            
    except Exception as e:
        print(f"Prediction failed: {e}")

if __name__ == "__main__":
    test_classifier()
