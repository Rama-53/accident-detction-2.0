import os
import sys
import time
import numpy as np
from PIL import Image

# Test CPU/GPU split performance
print("="*70)
print("CPU/GPU SPLIT PERFORMANCE TEST")
print("="*70)

# 1. Test YOLO on CPU
print("\n1. Testing YOLO Detector on CPU...")
sys.path.insert(0, 'detector')
from detector import AccidentDetector

detector = AccidentDetector(model_path="yolo11s.pt")

# Create test frame
test_frame = np.zeros((640, 480, 3), dtype=np.uint8)

# Benchmark YOLO
yolo_times = []
for i in range(20):
    start = time.time()
    result = detector.process_frame(test_frame)
    elapsed = (time.time() - start) * 1000
    yolo_times.append(elapsed)
    if (i + 1) % 5 == 0:
        print(f"  Processed {i+1}/20 frames...")

avg_yolo = np.mean(yolo_times)
min_yolo = np.min(yolo_times)
max_yolo = np.max(yolo_times)

print(f"\nYOLO on CPU Results:")
print(f"  Average: {avg_yolo:.2f} ms")
print(f"  Min:     {min_yolo:.2f} ms")
print(f"  Max:     {max_yolo:.2f} ms")
print(f"  FPS:     {1000/avg_yolo:.1f}")

# 2. Test Hybrid Classifier on GPU
print("\n2. Testing Hybrid Classifier on GPU...")
sys.path.insert(0, 'classifier')
from hybrid_classifier import HybridAccidentClassifier

clf = HybridAccidentClassifier()

# Create test image
test_img = Image.new('RGB', (256, 256), color='red')

# Benchmark Hybrid Classifier
clf_times = []
for i in range(20):
    start = time.time()
    result = clf.predict(test_img)
    elapsed = (time.time() - start) * 1000
    clf_times.append(elapsed)
    if (i + 1) % 5 == 0:
        print(f"  Processed {i+1}/20 frames...")

avg_clf = np.mean(clf_times)
min_clf = np.min(clf_times)
max_clf = np.max(clf_times)

print(f"\nHybrid Classifier on GPU Results:")
print(f"  Average: {avg_clf:.2f} ms")
print(f"  Min:     {min_clf:.2f} ms")
print(f"  Max:     {max_clf:.2f} ms")
print(f"  FPS:     {1000/avg_clf:.1f}")

# 3. Combined Performance
print("\n" + "="*70)
print("COMBINED PERFORMANCE ANALYSIS")
print("="*70)

total_sequential = avg_yolo + avg_clf
total_async_main = avg_yolo + 12  # Assuming primary model only in main thread

print(f"\nSequential Processing (YOLO → Hybrid):")
print(f"  Total time: {total_sequential:.2f} ms")
print(f"  FPS: {1000/total_sequential:.1f}")
print(f"  Real-time (30 FPS): {'✅ YES' if total_sequential < 33.33 else '❌ NO'}")

print(f"\nAsync Processing (YOLO → Primary, Hybrid in background):")
print(f"  Main thread: {total_async_main:.2f} ms")
print(f"  FPS: {1000/total_async_main:.1f}")
print(f"  Real-time (30 FPS): {'✅ YES' if total_async_main < 33.33 else '❌ NO'}")

# 4. Comparison with previous results
print("\n" + "="*70)
print("IMPROVEMENT ANALYSIS")
print("="*70)

print(f"\nPrevious (Both on GPU):")
print(f"  YOLO: ~25 ms")
print(f"  Hybrid: 136 ms")
print(f"  Total: ~161 ms (6.2 FPS)")

print(f"\nCurrent (CPU/GPU Split):")
print(f"  YOLO (CPU): {avg_yolo:.2f} ms")
print(f"  Hybrid (GPU): {avg_clf:.2f} ms")
print(f"  Total: {total_sequential:.2f} ms ({1000/total_sequential:.1f} FPS)")

improvement = ((161 - total_sequential) / 161) * 100
print(f"\nImprovement: {improvement:+.1f}%")

# 5. Recommendations
print("\n" + "="*70)
print("RECOMMENDATIONS")
print("="*70)

if total_async_main < 33.33:
    print("\n✅ ASYNC PROCESSING ACHIEVES REAL-TIME!")
    print("   Implement async verification for production use.")
elif total_sequential < 50:
    print("\n⚠️  CLOSE TO REAL-TIME")
    print("   Consider:")
    print("   1. Async processing (recommended)")
    print("   2. Selective hybrid (every 2nd/3rd frame)")
    print("   3. Use YOLOv11n (nano) instead of YOLOv11s")
else:
    print("\n❌ STILL TOO SLOW FOR REAL-TIME")
    print("   Options:")
    print("   1. Use primary model only (faster)")
    print("   2. Implement async processing")
    print("   3. Reduce frame rate")

print("\n" + "="*70)
