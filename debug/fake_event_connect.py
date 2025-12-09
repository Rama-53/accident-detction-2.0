# fake_event_repeater.py
import zmq, json, base64, time
from PIL import Image
import io

# create a small valid JPEG (64x64 white)
img = Image.new("RGB", (64,64), color=(255,255,255))
buf = io.BytesIO()
img.save(buf, format="JPEG")
bts = buf.getvalue()
b64 = base64.b64encode(bts).decode()

ctx = zmq.Context()
pub = ctx.socket(zmq.PUB)
pub.connect("tcp://localhost:5556")   # connect to existing PUB
time.sleep(0.5)  # allow connect

event = {
  "camera_id": "test_cam",
  "frame_idx": 12345,
  "ts_utc": time.time(),
  "crashes": [{"bbox":[10,10,40,40], "score":0.99}],
  "cropped_images_b64": [b64]
}

for i in range(10):
    pub.send_string(json.dumps(event))
    print("sent", i+1)
    time.sleep(0.15)

pub.close()
ctx.term()
print("done")
