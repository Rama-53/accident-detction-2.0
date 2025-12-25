import os
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, models
from tensorflow.keras.applications import ResNet50
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
from sklearn.utils.class_weight import compute_class_weight
import matplotlib.pyplot as plt
import tensorflow.keras.backend as K

# --- Configuration ---
BASE_DATA_PATH = r"C:\Users\Ram\Desktop\Project Trial\data"
TRAIN_DIR = os.path.join(BASE_DATA_PATH, "train")
VAL_DIR = os.path.join(BASE_DATA_PATH, "val")

IMG_SIZE = (224, 224)
BATCH_SIZE = 32

# Phase 1: Head Training
PHASE1_EPOCHS = 20  # Increased from 10 for better head training
PHASE1_LR = 1e-3  # High learning rate

# Phase 2: Fine-Tuning
PHASE2_EPOCHS = 40  # Increased from 20 for better convergence
PHASE2_LR = 5e-4  # Increased from 1e-4 for faster learning

MODEL_SAVE_NAME = "accidents_resnet50.keras"

# Explicitly define classes
CLASSES = ['Accident', 'Non Accident']

# Focal loss for handling hard examples
def focal_loss(gamma=2.0, alpha=0.75):
    """Focal loss to focus on hard-to-classify examples"""
    def loss_fn(y_true, y_pred):
        epsilon = K.epsilon()
        y_pred = K.clip(y_pred, epsilon, 1.0 - epsilon)
        
        # Calculate cross entropy
        cross_entropy = -y_true * K.log(y_pred)
        
        # Calculate focal loss weight
        weight = alpha * K.pow(1 - y_pred, gamma)
        
        # Apply weight to cross entropy
        focal_loss_value = weight * cross_entropy
        
        return K.sum(focal_loss_value, axis=-1)
    return loss_fn

def build_model_phase1(num_classes):
    """Build model with FROZEN ResNet50 base for Phase 1: Head Training"""
    print("\n" + "="*60)
    print("PHASE 1: HEAD TRAINING - Building ResNet50 Model")
    print("="*60)
    print(f"Loading ResNet50 (Pre-trained on ImageNet) for {num_classes} classes...")
    
    base_model = ResNet50(
        input_shape=(224, 224, 3),
        include_top=False,
        weights='imagenet'
    )
    
    # COMPLETELY FREEZE the base model
    base_model.trainable = False
    print("✓ ResNet50 base model COMPLETELY FROZEN")
    print(f"✓ Learning Rate: {PHASE1_LR} (HIGH)")
    print(f"✓ Epochs: {PHASE1_EPOCHS}")
    print("✓ Goal: Train Dense layers to produce sensible outputs")

    x = base_model.output
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(0.5)(x)
    x = layers.Dense(512, activation='relu')(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(0.5)(x)
    x = layers.Dense(256, activation='relu')(x)
    x = layers.Dropout(0.4)(x)
    outputs = layers.Dense(num_classes, activation='softmax')(x)
    
    model = models.Model(inputs=base_model.input, outputs=outputs)
    
    print(f"✓ Model built with {model.count_params():,} total parameters")
    trainable_params = sum([tf.size(w).numpy() for w in model.trainable_weights])
    print(f"✓ Trainable parameters: {trainable_params:,}")
    
    return model, base_model

def unfreeze_model_phase2(model, base_model):
    """Unfreeze top layers for Phase 2: Fine-Tuning"""
    print("\n" + "="*60)
    print("PHASE 2: FINE-TUNING - Unfreezing Top Layers")
    print("="*60)
    
    # ResNet50 has 175 layers total
    # Unfreeze the last 80 layers (increased from 50 for more feature adaptation)
    base_model.trainable = True
    
    # Freeze all layers except the top 80
    for layer in base_model.layers[:-80]:
        layer.trainable = False
    
    trainable_count = sum([1 for layer in base_model.layers if layer.trainable])
    trainable_params = sum([tf.size(w).numpy() for w in model.trainable_weights])
    
    print(f"✓ Top 80 layers UNFROZEN ({trainable_count} trainable layers)")
    print(f"✓ Trainable parameters: {trainable_params:,}")
    print(f"✓ Learning Rate: {PHASE2_LR} (MODERATE)")
    print(f"✓ Epochs: {PHASE2_EPOCHS}")
    print("✓ Goal: Fine-tune ResNet50 features for accident detection")
    
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

    # Data generators with aggressive augmentation
    train_datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=30,
        width_shift_range=0.3,
        height_shift_range=0.3,
        shear_range=0.2,
        zoom_range=0.2,
        brightness_range=[0.8, 1.2],
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
    
    # Calculate class weights with emphasis on accident detection (safety-critical)
    class_weights_auto = calculate_class_weights(train_generator)
    
    # Manual adjustment: prioritize accident detection
    class_weights = {
        0: class_weights_auto[0] * 1.5,  # Accident (higher weight for safety)
        1: class_weights_auto[1]
    }
    
    print("\n--- ADJUSTED CLASS WEIGHTS (Safety-Prioritized) ---")
    for idx, weight in class_weights.items():
        print(f"  {CLASSES[idx]}: {weight:.4f}")
    print("="*60 + "\n")

    # ========== PHASE 1: HEAD TRAINING ==========
    model, base_model = build_model_phase1(num_classes=train_generator.num_classes)
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=PHASE1_LR),
        loss=focal_loss(gamma=2.0, alpha=0.75),  # Using focal loss
        metrics=['accuracy']
    )

    print("\n🚀 Starting PHASE 1: HEAD TRAINING (ResNet50)...")
    print("Using Focal Loss (gamma=2.0, alpha=0.75) for better learning")
    print("Expected: Accuracy should climb to 70-80%\n")
    
    # Callbacks for Phase 1
    callbacks_phase1 = [
        EarlyStopping(
            monitor='val_accuracy',
            patience=5,
            restore_best_weights=True,
            verbose=1
        ),
        ModelCheckpoint(
            'resnet50_phase1_best.keras',
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
    
    # Recompile with moderate learning rate and focal loss
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=PHASE2_LR),
        loss=focal_loss(gamma=2.0, alpha=0.75),  # Using focal loss
        metrics=['accuracy']
    )

    print("\n🚀 Starting PHASE 2: FINE-TUNING (ResNet50)...")
    print("Using Focal Loss + 80 unfrozen layers + LR=5e-4")
    print("Expected: Validation accuracy should climb to 75-85%\n")
    
    # Callbacks for Phase 2
    callbacks_phase2 = [
        EarlyStopping(
            monitor='val_accuracy',
            patience=7,
            restore_best_weights=True,
            verbose=1
        ),
        ModelCheckpoint(
            'resnet50_phase2_best.keras',
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
    print(f"✅ SUCCESS! ResNet50 model saved to: {save_path}")
    print(f"{'='*60}\n")

    # Combine histories for plotting
    combined_history = {
        'accuracy': history_phase1.history['accuracy'] + history_phase2.history['accuracy'],
        'val_accuracy': history_phase1.history['val_accuracy'] + history_phase2.history['val_accuracy'],
        'loss': history_phase1.history['loss'] + history_phase2.history['loss'],
        'val_loss': history_phase1.history['val_loss'] + history_phase2.history['val_loss']
    }
    
    total_epochs = len(combined_history['accuracy'])
    
    # Plot results
    plt.figure(figsize=(14, 6))
    
    plt.subplot(1, 2, 1)
    plt.plot(range(1, total_epochs + 1), combined_history['accuracy'], label='Training Accuracy', linewidth=2)
    plt.plot(range(1, total_epochs + 1), combined_history['val_accuracy'], label='Validation Accuracy', linewidth=2)
    plt.axvline(x=len(history_phase1.history['accuracy']), color='red', linestyle='--', label='Phase 1 → Phase 2', linewidth=2)
    plt.legend(loc='lower right')
    plt.title('ResNet50 Training Progress: Accuracy', fontsize=14, fontweight='bold')
    plt.xlabel('Epoch')
    plt.ylabel('Accuracy')
    plt.grid(True, alpha=0.3)

    plt.subplot(1, 2, 2)
    plt.plot(range(1, total_epochs + 1), combined_history['loss'], label='Training Loss', linewidth=2)
    plt.plot(range(1, total_epochs + 1), combined_history['val_loss'], label='Validation Loss', linewidth=2)
    plt.axvline(x=len(history_phase1.history['accuracy']), color='red', linestyle='--', label='Phase 1 → Phase 2', linewidth=2)
    plt.legend(loc='upper right')
    plt.title('ResNet50 Training Progress: Loss', fontsize=14, fontweight='bold')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('resnet50_training_progress.png', dpi=150, bbox_inches='tight')
    print("📊 Training plot saved as 'resnet50_training_progress.png'")

    # Print final metrics
    print("\n" + "="*60)
    print("FINAL RESULTS (ResNet50)")
    print("="*60)
    print(f"Phase 1 Final Val Accuracy: {history_phase1.history['val_accuracy'][-1]:.4f}")
    print(f"Phase 2 Final Val Accuracy: {history_phase2.history['val_accuracy'][-1]:.4f}")
    print(f"Overall Best Val Accuracy:  {max(combined_history['val_accuracy']):.4f}")
    print("="*60)

if __name__ == "__main__":
    main()
