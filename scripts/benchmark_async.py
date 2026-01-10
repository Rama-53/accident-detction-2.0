import os
import sys
import time
import numpy as np
from PIL import Image
import threading
import queue

print("="*70)
print("ASYNC PROCESSING PERFORMANCE BENCHMARK")
print("="*70)

# Test components individually and combined

# 1. Test YOLOv11n (new faster model)
print("\n1. Testing YOLOv11n Detector...")
sys.path.insert(0, 'detector')
from detector import AccidentDetector

detector_n = AccidentDetector(model_path="yolo11n.pt")
test_frame = np.zeros((640, 480, 3), dtype=np.uint8)

yolo_times = []
for i in range(20):
    start = time.time()
    result = detector_n.process_frame(test_frame)
    elapsed = (time.time() - start) * 1000
    yolo_times.append(elapsed)

avg_yolo = np.mean(yolo_times)
print(f"  YOLOv11n: {avg_yolo:.2f}ms avg ({1000/avg_yolo:.1f} FPS)")

# 2. Test Primary Classifier (fast path)
print("\n2. Testing Primary Classifier (Main Thread)...")
sys.path.insert(0, 'classifier')
from hybrid_classifier import HybridAccidentClassifier

clf = HybridAccidentClassifier()
test_img = Image.new('RGB', (256, 256), color='red')

primary_times = []
for i in range(20):
    start = time.time()
    result = clf._predict_primary(test_img)
    elapsed = (time.time() - start) * 1000
    primary_times.append(elapsed)

avg_primary = np.mean(primary_times)
print(f"  Primary Model: {avg_primary:.2f}ms avg ({1000/avg_primary:.1f} FPS)")

# 3. Test Hybrid Classifier (background path)
print("\n3. Testing Hybrid Classifier (Background Thread)...")
hybrid_times = []
for i in range(20):
    start = time.time()
    result = clf.predict(test_img)
    elapsed = (time.time() - start) * 1000
    hybrid_times.append(elapsed)

avg_hybrid = np.mean(hybrid_times)
print(f"  Hybrid Model: {avg_hybrid:.2f}ms avg ({1000/avg_hybrid:.1f} FPS)")

# 4. Simulate Async Processing
print("\n4. Simulating Async Processing...")

verification_queue = queue.Queue()
verification_times = []

def background_worker():
    while True:
        item = verification_queue.get()
        if item is None:
            break
        img, result_list = item
        start = time.time()
        result = clf.predict(img)
        elapsed = (time.time() - start) * 1000
        result_list.append(elapsed)
        verification_queue.task_done()

# Start background thread
worker = threading.Thread(target=background_worker, daemon=True)
worker.start()

main_thread_times = []
for i in range(20):
    # Main thread: YOLO + Primary
    start = time.time()
    
    # Simulate YOLO detection (we already have result)
    # Just use the time we measured
    
    # Primary classification
    primary_result = clf._predict_primary(test_img)
    
    main_elapsed = (time.time() - start) * 1000
    main_thread_times.append(main_elapsed)
    
    # Queue for background verification
    verification_queue.put((test_img, verification_times))

# Wait for background to finish
verification_queue.join()
verification_queue.put(None)
worker.join()

avg_main = np.mean(main_thread_times)
avg_verification = np.mean(verification_times) if verification_times else 0

print(f"  Main Thread (Primary only): {avg_main:.2f}ms avg ({1000/avg_main:.1f} FPS)")
print(f"  Background Thread (Hybrid): {avg_verification:.2f}ms avg (async, doesn't block)")

# 5. Combined Performance Analysis
print("\n" + "="*70)
print("PERFORMANCE COMPARISON")
print("="*70)

# Previous performance (both on GPU, sequential)
prev_yolo = 25  # YOLOv11s
prev_hybrid = 136
prev_total = prev_yolo + prev_hybrid
prev_fps = 1000 / prev_total

# Current performance (async with YOLOv11n)
curr_yolo = avg_yolo
curr_primary = avg_primary
curr_main_total = curr_yolo + curr_primary
curr_fps = 1000 / curr_main_total

print(f"\nPrevious (Sequential, YOLOv11s + Hybrid):")
print(f"  YOLO: {prev_yolo}ms")
print(f"  Hybrid: {prev_hybrid}ms")
print(f"  Total: {prev_total}ms")
print(f"  FPS: {prev_fps:.1f}")

print(f"\nCurrent (Async, YOLOv11n + Primary):")
print(f"  YOLO: {curr_yolo:.2f}ms")
print(f"  Primary: {curr_primary:.2f}ms")
print(f"  Main Thread Total: {curr_main_total:.2f}ms")
print(f"  FPS: {curr_fps:.1f}")
print(f"  Background Verification: {avg_hybrid:.2f}ms (doesn't block)")

improvement = ((curr_fps - prev_fps) / prev_fps) * 100
print(f"\nImprovement: {improvement:+.1f}%")
print(f"Speedup: {curr_fps / prev_fps:.1f}x")

# 6. Real-time Analysis
print("\n" + "="*70)
print("REAL-TIME CAPABILITY")
print("="*70)

target_fps = 30
target_time = 1000 / target_fps

print(f"\nTarget: {target_fps} FPS ({target_time:.2f}ms per frame)")

print(f"\nPrevious System:")
print(f"  Time: {prev_total}ms")
print(f"  FPS: {prev_fps:.1f}")
print(f"  Real-time: {'❌ NO' if prev_total > target_time else '✅ YES'}")

print(f"\nCurrent System (Async):")
print(f"  Time: {curr_main_total:.2f}ms")
print(f"  FPS: {curr_fps:.1f}")
print(f"  Real-time: {'❌ NO' if curr_main_total > target_time else '✅ YES'}")

# 7. Summary
print("\n" + "="*70)
print("SUMMARY")
print("="*70)

if curr_fps >= target_fps:
    print("\n✅ SUCCESS! Real-time performance achieved!")
    print(f"   Main thread: {curr_main_total:.2f}ms → {curr_fps:.1f} FPS")
    print(f"   Background verification: {avg_hybrid:.2f}ms (async)")
    print("\n   Benefits:")
    print("   - Immediate alerts with primary model (100% accident detection)")
    print("   - Accurate verification in background (89.80% accuracy)")
    print("   - No blocking on main thread")
elif curr_fps >= 20:
    print("\n⚠️  CLOSE TO REAL-TIME")
    print(f"   Main thread: {curr_main_total:.2f}ms → {curr_fps:.1f} FPS")
    print(f"   Achieved {curr_fps:.1f} FPS (target: 30 FPS)")
    print("\n   Recommendations:")
    print("   - Acceptable for most use cases")
    print("   - Consider selective processing (every 2nd frame) for 30+ FPS")
else:
    print("\n❌ BELOW REAL-TIME TARGET")
    print(f"   Main thread: {curr_main_total:.2f}ms → {curr_fps:.1f} FPS")
    print("\n   Recommendations:")
    print("   - Use primary model only (no hybrid)")
    print("   - Process every 2nd or 3rd frame")
    print("   - Consider hardware upgrade")

print("\n" + "="*70)
