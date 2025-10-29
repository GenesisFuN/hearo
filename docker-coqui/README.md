# Coqui TTS Docker Image for Runpod

This Docker image contains a pre-configured Coqui TTS server with GPU support.

## Building the Image

1. Make sure Docker Desktop is installed and running
2. Open PowerShell in this directory
3. Build the image:
   ```powershell
   docker build -t yourusername/coqui-tts-gpu:latest .
   ```

## Pushing to Docker Hub

1. Login to Docker Hub:

   ```powershell
   docker login
   ```

2. Push the image:
   ```powershell
   docker push yourusername/coqui-tts-gpu:latest
   ```

## Using in Runpod

1. Go to Runpod → Deploy
2. Choose "Custom" template
3. Enter your image: `yourusername/coqui-tts-gpu:latest`
4. Select GPU (RTX 3090 or 4090)
5. Set ports: 8000
6. Deploy!

Server will start automatically and be ready in ~30 seconds.

## Testing

Health check: `https://your-pod-url/health`

## What's Included

- PyTorch 2.1.0 with CUDA 12.1
- Coqui TTS with XTTS-v2 model (pre-downloaded)
- FastAPI server
- All dependencies pre-installed

## Cost Savings

- No reinstallation time (saves 5-10 minutes per restart)
- Model pre-downloaded (saves 2GB download each time)
- Instant restarts
