import os
import sys
import time
import numpy as np

print("="*70)
print("YOLO MODEL COMPARISON BENCHMARK")
print("="*70)

sys.path.insert(0, 'detector')
from detector import AccidentDetector

# Test frame
test_frame = np.zeros((640, 480, 3), dtype=np.uint8)

models_to_test = [
    ("yolov8n.pt", "YOLOv8n"),
    ("yolo11n.pt", "YOLOv11n"),
    ("yolo11s.pt", "YOLOv11s"),
]

results = []

for model_path, model_name in models_to_test:
    if not os.path.exists(model_path):
        print(f"\n{model_name}: ❌ Not found ({model_path})")
        continue
    
    print(f"\nTesting {model_name}...")
    try:
        detector = AccidentDetector(model_path=model_path)
        
        # Warmup
        for _ in range(3):
            detector.process_frame(test_frame)
        
        # Benchmark
        times = []
        for i in range(20):
            start = time.time()
            result = detector.process_frame(test_frame)
            elapsed = (time.time() - start) * 1000
            times.append(elapsed)
        
        avg_time = np.mean(times)
        min_time = np.min(times)
        max_time = np.max(times)
        fps = 1000 / avg_time
        
        print(f"  Average: {avg_time:.2f}ms")
        print(f"  Min:     {min_time:.2f}ms")
        print(f"  Max:     {max_time:.2f}ms")
        print(f"  FPS:     {fps:.1f}")
        
        results.append({
            'name': model_name,
            'path': model_path,
            'avg_time': avg_time,
            'fps': fps
        })
        
    except Exception as e:
        print(f"  ❌ Error: {e}")

# Summary
print("\n" + "="*70)
print("COMPARISON SUMMARY")
print("="*70)

if results:
    print(f"\n{'Model':<15} | {'Avg Time':<12} | {'FPS':<8} | {'vs YOLOv11n':<12}")
    print("-" * 60)
    
    # Sort by speed (fastest first)
    results.sort(key=lambda x: x['avg_time'])
    
    yolo11n_time = next((r['avg_time'] for r in results if 'YOLOv11n' in r['name']), None)
    
    for r in results:
        improvement = ""
        if yolo11n_time and r['name'] != 'YOLOv11n':
            diff = ((yolo11n_time - r['avg_time']) / yolo11n_time) * 100
            improvement = f"{diff:+.1f}%"
        
        print(f"{r['name']:<15} | {r['avg_time']:>10.2f}ms | {r['fps']:>6.1f} | {improvement:<12}")
    
    # Recommendation
    fastest = results[0]
    print(f"\n✅ FASTEST: {fastest['name']} ({fastest['avg_time']:.2f}ms, {fastest['fps']:.1f} FPS)")
    
    # Calculate combined performance with primary classifier
    primary_time = 11  # From previous benchmark
    combined_time = fastest['avg_time'] + primary_time
    combined_fps = 1000 / combined_time
    
    print(f"\nWith Primary Classifier ({primary_time}ms):")
    print(f"  Total: {combined_time:.2f}ms")
    print(f"  FPS: {combined_fps:.1f}")
    print(f"  Real-time (30 FPS): {'✅ YES' if combined_fps >= 30 else '❌ NO'}")
    
    if combined_fps >= 30:
        print(f"\n🎉 REAL-TIME ACHIEVED with {fastest['name']}!")
    elif combined_fps >= 20:
        print(f"\n⚠️  Close to real-time. Consider frame skipping for 30+ FPS.")
    else:
        print(f"\n❌ Still below real-time. Frame skipping recommended.")

else:
    print("\n❌ No models could be tested")

print("\n" + "="*70)
