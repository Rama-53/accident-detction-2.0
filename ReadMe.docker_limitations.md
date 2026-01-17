# Docker Limitations & Workarounds

Running the Accident Detection System in Docker introduces some isolation between the software and your physical hardware/files. Here is how to handle them:

## 1. Video Sources (SOLVED ✅)
### How to use local files:
We have implemented **intelligent path resolution**. If you use a Windows path like `C:\Users\Ram\Desktop\...\videos\crash_test.mp4`, the system will automatically look for `crash_test.mp4` in the project's `videos` folder.

1.  **Create a `videos` folder** in your project root (we did this for you).
2.  **Move/Copy your video files** into `videos/` (or `accident_crops/`).
3.  **Run Docker**.
4.  **Paste the full Windows path** (or just the filename) into the Dashboard. The system will auto-detect that it can't find `C:\...` and will instead open `/app/videos/your_file.mp4`.

### How to use Webcams (ADVANCED):
USB Device pass-through on Windows Docker requires WSL2 binding.
1.  **Install `usbipd-win`**.
2.  **Bind your webcam** to WSL2 (`usbipd attach ...`).
3.  **Uncomment the lines** in `docker-compose.yml` under `detector`:
    ```yaml
    # privileged: true
    # devices:
    #   - /dev/video0:/dev/video0
    ```
4.  **Rebuild**: `docker-compose up --build`.

## 2. Dashboard Controls
- **Enable/Disable AI**: Works correctly.
- **Settings**: Works correctly.
- **Stream View**: Works correctly via mapped ports.
