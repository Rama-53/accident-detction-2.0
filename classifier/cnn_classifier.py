# classifier/cnn_classifier.py

import torch
from torchvision import transforms
from PIL import Image


class AccidentClassifier:
    def __init__(self, weights_path="classifier/my_model.pth"):
        print("[classifier] loading weights from:", weights_path)

        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        # Build the SAME model architecture used in training
        from torchvision.models import resnet18
        # weights=None because we load our own
        self.model = resnet18(weights=None)
        # Replace the final fully connected layer for 2 classes
        self.model.fc = torch.nn.Linear(512, 2)

        # Load state dict
        try:
            state = torch.load(weights_path, map_location=self.device)
            self.model.load_state_dict(state)
        except Exception as e:
            print(f"[classifier] ERROR loading weights: {e}")
            raise

        self.model.to(self.device)
        self.model.eval()

        # Standard ImageNet transforms are usually good, but ensure this matches training
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ])

        # Labels in the order trained
        self.idx_to_label = {
            0: "no_accident",
            1: "vehicle_collision",
        }

    @torch.inference_mode()
    def predict(self, pil_img: Image.Image):
        # Preprocess
        x = self.transform(pil_img).unsqueeze(0).to(self.device)
        
        # Forward pass
        logits = self.model(x)
        probs = torch.softmax(logits, dim=1)[0]

        # Get result
        class_idx = int(torch.argmax(probs))
        confidence = float(probs[class_idx])
        label = self.idx_to_label.get(class_idx, "unknown")

        # Determine severity based on confidence (heuristic)
        if label == "vehicle_collision":
            if confidence > 0.8:
                severity = "high"
            elif confidence > 0.5:
                severity = "medium"
            else:
                severity = "low"
        else:
            severity = "low"

        return {
            "label": label,
            "severity": severity,
            "confidence": confidence,
        }
