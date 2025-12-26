import os
import sys
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from PIL import Image

# Add classifier to path
sys.path.insert(0, 'classifier')
from hybrid_classifier import HybridAccidentClassifier

# Configuration
BASE_DATA_PATH = r"C:\Users\Ram\Desktop\Project Trial\data"
VAL_DIR = os.path.join(BASE_DATA_PATH, "val")
CLASSES = ['Accident', 'Non Accident']

print("="*70)
print("HYBRID CLASSIFIER EVALUATION")
print("="*70)

# Load hybrid classifier
clf = HybridAccidentClassifier()

# Load validation images
print("\nLoading validation images...")
val_images = []
val_labels = []

for class_idx, class_name in enumerate(CLASSES):
    class_dir = os.path.join(VAL_DIR, class_name)
    if not os.path.exists(class_dir):
        print(f"Warning: {class_dir} not found")
        continue
    
    image_files = [f for f in os.listdir(class_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    print(f"  {class_name}: {len(image_files)} images")
    
    for img_file in image_files:
        img_path = os.path.join(class_dir, img_file)
        try:
            img = Image.open(img_path)
            val_images.append(img)
            val_labels.append(class_idx)
        except Exception as e:
            print(f"Error loading {img_path}: {e}")

print(f"\nTotal validation images: {len(val_images)}")

# Make predictions
print("\nGenerating hybrid predictions...")
predictions = []
for i, img in enumerate(val_images):
    if (i + 1) % 10 == 0:
        print(f"  Processed {i+1}/{len(val_images)}...")
    pred = clf.predict(img)
    predictions.append(pred)

# Analyze results
print("\n" + "="*70)
print("RESULTS ANALYSIS")
print("="*70)

# Count predictions by agreement type
agreement_counts = {
    'BOTH_ACCIDENT': 0,
    'BOTH_NO_ACCIDENT': 0,
    'DISAGREEMENT': 0,
    'PRIMARY_NO_ACCIDENT': 0
}

for pred in predictions:
    agreement = pred.get('model_agreement', 'UNKNOWN')
    if agreement in agreement_counts:
        agreement_counts[agreement] += 1

print("\nModel Agreement Distribution:")
for agreement, count in agreement_counts.items():
    print(f"  {agreement}: {count} ({count/len(predictions)*100:.1f}%)")

# Calculate accuracy
predicted_labels = []
for pred in predictions:
    if pred['label'] == 'vehicle_collision':
        predicted_labels.append(0)  # Accident
    else:
        predicted_labels.append(1)  # Non-Accident

predicted_labels = np.array(predicted_labels)
true_labels = np.array(val_labels)

accuracy = np.sum(predicted_labels == true_labels) / len(true_labels) * 100

# Per-class metrics
accident_mask = true_labels == 0
accident_correct = np.sum((predicted_labels == 0) & accident_mask)
accident_total = np.sum(accident_mask)
accident_recall = accident_correct / accident_total * 100

non_accident_mask = true_labels == 1
non_accident_correct = np.sum((predicted_labels == 1) & non_accident_mask)
non_accident_total = np.sum(non_accident_mask)
non_accident_recall = non_accident_correct / non_accident_total * 100

# Precision
accident_predicted = np.sum(predicted_labels == 0)
accident_precision = accident_correct / accident_predicted * 100 if accident_predicted > 0 else 0

non_accident_predicted = np.sum(predicted_labels == 1)
non_accident_precision = non_accident_correct / non_accident_predicted * 100 if non_accident_predicted > 0 else 0

print(f"\nOverall Accuracy: {accuracy:.2f}%")
print(f"\nPer-Class Performance:")
print(f"  Accident:")
print(f"    Recall:    {accident_recall:.2f}% ({accident_correct}/{accident_total})")
print(f"    Precision: {accident_precision:.2f}%")
print(f"  Non-Accident:")
print(f"    Recall:    {non_accident_recall:.2f}% ({non_accident_correct}/{non_accident_total})")
print(f"    Precision: {non_accident_precision:.2f}%")

# Confusion matrix
cm = np.zeros((2, 2), dtype=int)
for true_idx in range(2):
    for pred_idx in range(2):
        cm[true_idx, pred_idx] = np.sum((true_labels == true_idx) & (predicted_labels == pred_idx))

print(f"\nConfusion Matrix:")
print(f"                  | Predicted Accident | Predicted Non-Accident")
print(f"  True Accident   | {cm[0,0]:18d} | {cm[0,1]:22d}")
print(f"  True Non-Acc    | {cm[1,0]:18d} | {cm[1,1]:22d}")

# Comparison with single models
print("\n" + "="*70)
print("COMPARISON WITH SINGLE MODELS")
print("="*70)
print(f"\n{'Model':<30} | {'Accuracy':<10} | {'Accident Recall':<16} | {'Non-Acc Recall':<16}")
print("-" * 80)
print(f"{'accidents.keras (Primary)':<30} | {'46.94%':<10} | {'100.00%':<16} | {'0.00%':<16}")
print(f"{'ResNet50 (Secondary)':<30} | {'58.16%':<10} | {'39.13%':<16} | {'75.00%':<16}")
print(f"{'HYBRID (Both)':<30} | {f'{accuracy:.2f}%':<10} | {f'{accident_recall:.2f}%':<16} | {f'{non_accident_recall:.2f}%':<16}")

# Calculate improvement
print(f"\nImprovement vs Primary Model:")
print(f"  Accuracy: {accuracy - 46.94:+.2f}%")
print(f"  False Alarm Reduction: {non_accident_recall - 0:.2f}%")
print(f"  Accident Detection: {accident_recall - 100:.2f}%")

# Create visualization
fig, axes = plt.subplots(2, 2, figsize=(14, 12))

# 1. Model Agreement Distribution
ax1 = axes[0, 0]
agreement_labels = list(agreement_counts.keys())
agreement_values = list(agreement_counts.values())
colors = ['#2ecc71', '#3498db', '#e74c3c', '#95a5a6']
bars = ax1.bar(range(len(agreement_labels)), agreement_values, color=colors, alpha=0.7, edgecolor='black')
ax1.set_xticks(range(len(agreement_labels)))
ax1.set_xticklabels([label.replace('_', '\n') for label in agreement_labels], fontsize=8)
ax1.set_ylabel('Count')
ax1.set_title('Model Agreement Distribution', fontweight='bold')
ax1.grid(axis='y', alpha=0.3)
for bar, value in zip(bars, agreement_values):
    height = bar.get_height()
    ax1.text(bar.get_x() + bar.get_width()/2., height + 1,
             f'{value}\n({value/len(predictions)*100:.1f}%)', ha='center', va='bottom', fontsize=9)

# 2. Confusion Matrix
ax2 = axes[0, 1]
im = ax2.imshow(cm, cmap='RdYlGn', aspect='auto')
ax2.set_xticks([0, 1])
ax2.set_yticks([0, 1])
ax2.set_xticklabels(CLASSES)
ax2.set_yticklabels(CLASSES)
for i in range(2):
    for j in range(2):
        text = ax2.text(j, i, cm[i, j], ha="center", va="center", color="black", fontsize=16, fontweight='bold')
ax2.set_title(f'Hybrid Confusion Matrix\nAccuracy: {accuracy:.2f}%', fontweight='bold')
ax2.set_ylabel('True Label')
ax2.set_xlabel('Predicted Label')
plt.colorbar(im, ax=ax2)

# 3. Model Comparison
ax3 = axes[1, 0]
models = ['Primary\n(accidents.keras)', 'Secondary\n(ResNet50)', 'HYBRID']
accuracies = [46.94, 58.16, accuracy]
accident_recalls = [100.00, 39.13, accident_recall]
non_accident_recalls = [0.00, 75.00, non_accident_recall]

x = np.arange(len(models))
width = 0.25

bars1 = ax3.bar(x - width, accuracies, width, label='Overall Accuracy', color='#3498db', alpha=0.7)
bars2 = ax3.bar(x, accident_recalls, width, label='Accident Recall', color='#e74c3c', alpha=0.7)
bars3 = ax3.bar(x + width, non_accident_recalls, width, label='Non-Accident Recall', color='#2ecc71', alpha=0.7)

ax3.set_ylabel('Percentage (%)')
ax3.set_title('Model Performance Comparison', fontweight='bold')
ax3.set_xticks(x)
ax3.set_xticklabels(models)
ax3.legend()
ax3.grid(axis='y', alpha=0.3)
ax3.set_ylim(0, 110)

# 4. Summary
ax4 = axes[1, 1]
ax4.axis('off')
summary_text = f"""
HYBRID CLASSIFIER SUMMARY
{'='*45}

PERFORMANCE
  Overall Accuracy:        {accuracy:.2f}%
  Accident Detection:      {accident_recall:.2f}%
  Non-Accident Detection:  {non_accident_recall:.2f}%

IMPROVEMENT vs PRIMARY MODEL
  Accuracy:                {accuracy - 46.94:+.2f}%
  False Alarm Reduction:   {non_accident_recall:.2f}%
  Accident Detection:      {accident_recall - 100:.2f}%

MODEL AGREEMENT
  Both Agree (Accident):   {agreement_counts['BOTH_ACCIDENT']}
  Both Agree (No Acc):     {agreement_counts['BOTH_NO_ACCIDENT']}
  Disagree:                {agreement_counts['DISAGREEMENT']}

KEY INSIGHT
  Hybrid approach reduces false alarms
  from 100% to {100 - non_accident_recall:.1f}% while maintaining
  {accident_recall:.1f}% accident detection rate.
  
  Trade-off: Catches {accident_recall:.1f}% of accidents
  (down from 100%) but dramatically
  reduces false alarms.
"""
ax4.text(0.1, 0.5, summary_text, fontsize=9, family='monospace',
         verticalalignment='center', bbox=dict(boxstyle='round', facecolor='lightblue', alpha=0.3))

plt.tight_layout()
plt.savefig('hybrid_classifier_evaluation.png', dpi=150, bbox_inches='tight')
print(f"\n✅ Evaluation saved to: hybrid_classifier_evaluation.png")

print("\n" + "="*70)
print("EVALUATION COMPLETE")
print("="*70)
