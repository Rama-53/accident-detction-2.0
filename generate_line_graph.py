import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

# Data from the provided bar chart
models = ['Keras', 'ResNet50', 'Hybrid\n(Keras + ResNet50)']
accuracy = [46.9, 58.2, 89.8]
precision = [46.9, 75.0, 90.9]
recall = [100.0, 39.1, 87.0]
f1_score = [63.6, 51.7, 88.9]

# Set up the figure and axis
fig, ax = plt.subplots(figsize=(10, 6))

# Plot lines
ax.plot(models, accuracy, marker='o', linestyle='-', color='#3498db', linewidth=2.5, markersize=8, label='Overall Accuracy')
ax.plot(models, precision, marker='s', linestyle='--', color='#e74c3c', linewidth=2.5, markersize=8, label='Accident Precision')
ax.plot(models, recall, marker='^', linestyle='-.', color='#2ecc71', linewidth=2.5, markersize=8, label='Accident Recall')
ax.plot(models, f1_score, marker='D', linestyle=':', color='#f39c12', linewidth=2.5, markersize=8, label='F1 Score')

# Add values on top of points
for i, v in enumerate(accuracy):
    ax.text(i, v + 2, f'{v}%', ha='center', color='#2980b9', fontweight='bold', fontsize=9)
for i, v in enumerate(precision):
    ax.text(i, v - 4 if i == 0 else v + 2, f'{v}%', ha='center', color='#c0392b', fontweight='bold', fontsize=9)
for i, v in enumerate(recall):
    ax.text(i, v - 4 if i == 0 else v + 2, f'{v}%', ha='center', color='#27ae60', fontweight='bold', fontsize=9)
for i, v in enumerate(f1_score):
    ax.text(i, v - 4 if i == 0 else v + 2, f'{v}%', ha='center', color='#d35400', fontweight='bold', fontsize=9)

# Formatting
ax.set_title('Accident Detection System Performance Across Models', fontsize=14, fontweight='bold', pad=20)
ax.set_ylabel('Percentage (%)', fontsize=12, fontweight='bold')
ax.set_ylim(0, 115)  # Make room for labels
ax.grid(True, linestyle='--', alpha=0.6)
ax.legend(loc='lower center', bbox_to_anchor=(0.5, -0.2), ncol=4, frameon=True)

# Add target line
ax.axhline(y=90, color='gray', linestyle='--', alpha=0.5, label='Target: 90%')

plt.tight_layout()
plt.savefig('performance_line_graph.png', dpi=300, bbox_inches='tight')
print("Line graph saved to performance_line_graph.png")
