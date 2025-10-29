# Coqui TTS Voice Cloning - Complete ✅

## 🎉 What's Implemented

**Coqui TTS with voice cloning** is fully integrated into Hearo!

### ✅ Features

- **Voice Cloning**: Uses your Lincoln narrator's voice (`narrator-reference.wav`)
- **Audio Mastering**: Professional compression + EQ for audiobook quality
- **Denoising**: 0.02 strength - reduces robotic hiss
- **Quality Optimized**: temperature=0.5, speed=0.92 for natural audiobook speech
- **Default for All Tiers**: Coqui is primary, ElevenLabs as fallback
- **CPU Testing**: ~18 seconds per 250-char chunk

---

## 🚀 Quick Start

### Start Server

```powershell
.\start-coqui-dev.ps1
```

### Test Voice Cloning

```powershell
.\test-voice-cloning-simple.ps1
```

---

## 📁 Key Files

### Production

- `coqui-server.py` - Main TTS server with voice cloning
- `narrator-reference.wav` - Your narrator's voice (6 seconds)
- `src/lib/coqui.ts` - TypeScript client (voice cloning enabled by default)
- `src/lib/tts-service.ts` - Provider selection

### Tools

- `extract-voice-reference.py` - Create reference samples
- `test-voice-cloning-simple.ps1` - Test script

### Archived

- `archive/fine-tune-data.zip` - 45 min transcribed audio for GPU fine-tuning
- `fine-tune-data/` - Preprocessing & transcriptions (keep for future)

---

## ⚙️ Configuration

Current settings in `src/lib/coqui.ts`:

```typescript
temperature: 0.5; // Lower = more stable
speed: 0.92; // Audiobook pace
speaker_wav: "narrator-reference.wav"; // Voice cloning
denoiser_strength: 0.02; // Light hiss removal
```

### Audio Processing Pipeline

1. **TTS Generation** - Voice cloning with reference sample
2. **Denoising** - High-pass filter (0.02 strength)
3. **Mastering** - Professional audio chain:
   - High-pass filter (120Hz) - Remove rumble
   - EQ boost (3-6kHz) - Speech clarity
   - Compression (1.5:1) - Consistent volume
   - Loudnorm (-16 LUFS) - Audiobook standard

---

## 📊 Performance

| Mode              | Speed       | Quality     | Use         |
| ----------------- | ----------- | ----------- | ----------- |
| **CPU** (current) | ~18s/chunk  | Good        | Development |
| **GPU** (future)  | ~2-5s/chunk | Same/Better | Production  |

**GPU Deployment**: See `docs/cloud-gpu-setup.md`

---

## 🎯 Next Steps

### For Development

✅ You're all set! Use the current setup.

### For Production

1. Deploy to GPU (RunPod/Vast.ai)
2. Install ffmpeg: `conda install -c conda-forge ffmpeg`
3. Update `COQUI_SERVER_URL` in `.env.production`
4. Copy `coqui-server.py` and `narrator-reference.wav` to GPU server

### For Better Quality (Optional)

Fine-tune on GPU using `archive/fine-tune-data.zip`:

- 182 audio chunks already transcribed
- Follow `fine-tune-data/README.md`
- Train on Google Colab (1-2 hours)

---

## 🛠️ Maintenance

### Update Voice Reference

```powershell
# Place new audio in fine-tune-data/raw-audio/
conda activate coqui-tts
cd fine-tune-data
python 1-preprocess-audio-simple.py
cd ..
python extract-voice-reference.py
```

### Test Settings

```powershell
# Edit test-voice-cloning-simple.ps1
.\test-voice-cloning-simple.ps1
```

---

**Questions?** All docs are in the `docs/` folder! 🎙️
