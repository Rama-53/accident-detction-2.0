import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras import models
import tensorflow.keras.backend as K

# Focal loss definition (needed for loading the model)
def focal_loss(gamma=2.0, alpha=0.75):
    """Focal loss to focus on hard-to-classify examples"""
    def loss_fn(y_true, y_pred):
        epsilon = K.epsilon()
        y_pred = K.clip(y_pred, epsilon, 1.0 - epsilon)
        cross_entropy = -y_true * K.log(y_pred)
        weight = alpha * K.pow(1 - y_pred, gamma)
        focal_loss_value = weight * cross_entropy
        return K.sum(focal_loss_value, axis=-1)
    return loss_fn

# Configuration
BASE_DATA_PATH = r"C:\Users\Ram\Desktop\Project Trial\data"
VAL_DIR = os.path.join(BASE_DATA_PATH, "val")
MODEL_PATH = "accidents_resnet50.keras"

IMG_SIZE = (224, 224)
BATCH_SIZE = 32
CLASSES = ['Accident', 'Non Accident']

print("="*70)
print("RESNET50 MODEL DIAGNOSTICS (OPTIMIZED VERSION)")
print("="*70)

val_datagen = ImageDataGenerator(rescale=1./255)

validation_generator = val_datagen.flow_from_directory(
    VAL_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    classes=CLASSES,
    shuffle=False
)

print(f"\nValidation samples: {validation_generator.samples}")

if os.path.exists(MODEL_PATH):
    print(f"\nLoading ResNet50 model from: {MODEL_PATH}")
    
    # Load model with custom objects
    model = models.load_model(
        MODEL_PATH,
        custom_objects={'loss_fn': focal_loss(gamma=2.0, alpha=0.75)}
    )
    
    print("Generating predictions on validation set...")
    validation_generator.reset()
    val_predictions = model.predict(validation_generator, verbose=1)
    
    predicted_classes = np.argmax(val_predictions, axis=1)
    true_classes = validation_generator.classes
    
    print("\n" + "="*70)
    print("PREDICTION DISTRIBUTION")
    print("="*70)
    unique, counts = np.unique(predicted_classes, return_counts=True)
    for cls, count in zip(unique, counts):
        print(f"  Predicted '{CLASSES[cls]}': {count:4d} times ({count/len(predicted_classes)*100:5.2f}%)")
    
    if len(unique) == 1:
        print("\n⚠️  CRITICAL: Model is predicting ONLY ONE CLASS!")
        print(f"   → Always predicting: {CLASSES[unique[0]]}")
    else:
        print("\n✅ Model is predicting BOTH classes!")
    
    # Calculate actual accuracy
    correct = np.sum(predicted_classes == true_classes)
    accuracy = correct / len(true_classes) * 100
    print(f"\nActual accuracy: {accuracy:.2f}%")
    
    # Confusion matrix
    print("\n" + "="*70)
    print("CONFUSION MATRIX")
    print("="*70)
    print(f"{'':15s} | Predicted Accident | Predicted Non-Accident")
    print("-" * 60)
    for true_idx, true_class in enumerate(CLASSES):
        true_mask = true_classes == true_idx
        pred_when_true = predicted_classes[true_mask]
        
        accident_count = np.sum(pred_when_true == 0)
        non_accident_count = np.sum(pred_when_true == 1)
        
        print(f"True {true_class:12s} | {accident_count:18d} | {non_accident_count:22d}")
    
    # Calculate per-class metrics
    print("\n" + "="*70)
    print("PER-CLASS PERFORMANCE")
    print("="*70)
    
    # Accident class
    accident_mask = true_classes == 0
    accident_correct = np.sum((predicted_classes == 0) & accident_mask)
    accident_total = np.sum(accident_mask)
    accident_recall = accident_correct / accident_total * 100 if accident_total > 0 else 0
    
    # Non-Accident class
    non_accident_mask = true_classes == 1
    non_accident_correct = np.sum((predicted_classes == 1) & non_accident_mask)
    non_accident_total = np.sum(non_accident_mask)
    non_accident_recall = non_accident_correct / non_accident_total * 100 if non_accident_total > 0 else 0
    
    print(f"Accident Detection Rate: {accident_recall:.2f}% ({accident_correct}/{accident_total})")
    print(f"Non-Accident Detection Rate: {non_accident_recall:.2f}% ({non_accident_correct}/{non_accident_total})")
    
    # Sample predictions
    print("\n" + "="*70)
    print("SAMPLE PREDICTIONS (first 10)")
    print("="*70)
    for i in range(min(10, len(val_predictions))):
        pred_class = CLASSES[predicted_classes[i]]
        true_class = CLASSES[true_classes[i]]
        confidence = val_predictions[i][predicted_classes[i]] * 100
        correct_mark = "✓" if predicted_classes[i] == true_classes[i] else "✗"
        print(f"  {correct_mark} Sample {i}: Predicted '{pred_class}' ({confidence:.1f}% conf) | True: '{true_class}'")
    
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)
    print(f"Model: ResNet50 (Optimized with Focal Loss)")
    print(f"Validation Accuracy: {accuracy:.2f}%")
    print(f"Accident Detection Rate: {accident_recall:.2f}%")
    print(f"Non-Accident Detection Rate: {non_accident_recall:.2f}%")
    print(f"Unique classes predicted: {len(unique)}")
    
    if len(unique) > 1:
        if accuracy >= 75:
            print("🎉 EXCELLENT: Model achieved target accuracy!")
        elif accuracy >= 65:
            print("✅ GOOD: Model is learning well, approaching target")
        else:
            print("✅ SUCCESS: Model learned to distinguish between classes!")
    else:
        print("❌ FAILURE: Model still predicting only one class")
    print("="*70)
    
else:
    print(f"\n⚠️  Model not found at: {MODEL_PATH}")
