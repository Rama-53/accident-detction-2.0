import matplotlib
matplotlib.use('Agg') # Force non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import matplotlib.colors as mcolors
import numpy as np

def draw_3d_box(ax, center, width, height, depth, color, label, subtitle=None, alpha=0.9):
    """
    Draws a 3D box using oblique projection logic.
    center: tuple (x, y) of the front face center
    width, height: dimensions of the front face
    depth: perceived depth (offset for x and y)
    """
    cx, cy = center
    # Calculate corners of front face
    x = cx - width / 2
    y = cy - height / 2
    
    # Projection angle for "side view" (oblique)
    dx = depth * 0.5
    dy = depth * 0.4

    # Colors (Top/Side are darker for shading effect)
    base_color = mcolors.to_rgb(color)
    side_color = [max(0, c * 0.8) for c in base_color] # darker
    top_color = [max(0, c * 0.9) for c in base_color]  # slightly darker

    # 1. SIDE FACE (Right)
    # Coordinates: (x+w, y), (x+w+dx, y+dy), (x+w+dx, y+h+dy), (x+w, y+h)
    side_poly = [
        (x + width, y),
        (x + width + dx, y + dy),
        (x + width + dx, y + height + dy),
        (x + width, y + height)
    ]
    ax.add_patch(patches.Polygon(side_poly, facecolor=side_color, edgecolor='black', linewidth=1, alpha=alpha))

    # 2. TOP FACE
    # Coordinates: (x, y+h), (x+w, y+h), (x+w+dx, y+h+dy), (x+dx, y+h+dy)
    top_poly = [
        (x, y + height),
        (x + width, y + height),
        (x + width + dx, y + height + dy),
        (x + dx, y + height + dy)
    ]
    ax.add_patch(patches.Polygon(top_poly, facecolor=top_color, edgecolor='black', linewidth=1, alpha=alpha))

    # 3. FRONT FACE
    rect = patches.Rectangle((x, y), width, height, facecolor=color, edgecolor='black', linewidth=1.5, alpha=alpha)
    ax.add_patch(rect)

    # Label styling
    ax.text(cx, cy, label, ha='center', va='center', fontsize=9, fontweight='bold', zorder=10)
    if subtitle:
        ax.text(cx, cy - height/2 - 0.3, subtitle, ha='center', va='top', fontsize=8, style='italic', zorder=10)
    
    # Return connection points
    left_conn = (x, cy)
    right_conn = (x + width + dx, cy + dy/2) 
    return (cx, cy), right_conn, left_conn

def draw_arrow(ax, p1, p2, style="->"):
    ax.annotate("", xy=p2, xytext=p1, 
                arrowprops=dict(arrowstyle=style, lw=1.5, color='#444444', shrinkA=5, shrinkB=5))

def generate_diagram():
    fig, ax = plt.subplots(figsize=(24, 10))
    ax.set_xlim(0, 24)
    ax.set_ylim(0, 10)
    ax.axis('off')

    # Colors
    c_input = '#ffebee'   # Red tint
    c_conv = '#bbdefb'    # Blue tint (glassy)
    c_dense = '#ffe0b2'   # Orange tint
    c_resnet = '#fff9c4'  # Gold tint
    c_logic = '#e1bee7'   # Purple tint

    # --- 1. INPUT ---
    # Draw input as a generic image box
    input_c, input_r, input_l = draw_3d_box(ax, (2, 5), 2.5, 2.5, 0.5, c_input, "Input\nROI", "Color Image")

    # --- 2. TOP STREAM (Primary CNN) ---
    # Stacking blocks horizontally
    # Conv1: Large spatial, small depth
    c1_c, c1_r, c1_l = draw_3d_box(ax, (6, 7.5), 1.5, 1.5, 0.8, c_conv, "Conv\nBlock 1", "16 Filters")
    # Conv2: Smaller spatial, larger depth
    c2_c, c2_r, c2_l = draw_3d_box(ax, (8.5, 7.5), 1.2, 1.2, 1.5, c_conv, "Conv\nBlock 2", "32 Filters")
    # Conv3: Smaller spatial
    c3_c, c3_r, c3_l = draw_3d_box(ax, (11, 7.5), 1.0, 1.0, 0.8, c_conv, "Conv\nBlock 3", "16 Filters")
    
    # Flatten (long thin bar)
    flat_c, flat_r, flat_l = draw_3d_box(ax, (13, 7.5), 0.2, 2.0, 0.2, '#eeeeee', "Flat")
    
    # Dense
    dense_c, dense_r, dense_l = draw_3d_box(ax, (15, 7.5), 0.5, 2.0, 0.5, c_dense, "Dense", "256 -> 1")

    # Connect Top
    draw_arrow(ax, (input_r[0], input_r[1] + 1), c1_l)
    draw_arrow(ax, c1_r, c2_l)
    draw_arrow(ax, c2_r, c3_l)
    draw_arrow(ax, c3_r, flat_l)
    draw_arrow(ax, flat_r, dense_l)

    # --- 3. BOTTOM STREAM (ResNet50) ---
    # Visualized as a deeper sequence of gold blocks
    r1_c, r1_r, r1_l = draw_3d_box(ax, (6, 2.5), 1.2, 1.2, 1.0, c_resnet, "Stage 1")
    r2_c, r2_r, r2_l = draw_3d_box(ax, (8, 2.5), 1.0, 1.0, 1.2, c_resnet, "Stage 2")
    r3_c, r3_r, r3_l = draw_3d_box(ax, (10, 2.5), 0.8, 0.8, 1.5, c_resnet, "Stage 3")
    r4_c, r4_r, r4_l = draw_3d_box(ax, (12, 2.5), 0.6, 0.6, 1.5, c_resnet, "Stage 4")
    
    # Custom Head (distinctive)
    head_c, head_r, head_l = draw_3d_box(ax, (15, 2.5), 1.5, 1.5, 1.0, c_dense, "Custom\nHead", "512 -> 256")

    # Connect Bottom
    draw_arrow(ax, (input_r[0], input_r[1] - 1), r1_l)
    draw_arrow(ax, r1_r, r2_l)
    draw_arrow(ax, r2_r, r3_l)
    draw_arrow(ax, r3_r, r4_l)
    draw_arrow(ax, r4_r, head_l)

    # Skip connections (curved arrows)
    for start, end in [(r1_r, r2_l), (r2_r, r3_l), (r3_r, r4_l)]:
        # Draw a simple arc above
        mid_x = (start[0] + end[0]) / 2
        mid_y = start[1] + 1.2
        # Simple bezier-like curve using annotate curvature
        ax.annotate("", xy=end, xytext=start, 
                    arrowprops=dict(arrowstyle="->", connectionstyle="arc3,rad=-0.5", 
                                    color='orange', lw=1.5, ls='--'))

    # --- 4. FUSION ---
    fusion_c, fusion_r, fusion_l = draw_3d_box(ax, (19, 5), 2.0, 3.0, 1.0, c_logic, "Decision\nLogic")

    # Connect to Fusion
    draw_arrow(ax, dense_r, (fusion_l[0], fusion_l[1] + 1.5))
    draw_arrow(ax, head_r, (fusion_l[0], fusion_l[1] - 1.5))

    # --- 5. OUTPUT ---
    out_c, out_r, out_l = draw_3d_box(ax, (22.5, 5), 1.0, 1.0, 0.5, '#ffcdd2', "!", "ALERT")
    draw_arrow(ax, fusion_r, out_l)

    # Figure Caption
    ax.text(12, 0.5, "Fig. 1. Hybrid Dual-Stream Architecture: Parallel Real-Time Screening (Primary CNN) and\nHigh-Precision Verification (ResNet50) with Logical Fusion.", 
            ha='center', fontsize=14, fontweight='bold', color='#222222')
    
    output_path = "docs/architecture_3d_generated.png"
    plt.savefig(output_path, dpi=300, bbox_inches='tight', transparent=False)
    print(f"Diagram saved to {output_path}")

if __name__ == "__main__":
    generate_diagram()
