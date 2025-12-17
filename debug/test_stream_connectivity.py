
import urllib.request
import time
import socket

def test_url(url, name):
    print(f"Testing {name} at {url}...")
    try:
        stream = urllib.request.urlopen(url, timeout=5)
        # Read a bit
        chunk = stream.read(1024)
        if chunk:
            print(f"  [SUCCESS] Received {len(chunk)} bytes from {name}.")
            return True
        else:
            print(f"  [abc] Connected but received empty data from {name}.")
            return False
    except urllib.error.URLError as e:
        print(f"  [FAILED] Could not connect to {name}: {e}")
        return False
    except socket.timeout:
        print(f"  [FAILED] Timeout connecting to {name}.")
        return False
    except Exception as e:
        print(f"  [FAILED] Error testing {name}: {e}")
        return False

def main():
    print("=== Stream Connectivity Diagnostic ===")
    
    # 1. Test direct detector stream
    detector_ok = test_url("http://127.0.0.1:5001/stream.mjpg", "Detector Direct")
    
    # 2. Test API proxy stream (requires API server running)
    proxy_ok = test_url("http://localhost:8000/video_feed?source_id=detector_stream", "API Proxy")
    
    if detector_ok and proxy_ok:
        print("\nAll streams accesible. Issue might happen sporadically or be browser-related.")
    elif detector_ok and not proxy_ok:
        print("\nDetector is UP but Proxy is DOWN. Issue is likely in 'api_server.py' or network logic.")
    elif not detector_ok:
        print("\nDetector Stream is DOWN. Issue is in 'detector_publisher.py' or it's not running.")

if __name__ == "__main__":
    main()
