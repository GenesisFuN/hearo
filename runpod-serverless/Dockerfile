FROM runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel-ubuntu22.04

# Set working directory
WORKDIR /app

# Set environment variable to auto-accept Coqui license
ENV COQUI_TOS_AGREED=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies (ignore blinker conflict)
RUN pip install --no-cache-dir --ignore-installed blinker -r requirements.txt

# Copy handler
COPY handler.py .

# Set environment variable to auto-accept TTS license
ENV COQUI_TOS_AGREED=1

# Note: Model will download on first run (cold start ~30s)
# This is normal for serverless - avoids build issues

# Start the handler
CMD ["python", "-u", "handler.py"]
