import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# Data
models = ['Keras', 'ResNet50', 'Hybrid\n(Keras + ResNet50)']
accuracy = [46.9, 58.2, 89.8]
precision = [46.9, 75.0, 90.9]
recall = [100.0, 39.1, 87.0]
f1_score = [63.6, 51.7, 88.9]

fig, axes = plt.subplots(2, 2, figsize=(14, 12))
fig.suptitle('Accident Detection System - Performance Line Graphs', fontsize=18, fontweight='bold', y=0.98)

# Colors and styles
c_acc = '#3498db'  # Blue
c_prec = '#2ecc71' # Green (Changed from red to match original bar chart vibes usually)
c_rec = '#e74c3c'  # Red
c_f1 = '#f39c12'   # Orange

# 1. Accuracy
ax1 = axes[0, 0]
ax1.plot(models, accuracy, marker='o', linestyle='-', color=c_acc, linewidth=3, markersize=10, label='Overall Accuracy')
ax1.set_title('1. Overall Model Accuracy', fontsize=14, fontweight='bold')
ax1.set_ylabel('Accuracy (%)', fontsize=12, fontweight='bold')
ax1.set_ylim(0, 120)
ax1.grid(True, linestyle='--', alpha=0.6)
for i, v in enumerate(accuracy):
    ax1.text(i, v + 4, f'{v}%', ha='center', color='black', fontweight='bold', fontsize=10)
ax1.axhline(y=90, color='gray', linestyle='--', alpha=0.5, label='Target: 90%')
ax1.legend(loc='upper left')

# 2. Precision
ax2 = axes[0, 1]
ax2.plot(models, precision, marker='s', linestyle='-', color=c_prec, linewidth=3, markersize=10, label='Accident Precision')
ax2.set_title('2. Accident Precision (Fewer False Alarms)', fontsize=14, fontweight='bold')
ax2.set_ylabel('Precision (%)', fontsize=12, fontweight='bold')
ax2.set_ylim(0, 120)
ax2.grid(True, linestyle='--', alpha=0.6)
for i, v in enumerate(precision):
    ax2.text(i, v + 4, f'{v}%', ha='center', color='black', fontweight='bold', fontsize=10)
ax2.legend(loc='upper left')

# 3. Recall
ax3 = axes[1, 0]
ax3.plot(models, recall, marker='^', linestyle='-', color=c_rec, linewidth=3, markersize=10, label='Accident Recall')
ax3.set_title('3. Accident Recall (Missed Accidents)', fontsize=14, fontweight='bold')
ax3.set_ylabel('Recall (%)', fontsize=12, fontweight='bold')
ax3.set_ylim(0, 125)
ax3.grid(True, linestyle='--', alpha=0.6)
for i, v in enumerate(recall):
    ax3.text(i, v + 4, f'{v}%', ha='center', color='black', fontweight='bold', fontsize=10)
ax3.legend(loc='upper left')

# 4. F1 Score
ax4 = axes[1, 1]
ax4.plot(models, f1_score, marker='D', linestyle='-', color=c_f1, linewidth=3, markersize=10, label='F1 Score')
ax4.set_title('4. F1 Score (Balance of Prec & Rec)', fontsize=14, fontweight='bold')
ax4.set_ylabel('F1 Score (%)', fontsize=12, fontweight='bold')
ax4.set_ylim(0, 120)
ax4.grid(True, linestyle='--', alpha=0.6)
for i, v in enumerate(f1_score):
    ax4.text(i, v + 4, f'{v}%', ha='center', color='black', fontweight='bold', fontsize=10)
ax4.legend(loc='upper left')

# Add the legend/equations text box at the very bottom spanning across
plt.figtext(0.5, 0.02, 
            "Legend:\n"
            "TP = True Positive (Accident Correctly Detected)\n"
            "TN = True Negative (Non-Accident Correctly Ignored)\n"
            "FP = False Positive (False Alarm)\n"
            "FN = False Negative (Missed Accident)",
            ha="center", fontsize=11, bbox={"facecolor":"#eaf2f8", "alpha":0.8, "pad":10, "boxstyle":"round,pad=1"})

plt.tight_layout(rect=[0, 0.08, 1, 0.96])
plt.savefig('performance_line_grid.png', dpi=300, bbox_inches='tight')
print("Line graph grid saved to performance_line_grid.png")
