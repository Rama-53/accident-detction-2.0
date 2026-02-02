# System Model Architecture

The Accident Detection System employs a pipeline of three distinct neural networks, verified from the deployed model files.

## 1. Object Detection: YOLOv11s (Small)
**Role**: Real-time object detection and region proposal.
**Model File**: `yolo11s.pt`
**Framework**: Ultralytics YOLO.
**Function**: Detects vehicles to generate Region of Interest (ROI) crops for the classifiers.

---

## 2. Primary Classifier: Custom CNN (High Recall)
**Role**: Initial Streaming / Screening.
**Model File**: `accidents.keras`
**Input Shape**: 256x256x3

### Exact Layer Configuration
This model uses a lightweight 3-block architecture optimized for speed and high sensitivity.

| Layer Type | Output Shape | Parameters | Configuration |
| :--- | :--- | :--- | :--- |
| **Conv2D** | (254, 254, 16) | 448 | **16 Filters**, 3x3 Kernel, No Padding |
| **MaxPooling2D** | (127, 127, 16) | 0 | 2x2 Pooling |
| **Conv2D** | (125, 125, 32) | 4,640 | **32 Filters**, 3x3 Kernel |
| **MaxPooling2D** | (62, 62, 32) | 0 | 2x2 Pooling |
| **Conv2D** | (60, 60, 16) | 4,624 | **16 Filters**, 3x3 Kernel |
| **MaxPooling2D** | (30, 30, 16) | 0 | 2x2 Pooling |
| **Flatten** | (14400) | 0 | - |
| **Dense** | (256) | 3,686,656 | **256 Neurons** |
| **Dense (Output)** | (1) | 257 | **1 Neuron** (Sigmoid Activation) |

**Total Parameters**: 3,696,625 (14.10 MB)

---

## 3. Secondary Classifier: ResNet50 (High Precision)
**Role**: Verification / False Alarm Filtering.
**Model File**: `resnet50_phase2_best.keras`
**Input Shape**: 224x224x3

### Architecture Breakdown
This models employs a Transfer Learning approach using a **ResNet50** backbone with a custom, heavy classification head.

#### Backbone: ResNet50
*   Standard ResNet50 architecture with 5 stages of Convolutional and Residual Blocks.
*   Uses Skip Connections (Identity Mappings) to train deep features effectively.

#### Custom Classification Head (Top Layers)
After the ResNet base, the model uses a sophisticated head for fine-tuned classification:

| Layer Type | Output Shape | Configuration |
| :--- | :--- | :--- |
| **GlobalAvgPooling2D** | (2048) | Condenses feature maps |
| **BatchNormalization** | (2048) | Normalizes activations |
| **Dropout** | (2048) | Regularization |
| **Dense** | (512) | **512 Neurons** |
| **BatchNormalization** | (512) | Normalizes activations |
| **Dropout** | (512) | Regularization |
| **Dense** | (256) | **256 Neurons** |
| **Dropout** | (256) | Regularization |
| **Dense (Output)** | (2) | **2 Neurons** (Softmax: Accident, Non-Accident) |

**Total Parameters**: 67,764,360 (258.50 MB)
**Trainable Parameters**: 21,492,738 (82.0 MB) - Indicates large portions of ResNet50 were frozen or fine-tuned.
