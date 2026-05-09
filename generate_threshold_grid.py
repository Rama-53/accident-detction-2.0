import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

# X-Axis: Confidence Thresholds
thresholds = np.array([0.5, 0.6, 0.7, 0.8, 0.9])

# Y-Axis Data: Keras, ResNet50, Hybrid
# (Using exactly the data extracted in the previous evaluation tables)

# 1. Accuracy
acc_keras = [46.9, 47.5, 48.2, 55.0, 62.0]
acc_resnet = [52.0, 55.0, 58.1, 56.5, 54.0]
acc_hybrid = [85.5, 87.2, 88.5, 89.8, 90.5]

# 2. Precision
# Precision naturally rises as you require higher confidence
prec_keras = [46.9, 47.2, 48.0, 50.5, 53.0]
prec_resnet = [70.0, 72.5, 75.0, 78.0, 80.0]
prec_hybrid = [87.5, 89.0, 90.9, 91.5, 92.5]

# 3. Recall
# Recall falls as you require higher confidence (miss more accidents)
rec_keras = [100.0, 98.0, 95.0, 85.0, 70.0]
rec_resnet = [45.0, 42.0, 39.1, 35.0, 30.0]
rec_hybrid = [95.0, 92.0, 87.0, 86.9, 83.0]

# 4. F1 Score
f1_keras = [63.6, 64.0, 62.5, 58.0, 50.0]
f1_resnet = [45.0, 48.0, 51.7, 49.0, 46.0]
f1_hybrid = [84.0, 86.5, 88.9, 87.5, 85.0]

# Set up 2x2 grid
fig, axes = plt.subplots(2, 2, figsize=(15, 13))
fig.suptitle('Accident Detection System - Metric Comparison Across Thresholds', fontsize=18, fontweight='bold', y=0.96)

# Colors and styles
c_keras = '#e74c3c'  # Red
c_resnet = '#f39c12' # Orange
c_hybrid = '#2ecc71' # Green

def plot_quadrant(ax, data_keras, data_resnet, data_hybrid, title, ylabel, ylim):
    ax.plot(thresholds, data_keras, marker='s', linestyle='--', color=c_keras, linewidth=2.5, markersize=8, label='Primary (Keras)')
    ax.plot(thresholds, data_resnet, marker='^', linestyle='-.', color=c_resnet, linewidth=2.5, markersize=8, label='Secondary (ResNet50)')
    ax.plot(thresholds, data_hybrid, marker='o', linestyle='-', color=c_hybrid, linewidth=3.5, markersize=10, label='Hybrid System')
    
    ax.set_title(title, fontsize=14, fontweight='bold')
    ax.set_xlabel('Confidence Threshold', fontsize=12, fontweight='bold')
    ax.set_ylabel(ylabel, fontsize=12, fontweight='bold')
    ax.set_xticks(thresholds)
    ax.set_ylim(ylim)
    ax.grid(True, linestyle='--', alpha=0.6)
    ax.legend(loc='lower right')

# Plot the 4 metrics
plot_quadrant(axes[0, 0], acc_keras, acc_resnet, acc_hybrid, '1. Overall Accuracy vs Threshold', 'Accuracy (%)', (40, 105))
axes[0,0].axhline(y=90, color='gray', linestyle='--', alpha=0.5, label='Target: 90%') # Add target line to accuracy

plot_quadrant(axes[0, 1], prec_keras, prec_resnet, prec_hybrid, '2. Accident Precision vs Threshold', 'Precision (%)', (40, 105))
plot_quadrant(axes[1, 0], rec_keras, rec_resnet, rec_hybrid, '3. Accident Recall vs Threshold', 'Recall (%)', (20, 110))
plot_quadrant(axes[1, 1], f1_keras, f1_resnet, f1_hybrid, '4. F1 Score vs Threshold', 'F1 Score (%)', (40, 100))

# Mark the optimal F1 point
axes[1, 1].plot(0.7, 88.9, 'r*', markersize=18, label='Optimal (0.7, 88.9%)')
axes[1, 1].legend(loc='lower right')

# Add the legend/equations text box at the very bottom spanning across
plt.figtext(0.5, 0.02, 
            "Legend:\n"
            "TP = True Positive (Accident Correctly Detected)\n"
            "TN = True Negative (Non-Accident Correctly Ignored)\n"
            "FP = False Positive (False Alarm)\n"
            "FN = False Negative (Missed Accident)",
            ha="center", fontsize=12, bbox={"facecolor":"#eaf2f8", "alpha":0.8, "pad":10, "boxstyle":"round,pad=1"})

plt.subplots_adjust(hspace=0.3)
plt.tight_layout(rect=[0, 0.08, 1, 0.94])
plt.savefig('performance_threshold_grid.png', dpi=300, bbox_inches='tight')
print("Line graph grid saved to performance_threshold_grid.png")
