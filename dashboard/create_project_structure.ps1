# ==========================================
# Accident Detection 2.0 - Project Structure Creator
# ==========================================

Write-Host "Creating Accident Detection project folders..." -ForegroundColor Cyan

# Root folders
$folders = @(
    "classifier",
    "dashboard",
    "detector",
    "services",
    "utils",
    "video_processing",
    "accident_crops",
    "test_videos"
)

# Create folders
foreach ($folder in $folders) {
    if (-Not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder | Out-Null
        Write-Host "Created folder: $folder"
    } else {
        Write-Host "Folder already exists: $folder"
    }
}

# ----------------------------
# DASHBOARD SUB-FOLDERS
# ----------------------------
$dashboardSubFolders = @(
    "dashboard/app",
    "dashboard/app/accidents",
    "dashboard/components",
    "dashboard/lib"
)

foreach ($folder in $dashboardSubFolders) {
    if (-Not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder | Out-Null
        Write-Host "Created dashboard subfolder: $folder"
    }
}

# ----------------------------
# PLACEHOLDER FILES (empty)
# ----------------------------
$files = @(
    "classifier/cnn_classifier.py",
    "detector/detector.py",
    "services/api_server.py",
    "utils/image_utils.py",
    "video_processing/video_reader.py",
    "detector_publisher.py",
    "classifier_subscriber.py",
    "run_local_demo.py",
    "requirements.txt",
    "dashboard/package.json",
    "dashboard/next.config.js",
    "dashboard/postcss.config.js",
    "dashboard/tailwind.config.js",
    "dashboard/app/layout.js",
    "dashboard/app/page.js",
    "dashboard/app/globals.css",
    "dashboard/app/accidents/page.js",
    "dashboard/components/Navbar.js",
    "dashboard/components/AccidentCard.js",
    "dashboard/lib/api.js"
)

foreach ($file in $files) {
    if (-Not (Test-Path $file)) {
        New-Item -ItemType File -Path $file | Out-Null
        Write-Host "Created file: $file"
    } else {
        Write-Host "File already exists: $file"
    }
}

Write-Host "`nAll folders and files created successfully!" -ForegroundColor Green
Write-Host "Now you can copy the corresponding code into each file." -ForegroundColor Yellow
