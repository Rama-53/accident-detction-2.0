# classifier/cnn_classifier.py

import torch
from torchvision import transforms
from PIL import Image


class PlaceholderClassifier:   # keep this name
    def __init__(self, weights_path="classifier/my_model.pth"):
        print("[classifier] loading weights from:", weights_path)

        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        # TODO: build the SAME model architecture you used in training

        from torchvision.models import resnet18   # example
        self.model = resnet18(weights=None)
        self.model.fc = torch.nn.Linear(512, 2)   # <-- num_classes

        state = torch.load(weights_path, map_location=self.device)
        self.model.load_state_dict(state)
        self.model.to(self.device)
        self.model.eval()

        # TODO: use your training transforms
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ])

        # TODO: labels in the order you trained
        self.idx_to_label = {
            0: "no_accident",
            1: "vehicle_collision",
        }

    @torch.inference_mode()
    def predict(self, pil_img: Image.Image):
        x = self.transform(pil_img).unsqueeze(0).to(self.device)
        logits = self.model(x)
        probs = torch.softmax(logits, dim=1)[0]

        class_idx = int(torch.argmax(probs))
        confidence = float(probs[class_idx])
        label = self.idx_to_label.get(class_idx, "unknown")

        if label == "vehicle_collision":
            severity = "high" if confidence > 0.8 else "medium" if confidence > 0.5 else "low"
        else:
            severity = "low"

        return {
            "label": label,
            "severity": severity,
            "confidence": confidence,
        }
