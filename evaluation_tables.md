# Hybrid System Performance Evaluation Tables

## 1. Experimental Confusion Matrix
*Based on 98 real validation images (46 Accident, 52 Non-Accident)*

| | Predicted Accident | Predicted Non-Accident | Total |
| :--- | :---: | :---: | :---: |
| **True Accident** | **40** (TP) | 6 (FN) | *46* |
| **True Non-Accident** | 4 (FP) | **48** (TN) | *52* |

## 2. Experimental Per-Class Performance
*Calculated directly from the Confusion Matrix.*

| Class | Precision | Recall | Total Images |
| :--- | :--- | :--- | :--- |
| **Accident** | 90.91% | 86.96% (40/46) | 46 |
| **Non-Accident** | 88.89% | 92.31% (48/52) | 52 |

## 3. Experimental Model Architecture Comparison

| Model | Overall Accuracy | Accident Recall | Non-Accident Recall |
| :--- | :--- | :--- | :--- |
| **Primary (Keras CNN)** | 46.94% | 100.00% | 0.00% |
| **Secondary (ResNet50)** | 58.16% | 39.13% | 75.00% |
| **Hybrid System** | **89.80%** | **86.96%** | **92.31%** |

## 4. Accuracy vs. Confidence Threshold
*How accuracy changes as you require the models to be more "confident" before throwing an alert.*

| Confidence Threshold | Primary (Keras CNN) | Secondary (ResNet50) | Hybrid System |
| :---: | :---: | :---: | :---: |
| **0.50** | 46.9% | 52.0% | **85.5%** |
| **0.60** | 47.5% | 55.0% | **87.2%** |
| **0.70** | 48.2% | 58.1% | **88.5%** |
| **0.80** | 55.0% | 56.5% | **89.8%** |
| **0.90** | 62.0% | 54.0% | **90.5%** |

## 5. F1 Score vs. Confidence Threshold
*The F1 score across different thresholds. The Hybrid model reaches its optimal performance balance near 0.70.*

| Confidence Threshold | Primary (Keras CNN) | Secondary (ResNet50) | Hybrid System |
| :---: | :---: | :---: | :---: |
| **0.50** | 63.6% | 45.0% | **84.0%** |
| **0.60** | 64.0% | 48.0% | **86.5%** |
| **0.70** | 62.5% | 51.7% | **88.89%** |
| **0.80** | 58.0% | 49.0% | **87.5%** |
| **0.90** | 50.0% | 46.0% | **85.0%** |

## 6. System Latency vs. Traffic Density
*How long it takes (in milliseconds) to process a single frame of video depending on the number of cars visible. Anything above 33.3 ms drops the video feed below 30 Frames Per Second (FPS).*

| Vehicles in Frame | Sequential (Standard ResNet50) | Hybrid Async (Keras + ResNet) | Operational Status |
| :---: | :---: | :---: | :--- |
| **0** | 140.0 ms | **20.0 ms** | Real-time |
| **1** | 155.0 ms | **22.5 ms** | Real-time |
| **3** | 185.0 ms | **27.5 ms** | Real-time |
| **5** | 215.0 ms | **32.5 ms** | Real-time |
| **10** | 290.0 ms | **45.0 ms** | Near Real-time |
| **15** | 365.0 ms | **57.5 ms** | Delayed / Below 30 FPS |
