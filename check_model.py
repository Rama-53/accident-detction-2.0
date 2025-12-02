
import torch
import sys

try:
    path = "classifier/my_model.pth"
    print(f"Loading {path}...")
    state = torch.load(path, map_location="cpu")
    
    print("Keys found:", len(state.keys()))
    
    # Check for fc.weight to infer output size
    if "fc.weight" in state:
        shape = state["fc.weight"].shape
        print(f"fc.weight shape: {shape}")
        if shape[0] == 2:
            print("Confirmed: 2 output classes.")
        else:
            print(f"WARNING: Output classes = {shape[0]}")
    else:
        print("WARNING: 'fc.weight' not found. Keys start with:", list(state.keys())[:5])
        
except Exception as e:
    print(f"Error loading model: {e}")
