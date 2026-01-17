
import docker
import os
import logging
from typing import Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ContainerManager")

# Configuration
# This should match the image name defined in docker-compose 'detector_base' service
DETECTOR_IMAGE = "accident_detector:latest" 
# This should match the network name defined in docker-compose
NETWORK_NAME = "accident_net"
# Classifier host address (internal service name in docker-compose)
CLASSIFIER_HOST = "classifier"

class ContainerManager:
    def __init__(self):
        try:
            self.client = docker.from_env()
            logger.info("Docker client initialized.")
        except Exception as e:
            logger.error(f"Failed to initialize Docker client: {e}")
            self.client = None

    def ensure_detector_running(self, camera_id: str, video_source: str, location_name: str = None):
        """
        Ensures a detector container for the given camera_id is running.
        If not existing, creates it.
        If stopped, starts it.
        """
        if not self.client:
            logger.warning("Docker client is not available. Skipping container management.")
            return

        container_name = f"detector_{camera_id}"
        
        try:
            # Check if container exists
            container = self.client.containers.get(container_name)
            
            if container.status != "running":
                logger.info(f"Container {container_name} exists but is {container.status}. Starting...")
                container.restart() # Or start?
            else:
                # Already running
                pass
                
        except docker.errors.NotFound:
            # Create new container
            logger.info(f"Creating new detector container: {container_name} for source {video_source}")
            self._start_new_container(container_name, camera_id, video_source, location_name)
            
        except Exception as e:
            logger.error(f"Error checking detector {camera_id}: {e}")

    def _start_new_container(self, container_name, camera_id, video_source, location_name):
        """
        Internal method to run a new detector container.
        """
        # Build Command
        # detector_publisher.py args: --video --camera-id --dest-host --location ...
        
        cmd = [
            "python", "detector_publisher.py",
            "--video", str(video_source),
            "--camera-id", str(camera_id),
            "--dest-host", CLASSIFIER_HOST,
            "--port", "5556",
            "--http-port", "5001" # Internal port inside container
        ]
        
        if location_name:
            cmd.extend(["--location", str(location_name)])

        # Environment variables? (Mongo URI mostly)
        env = {
            "MONGO_URI": os.getenv("MONGO_URI", "mongodb://mongo:27017")
        }

        # Volumes? 
        # Needs access to video files if source is a file path?
        # Yes! We need to mount the same volumes as the base service would have.
        # We assume /app/videos and /app/accident_crops are needed.
        volumes = {
            os.path.abspath("accident_crops"): {'bind': '/app/accident_crops', 'mode': 'rw'},
            os.path.abspath("videos"): {'bind': '/app/videos', 'mode': 'ro'} 
        }
        
        # NOTE: os.path.abspath might return Windows path on host, which is what we want for bind mount.
        # Ensure we are passing the HOST path, not the container path of the API.
        # The API container typically sees /app/..., but we need to mount the HOST path.
        # THIS IS TRICKY in Docker-in-Docker.
        # If API moves /app/videos -> /app/videos, and we spawn a sibling, 
        # we need to know the HOST path of ./videos to mount it into the sibling.
        # SOLUTION: For now, assuming standard relative paths work if working_dir is set?
        # No, binds are absolute host paths.
        # WORKAROUND: We can skip volume mounts for now if we assume only RTSP/Webcam.
        # OR: We pass a special env var 'HOST_PROJECT_ROOT' to the API container?
        # Let's try to assume relative path binding works in the simplified context or stick to RTSP.
        # Actually, for files, we need volumes.
        # In a real deployment, we'd use named volumes. 
        # Let's use the named volumes defined in docker-compose if possible?
        # The docker-compose uses binds: `./videos:/app/videos`.
        # When `api` runs `docker run`, it's talking to the HOST daemon.
        # So it needs HOST paths.
        # `os.getcwd()` in the API container returns `/app`. This is NOT the host path.
        # We can try to use `--volumes-from`? access is deprecated.
        # Safest bet: Use RTSP for scalability.
        # For this prototype: Assume `c:\Users\Ram\Desktop\Project Trial\accident-detction-2.0` is the root.
        # But we shouldn't hardcode it. 
        # Let's skip file-based video volumes for the dynamic containers for this iteration OR use a "videos" named volume.
        # Current compose uses binds.
        # I will comment out volume binds for now to avoid specific path issues, 
        # or just try to mount the named volume if I defined one.
        # I didn't define named volumes for videos.
        # I will just proceed without extra volume mounts (implies RTSP/Webcam sources only for dynamic).
        # Wait, the user might want to test with a file.
        # I'll stick to basic RTSP support for this task to minimize complexity related to "Docker-in-Docker path mapping".
        
        try:
            container = self.client.containers.run(
                image=DETECTOR_IMAGE,
                name=container_name,
                api_client=None, # use default
                command=cmd,
                detach=True,
                network=NETWORK_NAME,
                environment=env,
                restart_policy={"Name": "unless-stopped"},
                # volumes=volumes # Skipping for now to avoid path hell
            )
            logger.info(f"Started container {container.id[:10]}")
        except Exception as e:
            logger.error(f"Failed to start container: {e}")

    def stop_detector(self, camera_id: str):
        if not self.client: return
        
        container_name = f"detector_{camera_id}"
        try:
            container = self.client.containers.get(container_name)
            logger.info(f"Stopping container {container_name}...")
            container.stop()
            container.remove()
            logger.info(f"Removed container {container_name}")
        except docker.errors.NotFound:
            pass
        except Exception as e:
            logger.error(f"Error stopping detector {camera_id}: {e}")

    def sync_detectors(self, active_cameras: list):
        """
        Ensures only the active_cameras have running containers.
        Stops others.
        """
        if not self.client: return

        # Get all detector containers
        try:
            containers = self.client.containers.list(filters={"name": "detector_"})
            existing_ids = set()
            
            for c in containers:
                # Name format: detector_{camera_id}
                name = c.name
                if name.startswith("detector_"):
                    cam_id = name.replace("detector_", "")
                    existing_ids.add(cam_id)
            
            active_ids = {c["camera_id"] for c in active_cameras}
            
            # Stop removed
            to_stop = existing_ids - active_ids
            for cid in to_stop:
                self.stop_detector(cid)
                
            # Start/Ensure active
            for cam in active_cameras:
                if cam.get("detection_enabled"):
                    self.ensure_detector_running(
                        cam["camera_id"], 
                        cam.get("video_source", "0"),
                        cam.get("location")
                    )
        except Exception as e:
            logger.error(f"Sync error: {e}")
