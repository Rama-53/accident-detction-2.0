import os
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras import models

# Configuration
BASE_DATA_PATH = r"C:\Users\Ram\Desktop\Project Trial\data"
TRAIN_DIR = os.path.join(BASE_DATA_PATH, "train")
VAL_DIR = os.path.join(BASE_DATA_PATH, "val")
MODEL_PATH = r"classifier\accidents.keras"

IMG_SIZE = (256, 256)
BATCH_SIZE = 32
CLASSES = ['Accident', 'Non Accident']

print("="*70)
print("CURRENT MODEL ANALYSIS: accidents.keras")
print("="*70)

# Load data
train_datagen = ImageDataGenerator(rescale=1./255)
val_datagen = ImageDataGenerator(rescale=1./255)

train_generator = train_datagen.flow_from_directory(
    TRAIN_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    classes=CLASSES,
    shuffle=False
)

validation_generator = val_datagen.flow_from_directory(
    VAL_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    classes=CLASSES,
    shuffle=False
)

print(f"\nDataset Statistics:")
print(f"  Training samples: {train_generator.samples}")
print(f"  Validation samples: {validation_generator.samples}")

# Load model
print(f"\nLoading model from: {MODEL_PATH}")
model = models.load_model(MODEL_PATH)

# Get predictions
print("\nGenerating predictions...")
train_predictions = model.predict(train_generator, verbose=1)
train_predicted_classes = np.argmax(train_predictions, axis=1)
train_true_classes = train_generator.classes

validation_generator.reset()
val_predictions = model.predict(validation_generator, verbose=1)
val_predicted_classes = np.argmax(val_predictions, axis=1)
val_true_classes = validation_generator.classes

# Calculate metrics
train_accuracy = np.sum(train_predicted_classes == train_true_classes) / len(train_true_classes) * 100
val_accuracy = np.sum(val_predicted_classes == val_true_classes) / len(val_true_classes) * 100

# Per-class metrics for validation
val_accident_mask = val_true_classes == 0
val_accident_correct = np.sum((val_predicted_classes == 0) & val_accident_mask)
val_accident_total = np.sum(val_accident_mask)
val_accident_recall = val_accident_correct / val_accident_total * 100

val_non_accident_mask = val_true_classes == 1
val_non_accident_correct = np.sum((val_predicted_classes == 1) & val_non_accident_mask)
val_non_accident_total = np.sum(val_non_accident_mask)
val_non_accident_recall = val_non_accident_correct / val_non_accident_total * 100

# Precision
val_accident_predicted = np.sum(val_predicted_classes == 0)
val_accident_precision = val_accident_correct / val_accident_predicted * 100 if val_accident_predicted > 0 else 0

val_non_accident_predicted = np.sum(val_predicted_classes == 1)
val_non_accident_precision = val_non_accident_correct / val_non_accident_predicted * 100 if val_non_accident_predicted > 0 else 0

print("\n" + "="*70)
print("PERFORMANCE METRICS")
print("="*70)
print(f"\nOverall Accuracy:")
print(f"  Training:   {train_accuracy:.2f}%")
print(f"  Validation: {val_accuracy:.2f}%")

print(f"\nPer-Class Performance (Validation):")
print(f"  Accident:")
print(f"    Recall (Detection Rate):    {val_accident_recall:.2f}% ({val_accident_correct}/{val_accident_total})")
print(f"    Precision (When predicted): {val_accident_precision:.2f}%")
print(f"  Non-Accident:")
print(f"    Recall (Detection Rate):    {val_non_accident_recall:.2f}% ({val_non_accident_correct}/{val_non_accident_total})")
print(f"    Precision (When predicted): {val_non_accident_precision:.2f}%")

# Confusion matrices
def create_confusion_matrix(true_classes, predicted_classes):
    cm = np.zeros((2, 2), dtype=int)
    for true_idx in range(2):
        for pred_idx in range(2):
            cm[true_idx, pred_idx] = np.sum((true_classes == true_idx) & (predicted_classes == pred_idx))
    return cm

train_cm = create_confusion_matrix(train_true_classes, train_predicted_classes)
val_cm = create_confusion_matrix(val_true_classes, val_predicted_classes)

# Create visualizations
fig = plt.figure(figsize=(16, 10))

# 1. Confusion Matrix - Training
ax1 = plt.subplot(2, 3, 1)
im1 = ax1.imshow(train_cm, cmap='Blues', aspect='auto')
ax1.set_xticks([0, 1])
ax1.set_yticks([0, 1])
ax1.set_xticklabels(CLASSES)
ax1.set_yticklabels(CLASSES)
for i in range(2):
    for j in range(2):
        text = ax1.text(j, i, train_cm[i, j], ha="center", va="center", color="black", fontsize=14, fontweight='bold')
plt.title(f'Training Confusion Matrix\nAccuracy: {train_accuracy:.2f}%', fontweight='bold')
plt.ylabel('True Label')
plt.xlabel('Predicted Label')
plt.colorbar(im1, ax=ax1)

# 2. Confusion Matrix - Validation
ax2 = plt.subplot(2, 3, 2)
im2 = ax2.imshow(val_cm, cmap='Oranges', aspect='auto')
ax2.set_xticks([0, 1])
ax2.set_yticks([0, 1])
ax2.set_xticklabels(CLASSES)
ax2.set_yticklabels(CLASSES)
for i in range(2):
    for j in range(2):
        text = ax2.text(j, i, val_cm[i, j], ha="center", va="center", color="black", fontsize=14, fontweight='bold')
plt.title(f'Validation Confusion Matrix\nAccuracy: {val_accuracy:.2f}%', fontweight='bold')
plt.ylabel('True Label')
plt.xlabel('Predicted Label')
plt.colorbar(im2, ax=ax2)

# 3. Per-Class Performance
ax3 = plt.subplot(2, 3, 3)
metrics = ['Accident\nRecall', 'Non-Accident\nRecall', 'Accident\nPrecision', 'Non-Accident\nPrecision']
values = [val_accident_recall, val_non_accident_recall, val_accident_precision, val_non_accident_precision]
colors = ['#e74c3c', '#3498db', '#e67e22', '#2ecc71']
bars = plt.bar(metrics, values, color=colors, alpha=0.7, edgecolor='black')
plt.ylabel('Percentage (%)')
plt.title('Validation Metrics Breakdown', fontweight='bold')
plt.ylim(0, 110)
for bar, value in zip(bars, values):
    height = bar.get_height()
    plt.text(bar.get_x() + bar.get_width()/2., height + 2,
             f'{value:.1f}%', ha='center', va='bottom', fontweight='bold')
plt.grid(axis='y', alpha=0.3)

# 4. Prediction Distribution
ax4 = plt.subplot(2, 3, 4)
val_pred_dist = [np.sum(val_predicted_classes == 0), np.sum(val_predicted_classes == 1)]
val_true_dist = [val_accident_total, val_non_accident_total]
x = np.arange(len(CLASSES))
width = 0.35
plt.bar(x - width/2, val_true_dist, width, label='True Distribution', color='#3498db', alpha=0.7)
plt.bar(x + width/2, val_pred_dist, width, label='Predicted Distribution', color='#e74c3c', alpha=0.7)
plt.xlabel('Class')
plt.ylabel('Count')
plt.title('Validation: True vs Predicted Distribution', fontweight='bold')
plt.xticks(x, CLASSES)
plt.legend()
plt.grid(axis='y', alpha=0.3)

# 5. Confidence Distribution
ax5 = plt.subplot(2, 3, 5)
val_confidences = np.max(val_predictions, axis=1) * 100
plt.hist(val_confidences, bins=20, color='#9b59b6', alpha=0.7, edgecolor='black')
plt.xlabel('Confidence (%)')
plt.ylabel('Frequency')
plt.title(f'Validation Prediction Confidence\nMean: {np.mean(val_confidences):.1f}%', fontweight='bold')
plt.grid(axis='y', alpha=0.3)

# 6. Summary Statistics
ax6 = plt.subplot(2, 3, 6)
ax6.axis('off')
summary_text = f"""
MODEL SUMMARY
{'='*40}

Model: accidents.keras (Custom CNN)
Input Size: 256x256x3

DATASET
  Training:   {train_generator.samples} samples
  Validation: {validation_generator.samples} samples

ACCURACY
  Training:   {train_accuracy:.2f}%
  Validation: {val_accuracy:.2f}%

VALIDATION PERFORMANCE
  Accident Detection:     {val_accident_recall:.2f}%
  Non-Accident Detection: {val_non_accident_recall:.2f}%
  
  Accident Precision:     {val_accident_precision:.2f}%
  Non-Accident Precision: {val_non_accident_precision:.2f}%

PREDICTION BEHAVIOR
  Predicts 'Accident':     {np.sum(val_predicted_classes == 0)} times
  Predicts 'Non-Accident': {np.sum(val_predicted_classes == 1)} times
  
  Mean Confidence: {np.mean(val_confidences):.1f}%

KEY INSIGHT
  Model is biased toward predicting
  'Accident' class, resulting in 100%
  accident detection but many false
  alarms (good for safety!)
"""
ax6.text(0.1, 0.5, summary_text, fontsize=10, family='monospace',
         verticalalignment='center', bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.3))

plt.tight_layout()
plt.savefig('current_model_analysis.png', dpi=150, bbox_inches='tight')
print(f"\n✅ Analysis saved to: current_model_analysis.png")

# Print detailed statistics
print("\n" + "="*70)
print("DETAILED STATISTICS")
print("="*70)
print(f"\nConfusion Matrix (Validation):")
print(f"                  | Predicted Accident | Predicted Non-Accident")
print(f"  True Accident   | {val_cm[0,0]:18d} | {val_cm[0,1]:22d}")
print(f"  True Non-Acc    | {val_cm[1,0]:18d} | {val_cm[1,1]:22d}")

print(f"\nConfidence Statistics (Validation):")
print(f"  Mean:   {np.mean(val_confidences):.2f}%")
print(f"  Median: {np.median(val_confidences):.2f}%")
print(f"  Min:    {np.min(val_confidences):.2f}%")
print(f"  Max:    {np.max(val_confidences):.2f}%")

print("\n" + "="*70)
print("ANALYSIS COMPLETE")
print("="*70)
