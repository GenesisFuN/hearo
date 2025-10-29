# Quick Start Guide: CPU Development Setup

This guide will help you get Chatterbox TTS running on CPU for development purposes.

## ⚠️ Important Notes

- **CPU generation is SLOW** (30-120 seconds per request)
- This is for **development and testing only**
- For production, use a cloud GPU (see `docs/cloud-gpu-setup.md`)

## Step 1: Install Python Dependencies

### Option A: Using pip (Recommended)

```bash
# Install Chatterbox TTS and dependencies
pip install chatterbox-tts flask flask-cors

# Or use the requirements file
pip install -r chatterbox-requirements.txt
```

### Option B: Using conda

```bash
# Create environment
conda create -yn chatterbox python=3.11
conda activate chatterbox

# Install dependencies
pip install chatterbox-tts flask flask-cors
```

## Step 2: Start the Server

```bash
# Run the server (will auto-detect and use CPU)
python chatterbox-server.py
```

You should see:

```
============================================================
🎙️  Chatterbox TTS Server
============================================================
Port: 8000
Debug: false
Device: CPU
============================================================

Endpoints:
  GET  http://localhost:8000/health
  GET  http://localhost:8000/info
  POST http://localhost:8000/generate
  POST http://localhost:8000/voices/upload

Starting server...
============================================================
```

## Step 3: Test the Server

### Test 1: Health Check

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{ "status": "healthy", "service": "chatterbox-tts", "version": "1.0.0" }
```

### Test 2: Generate Speech (Simple)

```bash
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"Hello! This is a test.\"}" \
  --output test-output.mp3
```

⚠️ **This will take 30-120 seconds on CPU!** Be patient.

### Test 3: Check Server Info

```bash
curl http://localhost:8000/info
```

## Step 4: Configure Your Hearo App

Add to `.env.local`:

```env
# Chatterbox server URL
CHATTERBOX_SERVER_URL=http://localhost:8000

# Keep ElevenLabs as fallback
ELEVENLABS_API_KEY=your_key_here
```

## Step 5: Test from Your App

Run the test script:

```bash
# Make sure your Next.js app can reach the server
npx tsx scripts/test-tts-service.ts
```

## Performance Expectations

### CPU (Development)

- **First request**: 60-180 seconds (model download + generation)
- **Subsequent requests**: 30-120 seconds per generation
- **Memory usage**: 4-8GB RAM
- **Concurrent requests**: 1 (sequential only)

### GPU (Production)

- **First request**: 5-15 seconds (model load)
- **Subsequent requests**: 2-10 seconds per generation
- **Memory usage**: 8-16GB VRAM
- **Concurrent requests**: 2-4 (depending on VRAM)

## Troubleshooting

### "Module not found: chatterbox"

```bash
pip install chatterbox-tts
```

### "Port 8000 already in use"

```bash
# Use a different port
PORT=8001 python chatterbox-server.py
```

Then update `.env.local`:

```env
CHATTERBOX_SERVER_URL=http://localhost:8001
```

### "Out of memory"

Close other applications to free up RAM. CPU mode uses system RAM, not GPU VRAM.

### Generation is too slow

This is expected on CPU. Options:

1. **Use ElevenLabs** for development (faster, cloud-based)
2. **Deploy to cloud GPU** for faster generation (see `docs/cloud-gpu-setup.md`)
3. **Use shorter text** for testing

## Force CPU Mode (Even with GPU Available)

If you have a GPU but want to test CPU mode:

```bash
# Windows PowerShell
$env:USE_CPU="true"
python chatterbox-server.py

# Linux/Mac
USE_CPU=true python chatterbox-server.py
```

## Next Steps

### For Development

- ✅ Server is running on CPU
- ✅ Test basic functionality
- ✅ Integrate with your Hearo app
- ⚠️ Expect slow generation times

### For Production

- ⏳ Deploy to cloud GPU (RunPod recommended)
- ⏳ See `docs/cloud-gpu-setup.md` for deployment guide
- ⏳ Update `.env.production` with cloud URL
- ✅ Fast generation times (2-10 seconds)

## Development Workflow

1. **Develop locally** with ElevenLabs (fast, cloud-based)
2. **Test Chatterbox features** on CPU when needed (slow but works)
3. **Deploy to cloud GPU** for production (fast and self-hosted)

This gives you the best of both worlds:

- Fast iteration during development (ElevenLabs)
- Self-hosted option for production (Chatterbox on GPU)

## Questions?

- Check `docs/CHATTERBOX-INTEGRATION.md` for full integration guide
- See `docs/cloud-gpu-setup.md` for production GPU setup
- Join [Chatterbox Discord](https://discord.gg/rJq9cRJBJ6) for support
