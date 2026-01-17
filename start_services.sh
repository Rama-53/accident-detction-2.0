#!/bin/bash
set -e

# Start Detector (Background)
echo "Starting Detector..."
# Note: Using cctv_eg.mp4 by default as per original compose
python detector_publisher.py --video cctv_eg.mp4 --port 5556 --http-port 5001 &

# Start Classifier (Background)
echo "Starting Classifier..."
# Connects to localhost since they are in the same container
# Relies on MONGO_URI environment variable
# Assuming the python script uses argparse defaults or env vars, but the original compose passed specific args.
# Original: python classifier_subscriber_async.py --host detector --port 5556 --mongo mongodb://mongo:27017 --db accident_db --outdir /app/accident_crops
python classifier_subscriber_async.py --host 127.0.0.1 --port 5556 --mongo "$MONGO_URI" --db accident_db --outdir /app/accident_crops &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
