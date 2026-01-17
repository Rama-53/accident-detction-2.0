FROM python:3.10-slim

# Install system dependencies (needed for OpenCV)
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
# Add prometheus-client if not already there (it should be)
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Default command (overridden in docker-compose)
CMD ["python", "--version"]
