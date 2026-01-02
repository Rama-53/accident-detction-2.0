import matplotlib.pyplot as plt
import numpy as np

# Set style
plt.rcParams['figure.facecolor'] = 'white'
plt.rcParams['axes.grid'] = True
plt.rcParams['grid.alpha'] = 0.3
plt.rcParams['grid.linestyle'] = '--'

# Create figure with 2 subplots
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))

# ============================================================================
# 1. Hybrid (RNN + CNN) Model - Left Plot
# ============================================================================
# Data points approximated from the image
# (X, Y) -> (Accuracy, F1 Score)
x1 = [85, 86, 87, 88, 89, 90]
y1 = [81, 83, 84, 85, 86, 87]

ax1.plot(x1, y1, marker='o', color='blue', linewidth=2, markersize=6)
ax1.set_title('Hybrid (RNN + CNN) Model', fontsize=14)
ax1.set_xlabel('Accuracy', fontsize=12)
ax1.set_ylabel('F1 Score', fontsize=12)
ax1.set_xticks(x1)
ax1.set_yticks(range(81, 88))
ax1.set_ylim(80.5, 87.5)

# ============================================================================
# 2. CNN-based Model - Right Plot
# ============================================================================
# Data points approximated from the image
x2 = [82, 83, 84, 85, 86, 87]
y2 = [77, 78, 79, 80, 81, 82]

ax2.plot(x2, y2, marker='s', color='#2ca02c', linewidth=2, markersize=6)  # Green color similar to image
ax2.set_title('CNN-based Model', fontsize=14)
ax2.set_xlabel('Accuracy', fontsize=12)
ax2.set_ylabel('F1 Score', fontsize=12)
ax2.set_xticks(x2)
ax2.set_yticks(range(77, 83))
ax2.set_ylim(76.5, 82.5)

# ============================================================================
# Global formatting
# ============================================================================
plt.suptitle('Performance Analysis', fontsize=24, y=0.98)

# Add bottom text annotations
# Using figure coordinates (0-1) to place text at the bottom
fig.text(0.25, 0.02, 'Proposed System', ha='center', fontsize=14, fontweight='normal')
fig.text(0.75, 0.02, r'$Accuracy = \frac{TP+TN}{TP+TN+FP+FN} \times 100$', ha='center', fontsize=14, fontstyle='italic')

# Layout adjustment
plt.tight_layout()
plt.subplots_adjust(top=0.85, bottom=0.15)  # Make room for title and bottom text

# Save figure
output_file = 'performance_curves.png'
plt.savefig(output_file, dpi=300, bbox_inches='tight')
print(f"✅ Generated {output_file}")
