# Accident Detection — Demo ZeroMQ Glue

## Quickstart
1. Install dependencies:
   ```bash
   python -m pip install -r requirements.txt
2.	Start MongoDB (Docker example):
 	docker run -d --name mongo -p 27017:27017 -v mongo_data:/data/db mongo:6
3.	In terminal A, run the detector publisher (uses detector/AccidentDetector):
 	python detector_publisher.py --video /path/to/test_video.mp4
4.	In terminal B, run the classifier subscriber:
 	python classifier_subscriber.py --host localhost --port 5556 --outdir ./accident_crops
5.	(Optional) Run the API server for dashboard consumption:
 	uvicorn services.api_server:app --reload --port 8000
6.	Open dashboard and query http://localhost:8000/accidents.
Where to plug your CNN
•	Replace classifier/demo_classify_image in classifier_subscriber.py with your model inference.
•	Or implement model in classifier/cnn_classifier.py and import it in subscriber. 