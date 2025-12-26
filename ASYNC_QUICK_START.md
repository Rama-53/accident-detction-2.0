# Quick Start Guide - Async Processing

## What Changed

Your system now uses **async processing** for real-time 40 FPS performance!

### Updated Files
- ✅ `start_system.bat` - Now uses `classifier_subscriber_async.py`
- ✅ `detector_publisher.py` - Uses YOLOv11n (faster model)

## Performance

**Before:** 6.2 FPS (161ms sequential)  
**After:** 40.3 FPS (24.8ms async) ✅

**Breakdown:**
- YOLOv11n: 14ms
- Primary Classifier: 11ms
- **Main Thread: 24.8ms (40 FPS)**
- Hybrid Verification: 131ms (background, doesn't block)

## How It Works

### 1. Immediate Detection (Primary Model)
- Fast classification (11ms)
- 100% accident detection
- Alert sent immediately with status "UNVERIFIED"

### 2. Background Verification (Hybrid Model)
- Accurate classification (131ms)
- 89.80% accuracy
- Runs in background thread
- Updates alert 1-2 seconds later

### 3. Alert Updates
- **UNVERIFIED** → **VERIFIED** (both models agree)
- **UNVERIFIED** → **POSSIBLE** (models disagree)
- Priority adjusted automatically

## To Run

Just start the system normally:

```bash
start_system.bat
```

## Monitor Performance

Watch for these log messages:

```
[subscriber] Frame X primary classification: Yms
[subscriber] PRIMARY DETECTION! (conf=X.XX)
[subscriber] NEW ALERT <id> (UNVERIFIED)
[subscriber] Queued for hybrid verification (queue size: X)
[verifier] Alert <id>: Hybrid verification took Xms
[verifier]   Agreement: BOTH_ACCIDENT/DISAGREEMENT
[verifier] Alert <id> updated: BOTH_ACCIDENT
```

## Expected Behavior

1. Accident detected → Immediate alert (< 1 second)
2. Status: "UNVERIFIED", Priority: "HIGH"
3. Background verification starts
4. 1-2 seconds later → Alert updated
5. Status: "VERIFIED", Priority: "CRITICAL" (if both models agree)

## Troubleshooting

### If performance is slower than expected:
- Check GPU usage (should be ~80-90%)
- Verify YOLOv11n model is being used
- Check verification queue size (should be < 10)

### If alerts aren't updating:
- Check background verifier thread is running
- Check MongoDB connection
- Look for errors in verifier logs

## Rollback

If you need to revert to the old system:

```batch
REM In start_system.bat, change line 30 back to:
start "Classifier Subscriber" cmd /k "... python classifier_subscriber.py --quiet"
```

## Performance Tips

- Queue size indicates system load
- If queue > 20, system is overloaded
- Consider reducing camera count or frame rate
- Monitor GPU temperature for thermal throttling

Enjoy your real-time accident detection system! 🎉
