import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import Rectangle

# Set style
plt.rcParams['figure.facecolor'] = 'white'
plt.rcParams['axes.grid'] = True

# Create figure with subplots
fig = plt.figure(figsize=(16, 10))
gs = fig.add_gridspec(2, 2, hspace=0.3, wspace=0.3)

# ============================================================================
# 1. Model Agreement Distribution (Top Left)
# ============================================================================
ax1 = fig.add_subplot(gs[0, 0])

agreement_data = {
    'BOTH\nACCIDENT': 0,
    'BOTH NO\nACCIDENT': 54,
    'DISAGREEMENT': 44,
    'PRIMARY NO\nACCIDENT': 0
}

colors = ['#3498db', '#2ecc71', '#e74c3c', '#95a5a6']
bars = ax1.bar(agreement_data.keys(), agreement_data.values(), color=colors, alpha=0.7, edgecolor='black')

# Add value labels on bars
for bar in bars:
    height = bar.get_height()
    if height > 0:
        ax1.text(bar.get_x() + bar.get_width()/2., height,
                f'{int(height)}\n({height/98*100:.1f}%)',
                ha='center', va='bottom', fontsize=10, fontweight='bold')

ax1.set_ylabel('Count', fontsize=12, fontweight='bold')
ax1.set_title('Model Agreement Distribution', fontsize=14, fontweight='bold', pad=20)
ax1.set_ylim(0, 60)
ax1.grid(axis='y', alpha=0.3)

# ============================================================================
# 2. Confusion Matrix (Top Right)
# ============================================================================
ax2 = fig.add_subplot(gs[0, 1])

confusion_matrix = np.array([[40, 6], [4, 48]])
im = ax2.imshow(confusion_matrix, cmap='RdYlGn', aspect='auto', vmin=0, vmax=50)

# Add text annotations
for i in range(2):
    for j in range(2):
        text = ax2.text(j, i, confusion_matrix[i, j],
                       ha="center", va="center", color="black", 
                       fontsize=24, fontweight='bold')

ax2.set_xticks([0, 1])
ax2.set_yticks([0, 1])
ax2.set_xticklabels(['Accident', 'Non Accident'], fontsize=11)
ax2.set_yticklabels(['Accident', 'Non Accident'], fontsize=11)
ax2.set_xlabel('Predicted Label', fontsize=12, fontweight='bold')
ax2.set_ylabel('True Label', fontsize=12, fontweight='bold')
ax2.set_title('Hybrid Confusion Matrix\nAccuracy: 89.80%', fontsize=14, fontweight='bold', pad=20)

# Add colorbar
cbar = plt.colorbar(im, ax=ax2, fraction=0.046, pad=0.04)
cbar.set_label('Count', rotation=270, labelpad=15, fontweight='bold')

# ============================================================================
# 3. Model Performance Comparison (Bottom Left)
# ============================================================================
ax3 = fig.add_subplot(gs[1, 0])

models = ['Primary\n(accidents.keras)', 'Secondary\n(ResNet50)', 'HYBRID']
overall_acc = [46.94, 58.16, 89.80]
accident_recall = [100.0, 39.13, 86.96]
non_acc_recall = [0.0, 75.0, 92.31]

x = np.arange(len(models))
width = 0.25

bars1 = ax3.bar(x - width, overall_acc, width, label='Overall Accuracy', 
                color='#3498db', alpha=0.8, edgecolor='black')
bars2 = ax3.bar(x, accident_recall, width, label='Accident Recall',
                color='#e74c3c', alpha=0.8, edgecolor='black')
bars3 = ax3.bar(x + width, non_acc_recall, width, label='Non-Accident Recall',
                color='#2ecc71', alpha=0.8, edgecolor='black')

ax3.set_ylabel('Percentage %', fontsize=12, fontweight='bold')
ax3.set_title('Model Performance Comparison', fontsize=14, fontweight='bold', pad=20)
ax3.set_xticks(x)
ax3.set_xticklabels(models, fontsize=10)
ax3.legend(loc='upper left', fontsize=10)
ax3.set_ylim(0, 110)
ax3.grid(axis='y', alpha=0.3)

# Add value labels on bars
for bars in [bars1, bars2, bars3]:
    for bar in bars:
        height = bar.get_height()
        if height > 0:
            ax3.text(bar.get_x() + bar.get_width()/2., height,
                    f'{height:.1f}%',
                    ha='center', va='bottom', fontsize=8)

# ============================================================================
# 4. Summary Statistics (Bottom Right)
# ============================================================================
ax4 = fig.add_subplot(gs[1, 1])
ax4.axis('off')

summary_text = """
HYBRID CLASSIFIER SUMMARY
═══════════════════════════════════════════════

PERFORMANCE
  Overall Accuracy:           89.80%
  Accident Detection:         86.96%
  Non-Accident Detection:     92.31%

IMPROVEMENT vs PRIMARY MODEL
  Accuracy:                   +42.86%
  False Alarm Reduction:      92.31%
  Accident Detection:         -13.04%

MODEL AGREEMENT
  Both Agree (Accident):      0
  Both Agree (No Acc):        54
  Disagreement:               44

KEY INSIGHT
  Hybrid approach reduces false alarms
  from 100% to 7.7% while maintaining
  87.0% accident detection rate.

  Trade-off: Catches 87.0% of accidents
  (down from 100%) but dramatically
  reduces false alarms.

CONFUSION MATRIX BREAKDOWN
  True Positives:   40  (Correct accidents)
  False Negatives:   6  (Missed accidents)
  False Positives:   4  (False alarms)
  True Negatives:   48  (Correct non-accidents)

PRECISION & RECALL
  Accident Precision:    90.91%
  Accident Recall:       86.96%
  Non-Acc Precision:     88.89%
  Non-Acc Recall:        92.31%
"""

ax4.text(0.05, 0.95, summary_text, transform=ax4.transAxes,
         fontsize=10, verticalalignment='top', fontfamily='monospace',
         bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.3))

# ============================================================================
# Main title
# ============================================================================
fig.suptitle('Hybrid Classifier Performance Analysis', 
             fontsize=18, fontweight='bold', y=0.98)

# Save figure
plt.tight_layout()
plt.savefig('hybrid_classifier_analysis.png', dpi=300, bbox_inches='tight')
print("✅ Saved: hybrid_classifier_analysis.png")

# ============================================================================
# Create second figure for performance metrics
# ============================================================================
fig2, ((ax5, ax6), (ax7, ax8)) = plt.subplots(2, 2, figsize=(16, 10))

# ============================================================================
# 5. FPS Comparison
# ============================================================================
systems = ['Baseline\nSequential', 'Async\nProcessing']
fps_values = [6.2, 40.3]
colors_fps = ['#e74c3c', '#2ecc71']

bars = ax5.bar(systems, fps_values, color=colors_fps, alpha=0.7, edgecolor='black', width=0.6)
ax5.axhline(y=30, color='orange', linestyle='--', linewidth=2, label='Real-time Threshold (30 FPS)')
ax5.set_ylabel('Frames Per Second (FPS)', fontsize=12, fontweight='bold')
ax5.set_title('System Performance Comparison', fontsize=14, fontweight='bold')
ax5.legend()
ax5.grid(axis='y', alpha=0.3)

for bar in bars:
    height = bar.get_height()
    ax5.text(bar.get_x() + bar.get_width()/2., height,
            f'{height:.1f} FPS',
            ha='center', va='bottom', fontsize=12, fontweight='bold')

# ============================================================================
# 6. Inference Time Breakdown
# ============================================================================
components = ['YOLO\nDetection', 'Primary\nClassifier', 'Total\n(Main Thread)']
baseline_times = [25.0, 136.0, 161.0]
async_times = [14.0, 11.0, 25.0]

x = np.arange(len(components))
width = 0.35

bars1 = ax6.bar(x - width/2, baseline_times, width, label='Baseline',
                color='#e74c3c', alpha=0.7, edgecolor='black')
bars2 = ax6.bar(x + width/2, async_times, width, label='Async',
                color='#2ecc71', alpha=0.7, edgecolor='black')

ax6.set_ylabel('Time (milliseconds)', fontsize=12, fontweight='bold')
ax6.set_title('Inference Time Breakdown', fontsize=14, fontweight='bold')
ax6.set_xticks(x)
ax6.set_xticklabels(components)
ax6.legend()
ax6.grid(axis='y', alpha=0.3)

# Add value labels
for bars in [bars1, bars2]:
    for bar in bars:
        height = bar.get_height()
        ax6.text(bar.get_x() + bar.get_width()/2., height,
                f'{height:.0f}ms',
                ha='center', va='bottom', fontsize=9)

# ============================================================================
# 7. Accuracy vs Speed Trade-off
# ============================================================================
configs = ['Primary\nOnly', 'Hybrid\nSequential', 'Hybrid\nAsync']
accuracy = [46.94, 89.80, 89.80]
fps = [81.4, 6.2, 40.3]

ax7_twin = ax7.twinx()

line1 = ax7.plot(configs, accuracy, 'o-', color='#3498db', linewidth=3, 
                 markersize=10, label='Accuracy')
line2 = ax7_twin.plot(configs, fps, 's-', color='#e74c3c', linewidth=3,
                      markersize=10, label='FPS')

ax7.set_ylabel('Accuracy (%)', fontsize=12, fontweight='bold', color='#3498db')
ax7_twin.set_ylabel('FPS', fontsize=12, fontweight='bold', color='#e74c3c')
ax7.set_title('Accuracy vs Speed Trade-off', fontsize=14, fontweight='bold')
ax7.tick_params(axis='y', labelcolor='#3498db')
ax7_twin.tick_params(axis='y', labelcolor='#e74c3c')
ax7.grid(alpha=0.3)

# Add value labels
for i, (acc, f) in enumerate(zip(accuracy, fps)):
    ax7.text(i, acc + 2, f'{acc:.1f}%', ha='center', fontsize=9, color='#3498db')
    ax7_twin.text(i, f + 3, f'{f:.1f}', ha='center', fontsize=9, color='#e74c3c')

# ============================================================================
# 8. Resource Utilization
# ============================================================================
resources = ['GPU\nUtilization', 'VRAM\nUsage', 'GPU\nTemp', 'Power']
baseline_res = [95, 3.8, 78, 75]
async_res = [85, 3.2, 72, 68]

x = np.arange(len(resources))
width = 0.35

bars1 = ax8.bar(x - width/2, baseline_res, width, label='Baseline',
                color='#e74c3c', alpha=0.7, edgecolor='black')
bars2 = ax8.bar(x + width/2, async_res, width, label='Async',
                color='#2ecc71', alpha=0.7, edgecolor='black')

ax8.set_ylabel('Value (%, GB, °C, W)', fontsize=12, fontweight='bold')
ax8.set_title('Resource Utilization Comparison', fontsize=14, fontweight='bold')
ax8.set_xticks(x)
ax8.set_xticklabels(resources)
ax8.legend()
ax8.grid(axis='y', alpha=0.3)

# Add value labels
for bars in [bars1, bars2]:
    for bar in bars:
        height = bar.get_height()
        ax8.text(bar.get_x() + bar.get_width()/2., height,
                f'{height:.1f}',
                ha='center', va='bottom', fontsize=9)

fig2.suptitle('System Performance Metrics', fontsize=18, fontweight='bold', y=0.98)
plt.tight_layout()
plt.savefig('performance_metrics.png', dpi=300, bbox_inches='tight')
print("✅ Saved: performance_metrics.png")

print("\n✅ All plots generated successfully!")
print("   - hybrid_classifier_analysis.png")
print("   - performance_metrics.png")
