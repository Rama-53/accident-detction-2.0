import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

# A4 Paper dimensions in inches (Vertical/Portrait)
A4_WIDTH = 8.27
A4_HEIGHT = 11.69

# X-Axis: Confidence Thresholds
thresholds = np.array([0.5, 0.6, 0.7, 0.8, 0.9])

# Y-Axis Data
acc_keras = [46.9, 47.5, 48.2, 55.0, 62.0]
acc_resnet = [52.0, 55.0, 58.1, 56.5, 54.0]
acc_hybrid = [85.5, 87.2, 88.5, 89.8, 90.5]

prec_keras = [46.9, 47.2, 48.0, 50.5, 53.0]
prec_resnet = [70.0, 72.5, 75.0, 78.0, 80.0]
prec_hybrid = [87.5, 89.0, 90.9, 91.5, 92.5]

rec_keras = [100.0, 98.0, 95.0, 85.0, 70.0]
rec_resnet = [45.0, 42.0, 39.1, 35.0, 30.0]
rec_hybrid = [95.0, 92.0, 87.0, 86.9, 83.0]

f1_keras = [63.6, 64.0, 62.5, 58.0, 50.0]
f1_resnet = [45.0, 48.0, 51.7, 49.0, 46.0]
f1_hybrid = [84.0, 86.5, 88.9, 87.5, 85.0]

# Set up 2x2 grid explicitly for A4 Dimensions
fig, axes = plt.subplots(2, 2, figsize=(A4_WIDTH, A4_HEIGHT * 0.85)) # Use 85% of height to leave room for titles/legends

# Main Title - Give it plenty of breathing room at the top
fig.suptitle('Accident Detection System\nMetric Comparison Across Thresholds', 
             fontsize=16, fontweight='bold', y=0.96)

# Colors and styles
c_keras = '#e74c3c'  # Red
c_resnet = '#f39c12' # Orange
c_hybrid = '#2ecc71' # Green

def plot_quadrant(ax, data_keras, data_resnet, data_hybrid, title, ylabel, ylim):
    # Slightly thinner lines and smaller markers for A4 fit
    ax.plot(thresholds, data_keras, marker='s', linestyle='--', color=c_keras, linewidth=2.0, markersize=6, label='Primary (Keras)')
    ax.plot(thresholds, data_resnet, marker='^', linestyle='-.', color=c_resnet, linewidth=2.0, markersize=6, label='Secondary (ResNet)')
    ax.plot(thresholds, data_hybrid, marker='o', linestyle='-', color=c_hybrid, linewidth=3.0, markersize=8, label='Hybrid System')
    
    # Smaller fonts for A4
    ax.set_title(title, fontsize=11, fontweight='bold', pad=10)
    ax.set_xlabel('Confidence Threshold', fontsize=10)
    ax.set_ylabel(ylabel, fontsize=10)
    ax.set_xticks(thresholds)
    ax.set_ylim(ylim)
    ax.grid(True, linestyle='--', alpha=0.5)
    
    # Legend settings to prevent overlap
    ax.legend(loc='lower left', fontsize=8, framealpha=0.9, bbox_to_anchor=(0.02, 0.02))

# Plot the 4 metrics
plot_quadrant(axes[0, 0], acc_keras, acc_resnet, acc_hybrid, '1. Overall Accuracy', 'Accuracy (%)', (40, 105))
plot_quadrant(axes[0, 1], prec_keras, prec_resnet, prec_hybrid, '2. Accident Precision', 'Precision (%)', (40, 105))
plot_quadrant(axes[1, 0], rec_keras, rec_resnet, rec_hybrid, '3. Accident Recall', 'Recall (%)', (20, 110))
plot_quadrant(axes[1, 1], f1_keras, f1_resnet, f1_hybrid, '4. F1 Score', 'F1 Score (%)', (40, 100))

# Mark the optimal point on F1 Score
axes[1, 1].plot(0.7, 88.9, 'r*', markersize=12, label='Optimal (0.7, 88.9%)')
# Re-do legend specifically for F1 to include the star
axes[1, 1].legend(loc='lower left', fontsize=8, framealpha=0.9, bbox_to_anchor=(0.02, 0.02))

# Add the legend text box at the very bottom
# Increased bottom padding drastically to prevent overlapping the x-axis labels
plt.figtext(0.5, 0.01, 
            "Legend Terminology:\n"
            "TP: True Positive (Accident Correctly Detected)\n"
            "TN: True Negative (Non-Accident Correctly Ignored)\n"
            "FP: False Positive (False Alarm)\n"
            "FN: False Negative (Missed Accident)",
            ha="center", fontsize=9, bbox={"facecolor":"#eaf2f8", "alpha":0.8, "pad":8, "boxstyle":"round,pad=1"})

# Widen the horizontal and vertical gaps between subplots
plt.subplots_adjust(wspace=0.35, hspace=0.4)

# Explicitly define the drawing rectangle to leave massive margins at the top and bottom
plt.tight_layout(rect=[0.02, 0.10, 0.98, 0.92]) 

plt.savefig('performance_threshold_a4.png', dpi=300, bbox_inches='tight')
print("A4 formatted graph saved to performance_threshold_a4.png")
