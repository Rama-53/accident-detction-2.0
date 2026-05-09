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

# Set up the figure explicitly for A4 Dimensions
fig = plt.figure(figsize=(A4_WIDTH, A4_HEIGHT))

# Main Title - Give it plenty of breathing room at the top
fig.suptitle('Accident Detection System - Comprehensive Performance Analysis', 
             fontsize=15, fontweight='bold', y=0.96)

# Define a 2x2 grid in the UPPER 60% of the figure
# Lifted the bottom margin up from 0.40 to 0.45 to give even MORE room below the graphs
gs = fig.add_gridspec(2, 2, left=0.08, right=0.95, top=0.90, bottom=0.45, wspace=0.25, hspace=0.35)

axes = [
    [fig.add_subplot(gs[0, 0]), fig.add_subplot(gs[0, 1])],
    [fig.add_subplot(gs[1, 0]), fig.add_subplot(gs[1, 1])]
]

# Colors and styles
c_keras = '#e74c3c'  # Red
c_resnet = '#f39c12' # Orange
c_hybrid = '#2ecc71' # Green

def plot_quadrant(ax, data_keras, data_resnet, data_hybrid, title, ylabel, ylim):
    l1, = ax.plot(thresholds, data_keras, marker='s', linestyle='--', color=c_keras, linewidth=2.0, markersize=6, label='Primary (Keras)')
    l2, = ax.plot(thresholds, data_resnet, marker='^', linestyle='-.', color=c_resnet, linewidth=2.0, markersize=6, label='Secondary (ResNet50)')
    l3, = ax.plot(thresholds, data_hybrid, marker='o', linestyle='-', color=c_hybrid, linewidth=3.0, markersize=8, label='Hybrid System')
    
    ax.set_title(title, fontsize=11, fontweight='bold', pad=10)
    ax.set_xlabel('Confidence Threshold', fontsize=10)
    ax.set_ylabel(ylabel, fontsize=10)
    ax.set_xticks(thresholds)
    ax.set_ylim(ylim)
    ax.grid(True, linestyle='--', alpha=0.5)
    
    return [l1, l2, l3], ['Primary (Keras)', 'Secondary (ResNet50)', 'Hybrid System']

# Plot the 4 metrics and collect the line objects
lines, labels = plot_quadrant(axes[0][0], acc_keras, acc_resnet, acc_hybrid, '1. Overall Accuracy', 'Accuracy (%)', (40, 105))
plot_quadrant(axes[0][1], prec_keras, prec_resnet, prec_hybrid, '2. Accident Precision', 'Precision (%)', (40, 105))
plot_quadrant(axes[1][0], rec_keras, rec_resnet, rec_hybrid, '3. Accident Recall', 'Recall (%)', (20, 110))
plot_quadrant(axes[1][1], f1_keras, f1_resnet, f1_hybrid, '4. F1 Score', 'F1 Score (%)', (40, 100))

# Add the target line and optimal star explicitly
l_target = axes[0][0].axhline(y=90, color='gray', linestyle='--', alpha=0.5, label='Target: 90%')
l_star, = axes[1][1].plot(0.7, 88.9, 'r*', markersize=14, label='Optimal (0.7, 88.9%)')

lines.extend([l_target, l_star])
labels.extend(['Target: 90%', 'Optimal (0.7, 88.9%)'])

# Create a massive GLOBAL LEGEND at Y=0.36 (safely below the bottom graph axes which end at Y=0.45)
fig.legend(lines, labels, loc='upper center', bbox_to_anchor=(0.5, 0.38), ncol=3, fontsize=10, frameon=True, borderpad=1)

# Equations Text Box (Bottom Left corner)
# Shifted Y coordinate up slightly to 0.08 to ensure it absolutely clears the bottom border
equations_text = (
    "Mathematical Equations Used:\n\n"
    r"1. Accuracy = $\frac{TP + TN}{Total Samples} \times 100$" "\n\n"
    r"2. Precision = $\frac{TP}{TP + FP} \times 100$" "\n\n"
    r"3. Recall (Sensitivity) = $\frac{TP}{TP + FN} \times 100$" "\n\n"
    r"4. F1 Score = $2 \times \frac{Precision \times Recall}{Precision + Recall}$" "\n\n"
    r"5. False Positive Rate (FPR) = $\frac{FP}{FP + TN} \times 100$"
)
plt.figtext(0.12, 0.08, equations_text,
            ha="left", va="bottom", fontsize=11, fontweight='bold',
            bbox={"facecolor":"white", "alpha":0.0, "pad":0, "edgecolor":"none" })

# Legend Terminology Text Box (Bottom Right corner)
# Shifted X to 0.52 to move it away from center overlap, Shifted Y to 0.12 to clear bottom
terminology_text = (
    "Legend Terminology:\n\n"
    "TP = True Positive (Accident Correctly Detected)\n"
    "TN = True Negative (Non-Accident Correctly Ignored)\n"
    "FP = False Positive (False Alarm)\n"
    "FN = False Negative (Missed Accident)"
)
plt.figtext(0.52, 0.12, terminology_text,
            ha="left", va="bottom", fontsize=10,
            bbox={"facecolor":"#eaf2f8", "alpha":0.8, "pad":12, "boxstyle":"round,pad=1"})

# Draw a bounding box around the entire page just for styling
rect = plt.Rectangle((0.01, 0.01), 0.98, 0.98, fill=False, color="gray", lw=2, transform=fig.transFigure, figure=fig)
fig.patches.extend([rect])

# Note: tight_layout is intentionally NOT USED here because Gridspec precisely controls all margins to prevent overlaps
plt.savefig('performance_threshold_a4_report.png', dpi=300)
print("A4 Report graph saved to performance_threshold_a4_report.png")
