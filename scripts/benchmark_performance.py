import os
import sys
import time
import numpy as np
from PIL import Image

# Add classifier to path
sys.path.insert(0, 'classifier')

print("="*70)
print("REAL-TIME PERFORMANCE COMPARISON")
print("="*70)

# Test image
test_img = Image.new('RGB', (256, 256), color='red')

# 1. Test Primary Model (accidents.keras)
print("\n1. Testing Primary Model (accidents.keras)...")
from cnn_classifier import AccidentClassifier

primary_clf = AccidentClassifier()
times_primary = []

# Warmup
for _ in range(5):
    primary_clf.predict(test_img)

# Measure
for i in range(50):
    start = time.time()
    result = primary_clf.predict(test_img)
    elapsed = (time.time() - start) * 1000  # Convert to ms
    times_primary.append(elapsed)

avg_primary = np.mean(times_primary)
min_primary = np.min(times_primary)
max_primary = np.max(times_primary)

print(f"  Average: {avg_primary:.2f} ms")
print(f"  Min:     {min_primary:.2f} ms")
print(f"  Max:     {max_primary:.2f} ms")

# 2. Test Hybrid Model
print("\n2. Testing Hybrid Model (Both models)...")
from hybrid_classifier import HybridAccidentClassifier

hybrid_clf = HybridAccidentClassifier()
times_hybrid = []

# Warmup
for _ in range(5):
    hybrid_clf.predict(test_img)

# Measure
for i in range(50):
    start = time.time()
    result = hybrid_clf.predict(test_img)
    elapsed = (time.time() - start) * 1000  # Convert to ms
    times_hybrid.append(elapsed)

avg_hybrid = np.mean(times_hybrid)
min_hybrid = np.min(times_hybrid)
max_hybrid = np.max(times_hybrid)

print(f"  Average: {avg_hybrid:.2f} ms")
print(f"  Min:     {min_hybrid:.2f} ms")
print(f"  Max:     {max_hybrid:.2f} ms")

# 3. Comparison
print("\n" + "="*70)
print("PERFORMANCE COMPARISON")
print("="*70)
print(f"\n{'Model':<20} | {'Avg Time':<12} | {'Min Time':<12} | {'Max Time':<12} | {'FPS':<8}")
print("-" * 75)
print(f"{'Primary (Single)':<20} | {avg_primary:>10.2f}ms | {min_primary:>10.2f}ms | {max_primary:>10.2f}ms | {1000/avg_primary:>6.1f}")
print(f"{'Hybrid (Dual)':<20} | {avg_hybrid:>10.2f}ms | {min_hybrid:>10.2f}ms | {max_hybrid:>10.2f}ms | {1000/avg_hybrid:>6.1f}")

slowdown = ((avg_hybrid - avg_primary) / avg_primary) * 100
print(f"\nSlowdown: {slowdown:+.1f}%")
print(f"Additional time per frame: {avg_hybrid - avg_primary:.2f} ms")

# Real-time analysis
print("\n" + "="*70)
print("REAL-TIME CAPABILITY ANALYSIS")
print("="*70)

target_fps = 30
target_time = 1000 / target_fps  # 33.33 ms for 30 FPS

print(f"\nTarget: {target_fps} FPS ({target_time:.2f} ms per frame)")
print(f"\nPrimary Model:")
print(f"  Average time: {avg_primary:.2f} ms")
print(f"  Can achieve: {1000/avg_primary:.1f} FPS")
print(f"  Real-time capable: {'✅ YES' if avg_primary < target_time else '❌ NO'}")

print(f"\nHybrid Model:")
print(f"  Average time: {avg_hybrid:.2f} ms")
print(f"  Can achieve: {1000/avg_hybrid:.1f} FPS")
print(f"  Real-time capable: {'✅ YES' if avg_hybrid < target_time else '❌ NO'}")

# Recommendations
print("\n" + "="*70)
print("RECOMMENDATIONS")
print("="*70)

if avg_hybrid < target_time:
    print("\n✅ Hybrid model is FAST ENOUGH for real-time (30 FPS)")
    print("   Recommendation: Use hybrid model for best accuracy")
else:
    print("\n⚠️  Hybrid model is TOO SLOW for real-time (30 FPS)")
    print("   Options:")
    print("   1. Use primary model only (faster but more false alarms)")
    print("   2. Reduce frame rate (process every 2nd or 3rd frame)")
    print("   3. Use GPU optimization")
    print("   4. Implement async processing (queue frames)")

print("\n" + "="*70)
