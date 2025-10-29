"""
Step 2: Audio Transcription (Simplified - No ffmpeg needed)
Uses OpenAI Whisper to automatically transcribe all audio chunks
Loads WAV files directly using soundfile instead of ffmpeg
"""

import os
import csv
import numpy as np
import soundfile as sf
from pathlib import Path
import whisper
from tqdm import tqdm

# Configuration
PROCESSED_DIR = Path("processed-audio")
TRANSCRIPTS_DIR = Path("transcripts")
METADATA_FILE = Path("metadata.csv")
WHISPER_MODEL = "base"  # Options: tiny, base, small, medium, large

def load_audio_direct(file_path):
    """Load audio file directly using soundfile (no ffmpeg)"""
    audio, sr = sf.read(file_path)
    
    # Whisper expects 16kHz mono
    if sr != 16000:
        # Simple resampling using numpy
        from scipy import signal as sp_signal
        num_samples = int(len(audio) * 16000 / sr)
        audio = sp_signal.resample(audio, num_samples)
    
    # Convert to mono if stereo
    if len(audio.shape) > 1:
        audio = np.mean(audio, axis=1)
    
    # Normalize to float32
    if audio.dtype != np.float32:
        audio = audio.astype(np.float32)
    
    return audio

def transcribe_audio_files():
    """Transcribe all processed audio files using Whisper"""
    
    print("="*60)
    print("XTTS Audio Transcription (Whisper - Direct Loading)")
    print("="*60)
    print()
    
    # Load Whisper model
    print(f"Loading Whisper model: {WHISPER_MODEL}")
    print("(First time will download ~150MB model)")
    model = whisper.load_model(WHISPER_MODEL)
    print("✓ Model loaded\n")
    
    # Get all audio files
    audio_files = sorted(PROCESSED_DIR.glob("*.wav"))
    
    if not audio_files:
        print("❌ No audio files found in processed-audio/")
        print("   Run '1-preprocess-audio-simple.py' first")
        return
    
    print(f"Found {len(audio_files)} audio chunks to transcribe")
    print()
    
    # Create transcripts directory
    TRANSCRIPTS_DIR.mkdir(exist_ok=True)
    
    # Transcribe each file
    metadata = []
    
    for audio_file in tqdm(audio_files, desc="Transcribing"):
        try:
            # Load audio directly
            audio_data = load_audio_direct(str(audio_file))
            
            # Transcribe (pass audio array directly, not file path)
            result = model.transcribe(
                audio_data,
                language="en",
                task="transcribe",
                fp16=False  # CPU compatibility
            )
            
            text = result["text"].strip()
            
            # Save individual transcript
            transcript_file = TRANSCRIPTS_DIR / f"{audio_file.stem}.txt"
            transcript_file.write_text(text, encoding="utf-8")
            
            # Add to metadata
            # Format: audio_file|text|speaker_name
            metadata.append({
                "audio_file": f"processed-audio/{audio_file.name}",
                "text": text,
                "speaker_name": "narrator"
            })
            
        except Exception as e:
            print(f"\n  ⚠️  Error transcribing {audio_file.name}: {e}")
            continue
    
    # Write metadata.csv
    print()
    print("Writing metadata.csv...")
    with open(METADATA_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=["audio_file", "text", "speaker_name"], delimiter='|')
        writer.writeheader()
        writer.writerows(metadata)
    
    print()
    print("="*60)
    print("✅ Transcription Complete!")
    print(f"   Transcribed {len(metadata)} audio chunks")
    print(f"   Output:")
    print(f"     - metadata.csv (training dataset)")
    print(f"     - transcripts/*.txt (individual transcripts)")
    print()
    print("Next step: Package for Google Colab training")
    print("="*60)

def verify_transcripts():
    """Show sample transcripts for verification"""
    print("\n📋 Sample Transcripts (first 3):\n")
    
    transcript_files = sorted(TRANSCRIPTS_DIR.glob("*.txt"))[:3]
    for transcript_file in transcript_files:
        text = transcript_file.read_text(encoding="utf-8")
        print(f"File: {transcript_file.name}")
        print(f"Text: {text[:100]}...")
        print()

if __name__ == "__main__":
    transcribe_audio_files()
    verify_transcripts()
