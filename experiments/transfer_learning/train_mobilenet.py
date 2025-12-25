import os
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, models
from tensorflow.keras.applications import MobileNetV3Large
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
from sklearn.utils.class_weight import compute_class_weight
import matplotlib.pyplot as plt

# --- Configuration ---
BASE_DATA_PATH = r"C:\Users\Ram\Desktop\Project Trial\data" 
TRAIN_DIR = os.path.join(BASE_DATA_PATH, "train")
VAL_DIR = os.path.join(BASE_DATA_PATH, "val")

IMG_SIZE = (224, 224)
BATCH_SIZE = 32

# Phase 1: Head Training
PHASE1_EPOCHS = 10  # Increased from 5 for better head training
PHASE1_LR = 1e-3  # High learning rate

# Phase 2: Fine-Tuning
PHASE2_EPOCHS = 20  # Increased from 10 for better fine-tuning
PHASE2_LR = 1e-4  # Increased from 1e-5 for faster convergence

MODEL_SAVE_NAME = "accidents_mobilenet.keras"

# Explicitly define classes
CLASSES = ['Accident', 'Non Accident']

def build_model_phase1(num_classes):
    """Build model with FROZEN base for Phase 1: Head Training"""
    print("\n" + "="*60)
    print("PHASE 1: HEAD TRAINING - Building Model")
    print("="*60)
    print(f"Loading MobileNetV3Large (Pre-trained) for {num_classes} classes...")
    
    base_model = MobileNetV3Large(
        input_shape=(224, 224, 3),
        include_top=False,  
        weights='imagenet',
        minimalistic=False
    )
    
    # COMPLETELY FREEZE the base model
    base_model.trainable = False
    print("✓ Base model COMPLETELY FROZEN")
    print(f"✓ Learning Rate: {PHASE1_LR} (HIGH)")
    print(f"✓ Epochs: {PHASE1_EPOCHS}")
    print("✓ Goal: Train Dense layers to produce sensible outputs")

    x = base_model.output
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.4)(x)
    x = layers.Dense(256, activation='relu')(x)  # Increased from 128
    x = layers.Dropout(0.4)(x)
    x = layers.Dense(128, activation='relu')(x)  # Additional layer
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(num_classes, activation='softmax')(x) 
    
    model = models.Model(inputs=base_model.input, outputs=outputs)
    return model, base_model

def unfreeze_model_phase2(model, base_model):
    """Unfreeze top 30 layers for Phase 2: Fine-Tuning"""
    print("\n" + "="*60)
    print("PHASE 2: FINE-TUNING - Unfreezing Top Layers")
    print("="*60)
    
    # Unfreeze the base model
    base_model.trainable = True
    
    # Freeze all layers except the top 50 (increased from 30)
    for layer in base_model.layers[:-50]:
        layer.trainable = False
    
    trainable_count = sum([1 for layer in base_model.layers if layer.trainable])
    print(f"✓ Top 50 layers UNFROZEN ({trainable_count} trainable layers)")
    print(f"✓ Learning Rate: {PHASE2_LR} (LOW)")
    print(f"✓ Epochs: {PHASE2_EPOCHS}")
    print("✓ Goal: Fine-tune CNN features for accident detection")
    
    return model

def calculate_class_weights(train_generator):
    """Calculate class weights to handle dataset imbalance"""
    print("\n" + "="*60)
    print("CALCULATING CLASS WEIGHTS")
    print("="*60)
    
    # Get all labels from the generator
    labels = train_generator.classes
    class_names = list(train_generator.class_indices.keys())
    
    # Count samples per class
    unique, counts = np.unique(labels, return_counts=True)
    for idx, count in zip(unique, counts):
        print(f"  {class_names[idx]}: {count} samples")
    
    # Compute class weights
    class_weights = compute_class_weight(
        class_weight='balanced',
        classes=np.unique(labels),
        y=labels
    )
    
    class_weight_dict = dict(enumerate(class_weights))
    print("\nClass Weights:")
    for idx, weight in class_weight_dict.items():
        print(f"  {class_names[idx]}: {weight:.4f}")
    print("="*60 + "\n")
    
    return class_weight_dict

def main():
    if not os.path.exists(TRAIN_DIR):
        print(f"ERROR: Train path not found: {TRAIN_DIR}")
        return
    if not os.path.exists(VAL_DIR):
        print(f"ERROR: Val path not found: {VAL_DIR}")
        return

    print(f"Using GPU: {tf.config.list_physical_devices('GPU')}")

    # Data generators with more aggressive augmentation
    train_datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=30,  # Increased from 20
        width_shift_range=0.3,  # Increased from 0.2
        height_shift_range=0.3,  # Increased from 0.2
        shear_range=0.2,  # NEW
        zoom_range=0.2,  # NEW
        brightness_range=[0.8, 1.2],  # NEW
        horizontal_flip=True,
        fill_mode='nearest'
    )
    
    val_datagen = ImageDataGenerator(rescale=1./255)

    print(f"\nLoading Training Data from {TRAIN_DIR}...")
    train_generator = train_datagen.flow_from_directory(
        TRAIN_DIR,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        classes=CLASSES,
        shuffle=True
    )
    
    print(f"Loading Validation Data from {VAL_DIR}...")
    validation_generator = val_datagen.flow_from_directory(
        VAL_DIR,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        classes=CLASSES,
        shuffle=False
    )

    print("\n--- CLASS MAPPING ---")
    print(f"Training Indices:   {train_generator.class_indices}")
    print(f"Validation Indices: {validation_generator.class_indices}")
    
    # Calculate class weights
    class_weights = calculate_class_weights(train_generator)

    # ========== PHASE 1: HEAD TRAINING ==========
    model, base_model = build_model_phase1(num_classes=train_generator.num_classes)
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=PHASE1_LR),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )

    print("\n🚀 Starting PHASE 1: HEAD TRAINING...")
    print("Expected: Accuracy should climb rapidly to 70-80%\n")
    
    # Callbacks for Phase 1
    callbacks_phase1 = [
        EarlyStopping(
            monitor='val_accuracy',
            patience=5,
            restore_best_weights=True,
            verbose=1
        ),
        ModelCheckpoint(
            'phase1_best.keras',
            monitor='val_accuracy',
            save_best_only=True,
            verbose=1
        )
    ]
    
    history_phase1 = model.fit(
        train_generator,
        epochs=PHASE1_EPOCHS,
        validation_data=validation_generator,
        class_weight=class_weights,
        callbacks=callbacks_phase1
    )

    # ========== PHASE 2: FINE-TUNING ==========
    model = unfreeze_model_phase2(model, base_model)
    
    # Recompile with lower learning rate
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=PHASE2_LR),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )

    print("\n🚀 Starting PHASE 2: FINE-TUNING...")
    print("Expected: Validation accuracy should break flatline and climb >85%\n")
    
    # Callbacks for Phase 2
    callbacks_phase2 = [
        EarlyStopping(
            monitor='val_accuracy',
            patience=7,  # More patience for fine-tuning
            restore_best_weights=True,
            verbose=1
        ),
        ModelCheckpoint(
            'phase2_best.keras',
            monitor='val_accuracy',
            save_best_only=True,
            verbose=1
        ),
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=3,
            min_lr=1e-7,
            verbose=1
        )
    ]
    
    history_phase2 = model.fit(
        train_generator,
        epochs=PHASE2_EPOCHS,
        validation_data=validation_generator,
        class_weight=class_weights,
        callbacks=callbacks_phase2
    )

    # Save the final model
    save_path = os.path.join(os.getcwd(), MODEL_SAVE_NAME)
    model.save(save_path)
    print(f"\n{'='*60}")
    print(f"✅ SUCCESS! Model saved to: {save_path}")
    print(f"{'='*60}\n")

    # Combine histories for plotting
    combined_history = {
        'accuracy': history_phase1.history['accuracy'] + history_phase2.history['accuracy'],
        'val_accuracy': history_phase1.history['val_accuracy'] + history_phase2.history['val_accuracy'],
        'loss': history_phase1.history['loss'] + history_phase2.history['loss'],
        'val_loss': history_phase1.history['val_loss'] + history_phase2.history['val_loss']
    }
    
    total_epochs = PHASE1_EPOCHS + PHASE2_EPOCHS
    
    # Plot results
    plt.figure(figsize=(14, 6))
    
    plt.subplot(1, 2, 1)
    plt.plot(range(1, total_epochs + 1), combined_history['accuracy'], label='Training Accuracy', linewidth=2)
    plt.plot(range(1, total_epochs + 1), combined_history['val_accuracy'], label='Validation Accuracy', linewidth=2)
    plt.axvline(x=PHASE1_EPOCHS, color='red', linestyle='--', label='Phase 1 → Phase 2', linewidth=2)
    plt.legend(loc='lower right')
    plt.title('Training Progress: Accuracy', fontsize=14, fontweight='bold')
    plt.xlabel('Epoch')
    plt.ylabel('Accuracy')
    plt.grid(True, alpha=0.3)

    plt.subplot(1, 2, 2)
    plt.plot(range(1, total_epochs + 1), combined_history['loss'], label='Training Loss', linewidth=2)
    plt.plot(range(1, total_epochs + 1), combined_history['val_loss'], label='Validation Loss', linewidth=2)
    plt.axvline(x=PHASE1_EPOCHS, color='red', linestyle='--', label='Phase 1 → Phase 2', linewidth=2)
    plt.legend(loc='upper right')
    plt.title('Training Progress: Loss', fontsize=14, fontweight='bold')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('training_progress.png', dpi=150, bbox_inches='tight')
    print("📊 Training plot saved as 'training_progress.png'")
    plt.show()

    # Print final metrics
    print("\n" + "="*60)
    print("FINAL RESULTS")
    print("="*60)
    print(f"Phase 1 Final Val Accuracy: {history_phase1.history['val_accuracy'][-1]:.4f}")
    print(f"Phase 2 Final Val Accuracy: {history_phase2.history['val_accuracy'][-1]:.4f}")
    print(f"Overall Best Val Accuracy:  {max(combined_history['val_accuracy']):.4f}")
    print("="*60)

if __name__ == "__main__":
    main()
