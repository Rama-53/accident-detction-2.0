import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras import models
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend to avoid Tcl/Tk issues
import matplotlib.pyplot as plt

# Configuration
BASE_DATA_PATH = r"C:\Users\Ram\Desktop\Project Trial\data"
TRAIN_DIR = os.path.join(BASE_DATA_PATH, "train")
VAL_DIR = os.path.join(BASE_DATA_PATH, "val")
MODEL_PATH = "accidents_mobilenet.keras"

IMG_SIZE = (224, 224)
BATCH_SIZE = 32
CLASSES = ['Accident', 'Non Accident']

print("="*70)
print("DATASET & MODEL DIAGNOSTICS")
print("="*70)

# 1. DATASET STATISTICS
print("\n" + "="*70)
print("1. DATASET STATISTICS")
print("="*70)

train_datagen = ImageDataGenerator(rescale=1./255)
val_datagen = ImageDataGenerator(rescale=1./255)

train_generator = train_datagen.flow_from_directory(
    TRAIN_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    classes=CLASSES,
    shuffle=False  # Don't shuffle for consistent analysis
)

validation_generator = val_datagen.flow_from_directory(
    VAL_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    classes=CLASSES,
    shuffle=False
)

print(f"\nTotal training samples: {train_generator.samples}")
print(f"Total validation samples: {validation_generator.samples}")

# Count per class
train_class_counts = np.bincount(train_generator.classes)
val_class_counts = np.bincount(validation_generator.classes)

print("\n--- Class Distribution ---")
for idx, class_name in enumerate(CLASSES):
    print(f"\nClass '{class_name}':")
    print(f"  Training:   {train_class_counts[idx]:4d} samples ({train_class_counts[idx]/train_generator.samples*100:5.2f}%)")
    print(f"  Validation: {val_class_counts[idx]:4d} samples ({val_class_counts[idx]/validation_generator.samples*100:5.2f}%)")

# Check if validation split matches the 53.06% accuracy
val_majority_pct = max(val_class_counts) / validation_generator.samples * 100
print(f"\n⚠️  Validation majority class: {val_majority_pct:.2f}%")
if abs(val_majority_pct - 53.06) < 0.5:
    print("   ⚠️  This matches the stuck validation accuracy!")
    print("   → Model is likely predicting only the majority class")

# 2. DATA LOADING VERIFICATION
print("\n" + "="*70)
print("2. DATA LOADING VERIFICATION")
print("="*70)

sample_batch = next(iter(train_generator))
print(f"\nSample batch shape: {sample_batch[0].shape}")
print(f"Sample batch labels shape: {sample_batch[1].shape}")
print(f"Image value range: [{sample_batch[0].min():.3f}, {sample_batch[0].max():.3f}]")
print(f"\nFirst 5 labels (one-hot encoded):")
for i in range(min(5, len(sample_batch[1]))):
    label_idx = np.argmax(sample_batch[1][i])
    print(f"  Sample {i}: {sample_batch[1][i]} → {CLASSES[label_idx]}")

# 3. MODEL PREDICTIONS ANALYSIS
print("\n" + "="*70)
print("3. MODEL PREDICTIONS ANALYSIS")
print("="*70)

if os.path.exists(MODEL_PATH):
    print(f"\nLoading model from: {MODEL_PATH}")
    model = models.load_model(MODEL_PATH)
    
    print("Generating predictions on validation set...")
    validation_generator.reset()
    val_predictions = model.predict(validation_generator, verbose=1)
    
    predicted_classes = np.argmax(val_predictions, axis=1)
    true_classes = validation_generator.classes
    
    print("\n--- Prediction Distribution ---")
    unique, counts = np.unique(predicted_classes, return_counts=True)
    for cls, count in zip(unique, counts):
        print(f"  Predicted '{CLASSES[cls]}': {count:4d} times ({count/len(predicted_classes)*100:5.2f}%)")
    
    # Check if model is predicting only one class
    if len(unique) == 1:
        print("\n⚠️  CRITICAL: Model is predicting ONLY ONE CLASS!")
        print(f"   → Always predicting: {CLASSES[unique[0]]}")
    
    # Calculate actual accuracy
    correct = np.sum(predicted_classes == true_classes)
    accuracy = correct / len(true_classes) * 100
    print(f"\nActual accuracy: {accuracy:.2f}%")
    
    # Confusion matrix
    print("\n--- Confusion Matrix ---")
    print(f"{'':15s} | Predicted Accident | Predicted Non-Accident")
    print("-" * 60)
    for true_idx, true_class in enumerate(CLASSES):
        true_mask = true_classes == true_idx
        pred_when_true = predicted_classes[true_mask]
        
        accident_count = np.sum(pred_when_true == 0)
        non_accident_count = np.sum(pred_when_true == 1)
        
        print(f"True {true_class:12s} | {accident_count:18d} | {non_accident_count:22d}")
    
    # Sample prediction confidence
    print("\n--- Prediction Confidence (first 10 samples) ---")
    for i in range(min(10, len(val_predictions))):
        pred_class = CLASSES[predicted_classes[i]]
        true_class = CLASSES[true_classes[i]]
        confidence = val_predictions[i][predicted_classes[i]] * 100
        correct_mark = "✓" if predicted_classes[i] == true_classes[i] else "✗"
        print(f"  {correct_mark} Sample {i}: Predicted '{pred_class}' ({confidence:.1f}% conf) | True: '{true_class}'")
    
else:
    print(f"\n⚠️  Model not found at: {MODEL_PATH}")
    print("   Skipping prediction analysis")

# 4. VISUALIZE SAMPLE IMAGES
print("\n" + "="*70)
print("4. VISUALIZING SAMPLE IMAGES")
print("="*70)

print("\nCreating visualization of sample images...")
train_generator.reset()

fig, axes = plt.subplots(2, 5, figsize=(15, 6))
fig.suptitle('Sample Images from Training Set', fontsize=16, fontweight='bold')

samples_found = {'Accident': 0, 'Non Accident': 0}
batch_idx = 0

while (samples_found['Accident'] < 5 or samples_found['Non Accident'] < 5) and batch_idx < 20:
    batch = next(iter(train_generator))
    
    for i in range(len(batch[0])):
        label_idx = np.argmax(batch[1][i])
        class_name = CLASSES[label_idx]
        
        if samples_found[class_name] < 5:
            col = samples_found[class_name]
            row = 0 if class_name == 'Accident' else 1
            
            axes[row, col].imshow(batch[0][i])
            axes[row, col].set_title(f'{class_name} #{col+1}')
            axes[row, col].axis('off')
            
            samples_found[class_name] += 1
        
        if samples_found['Accident'] >= 5 and samples_found['Non Accident'] >= 5:
            break
    
    batch_idx += 1

axes[0, 0].set_ylabel('Accident', fontsize=14, fontweight='bold')
axes[1, 0].set_ylabel('Non Accident', fontsize=14, fontweight='bold')

plt.tight_layout()
plt.savefig('dataset_samples.png', dpi=150, bbox_inches='tight')
print("✓ Saved visualization to: dataset_samples.png")

# 5. CHECK FOR IDENTICAL IMAGES
print("\n" + "="*70)
print("5. CHECKING FOR IMAGE DIVERSITY")
print("="*70)

train_generator.reset()
batch = next(iter(train_generator))

# Calculate mean and std of images in first batch
image_means = [img.mean() for img in batch[0]]
image_stds = [img.std() for img in batch[0]]

print(f"\nImage statistics (first batch of {len(batch[0])} images):")
print(f"  Mean pixel values: min={min(image_means):.4f}, max={max(image_means):.4f}, avg={np.mean(image_means):.4f}")
print(f"  Std pixel values:  min={min(image_stds):.4f}, max={max(image_stds):.4f}, avg={np.mean(image_stds):.4f}")

# Check if images are too similar
if max(image_stds) - min(image_stds) < 0.01:
    print("\n⚠️  WARNING: Images have very similar statistics!")
    print("   → Possible data corruption or all images are nearly identical")
else:
    print("\n✓ Images show good diversity")

# SUMMARY
print("\n" + "="*70)
print("DIAGNOSTIC SUMMARY")
print("="*70)

print("\n✓ Diagnostics complete!")
print("\nKey Findings:")
print(f"  1. Training samples: {train_generator.samples}")
print(f"  2. Validation samples: {validation_generator.samples}")
print(f"  3. Validation majority class: {val_majority_pct:.2f}%")
if os.path.exists(MODEL_PATH):
    print(f"  4. Model predictions: {len(unique)} unique class(es)")
    if len(unique) == 1:
        print(f"     → ISSUE: Only predicting '{CLASSES[unique[0]]}'")
print("\nReview the output above and 'dataset_samples.png' for more details.")
print("="*70)
