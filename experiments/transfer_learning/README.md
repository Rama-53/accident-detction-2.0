# Transfer Learning Experiments

This folder contains experimental training scripts and models for transfer learning approaches using pre-trained architectures.

## Contents

### Training Scripts
- `train_mobilenet.py` - MobileNetV3Large training with 2-stage transfer learning
- `train_resnet50.py` - ResNet50 training with 2-stage transfer learning
- `diagnose_dataset.py` - Dataset analysis and model diagnostic tool
- `diagnose_resnet50.py` - ResNet50 model evaluation script
- `diagnose_current_model.py` - Current model (accidents.keras) evaluation

### Model Files
- `accidents_mobilenet.keras` - MobileNetV3 model (53.06% accuracy, predicts only one class)
- `accidents_resnet50.keras` - ResNet50 optimized model (53.06% accuracy, overfitted)
- `resnet50_phase2_best.keras` - **Best ResNet50 model** (58.16% accuracy, predicts both classes)
- `resnet50_phase1_best.keras` - ResNet50 after Phase 1 training
- `phase1_best.keras` - MobileNetV3 Phase 1 checkpoint
- `phase2_best.keras` - MobileNetV3 Phase 2 checkpoint

## Results Summary

| Model | Accuracy | Accident Detection | Non-Accident Detection | Status |
|-------|----------|-------------------|----------------------|--------|
| MobileNetV3 | 53.06% | 0% | 100% | ❌ Failed - predicts only one class |
| ResNet50 (original) | **58.16%** | 39% | 75% | ✅ Works - predicts both classes |
| ResNet50 (optimized) | 53.06% | 0% | 100% | ❌ Failed - overfitted |

## Key Findings

1. **MobileNetV3 Failed**: Despite 2-stage training, only predicted "Non Accident" class
2. **ResNet50 Succeeded**: Original configuration (10+20 epochs, LR=1e-4, 50 layers) worked
3. **Optimization Backfired**: Focal loss + longer training caused overfitting
4. **Current Model is Better**: `accidents.keras` (46.94% accuracy) catches 100% of accidents vs ResNet50's 39%

## Recommendation

**Do not use these models in production.** The current `accidents.keras` model is superior for safety-critical accident detection despite lower overall accuracy.

## Reference

See conversation artifacts for detailed analysis:
- `diagnostic_report.md` - Initial MobileNetV3 failure analysis
- `resnet50_success.md` - ResNet50 success analysis
- `what_happened.md` - Optimization failure analysis
- `model_comparison.md` - Comprehensive model comparison
