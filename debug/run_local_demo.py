"""
run_local_demo.py
Start both publisher and a local subscriber (demo) in separate processes.
This script is optional convenience for testing locally (uses subprocesses).
"""
import subprocess
import sys
import os
from pathlib import Path

HERE = Path(__file__).parent

def main():
    # paths
    publisher = HERE / 'detector_publisher.py'
    subscriber = HERE / 'classifier_subscriber.py'

    if not publisher.exists():
        print('detector_publisher.py not found in project root. Create it or run publisher manually.')
        sys.exit(1)

    if not subscriber.exists():
        print('classifier_subscriber.py not found in project root. Create it or run subscriber manually.')
        sys.exit(1)

    # launch publisher and subscriber in two terminals (OS dependent)
    # Here we just print commands for the user to run in separate terminals.
    print('Run these two commands in separate terminals:')
    print(f'  python {publisher} --video /path/to/video.mp4')
    print(f'  python {subscriber} --host localhost --port 5556 --outdir ./accident_crops')

if __name__ == "__main__":
    main()
