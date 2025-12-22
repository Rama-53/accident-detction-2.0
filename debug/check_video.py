
import requests
import sys

try:
    url = "http://localhost:8000/video_feed?source_id=demo_clip"
    print(f"Connecting to {url}...")
    r = requests.get(url, stream=True, timeout=5)
    
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        chunk = next(r.iter_content(chunk_size=1024))
        print(f"Received chunk of size: {len(chunk)}")
        print("Header snippet:", chunk[:50])
    else:
        print("Error:", r.text)

except Exception as e:
    print("Exception:", e)
