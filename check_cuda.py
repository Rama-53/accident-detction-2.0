import torch
import sys

try:
    print(f"Torch version: {torch.__version__}")
    if torch.cuda.is_available():
        print(f"CUDA is available. Device count: {torch.cuda.device_count()}")
        print(f"Current device: {torch.cuda.current_device()}")
        print(f"Device name: {torch.cuda.get_device_name(0)}")
    else:
        print("CUDA is NOT available.")
except Exception as e:
    print(f"Error checking CUDA: {e}")
    sys.exit(1)
