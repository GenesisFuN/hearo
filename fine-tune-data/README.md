# XTTS Fine-Tuning Guide for Hearo

This directory contains everything you need to fine-tune Coqui XTTS v2 on your custom narrator voice.

## 📁 Directory Structure

```
fine-tune-data/
├── raw-audio/          # PUT YOUR AUDIO FILES HERE
├── processed-audio/    # Processed chunks (auto-generated)
├── transcripts/        # Transcriptions (auto-generated)
├── metadata.csv        # Training dataset (auto-generated)
├── 1-preprocess-audio.py
├── 2-transcribe-audio.py
├── 3-colab-training.ipynb
└── README.md          # This file
```

## 🚀 Quick Start Guide

### Step 1: Prepare Audio (On Your PC)

1. **Move your audio files** to `raw-audio/`:

   ```
   Move lincolnhistoryvol1_16_haynicolay_64kb to raw-audio/
   Move lincolnhistoryvol1_17_haynicolay_64kb to raw-audio/
   ```

2. **Install dependencies**:

   ```powershell
   pip install pydub openai-whisper tqdm
   ```

   Also need ffmpeg:

   ```powershell
   winget install ffmpeg
   ```

3. **Run preprocessing**:

   ```powershell
   cd fine-tune-data
   python 1-preprocess-audio.py
   ```

   This will:
   - Convert audio to WAV 22050Hz
   - Split into 10-30 second chunks
   - Save to `processed-audio/`

4. **Run transcription**:

   ```powershell
   python 2-transcribe-audio.py
   ```

   This will:
   - Transcribe all chunks using Whisper AI
   - Create `metadata.csv`
   - Takes ~5-10 minutes

5. **Create training package**:
   ```powershell
   # Zip everything for upload to Colab
   Compress-Archive -Path processed-audio,transcripts,metadata.csv -DestinationPath fine-tune-data.zip
   ```

### Step 2: Train on Google Colab (Free GPU)

1. **Go to**: https://colab.research.google.com

2. **Upload notebook**:
   - File → Upload notebook
   - Choose `3-colab-training.ipynb`

3. **Enable GPU**:
   - Runtime → Change runtime type
   - Hardware accelerator: T4 GPU
   - Save

4. **Upload your data**:
   - Click folder icon (left sidebar)
   - Upload `fine-tune-data.zip`

5. **Run training**:
   - Execute cells in order (Shift+Enter)
   - Wait 1-2 hours
   - Download `hearo-fine-tuned-model.zip` at the end

### Step 3: Use Fine-Tuned Model (On Your PC)

1. **Extract model**:

   ```powershell
   cd C:\Users\dane\hearo
   mkdir models
   # Extract hearo-fine-tuned-model.zip to models/
   ```

2. **Update `coqui-server.py`**:

   ```python
   # Change this line:
   tts_model = TTS("tts_models/multilingual/multi-dataset/xtts_v2", ...)

   # To this:
   tts_model = TTS(model_path="models/hearo-custom/model", config_path="models/hearo-custom/config.json", ...)
   ```

3. **Restart Coqui server**:

   ```powershell
   # Stop current server (Ctrl+C)
   $env:COQUI_TOS_AGREED='1'
   python coqui-server.py
   ```

4. **Test the new voice**:
   ```powershell
   .\test-coqui-best.ps1
   ```

## 🎯 Expected Results

- **Voice Quality**: Natural, warm, smooth US accent (like your training data)
- **Robotic Sound**: Significantly reduced compared to base model
- **Consistency**: More consistent tone and pacing
- **Training Time**: 1-2 hours on Colab T4 GPU
- **Model Size**: ~1-2 GB

## ⚠️ Troubleshooting

**"No audio files found"**

- Make sure files are in `raw-audio/` directory
- Check file extensions (.mp3, .wav, etc.)

**"Missing dependency: whisper"**

```powershell
pip install openai-whisper
```

**"ffmpeg not found"**

```powershell
winget install ffmpeg
# or download from https://ffmpeg.org/
```

**Colab runs out of memory**

- Reduce `batch_size` in Cell 3 (try 1 instead of 2)

**Training loss not decreasing**

- Check if audio quality is good
- Verify transcriptions are accurate
- Try increasing epochs to 20-25

## 📊 Training Tips

- **More data = better quality** (but 45 min is plenty)
- **Consistent audio quality** is more important than quantity
- **Verify transcripts** before training (check a few in `transcripts/`)
- **Monitor loss** - should decrease steadily
- **Listen to validation samples** during training

## 🔧 Advanced Options

**Use different Whisper model** (better accuracy but slower):

```python
# In 2-transcribe-audio.py, change:
WHISPER_MODEL = "small"  # or "medium" for best accuracy
```

**Adjust chunk sizes**:

```python
# In 1-preprocess-audio.py, change:
MIN_CHUNK_LENGTH = 3000  # 3 seconds
MAX_CHUNK_LENGTH = 20000  # 20 seconds
```

**More training epochs**:

```python
# In Colab Cell 3, change:
config.epochs = 25  # More epochs = better quality but longer training
```

## 📝 Notes

- Transcription takes ~10 minutes (uses CPU)
- Training takes ~1-2 hours (uses GPU on Colab)
- First time Whisper/XTTS will download models (~500MB each)
- Keep Colab tab open during training (or it may disconnect)
- Free Colab has time limits - if disconnected, can resume from checkpoint

## ✅ Checklist

- [ ] Audio files in `raw-audio/`
- [ ] Dependencies installed (pydub, whisper, ffmpeg)
- [ ] Ran `1-preprocess-audio.py`
- [ ] Ran `2-transcribe-audio.py`
- [ ] Created `fine-tune-data.zip`
- [ ] Uploaded to Colab
- [ ] Changed to GPU runtime
- [ ] Ran all Colab cells
- [ ] Downloaded fine-tuned model
- [ ] Updated `coqui-server.py`
- [ ] Restarted server
- [ ] Tested new voice!

---

**Need help?** Review each step carefully. Most issues are from missing dependencies or files in wrong directories.
