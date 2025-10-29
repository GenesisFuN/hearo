"""
Step 2: Audio Transcription
Uses OpenAI Whisper to automatically transcribe all audio chunks
Creates metadata.csv needed for training
"""

import os
import csv
from pathlib import Path
import whisper
from tqdm import tqdm

# Configuration
PROCESSED_DIR = Path("processed-audio")
TRANSCRIPTS_DIR = Path("transcripts")
METADATA_FILE = Path("metadata.csv")
WHISPER_MODEL = "base"  # Options: tiny, base, small, medium, large

def transcribe_audio_files():
    """Transcribe all processed audio files using Whisper"""
    
    print("="*60)
    print("XTTS Audio Transcription (Whisper)")
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
        print("   Run '1-preprocess-audio.py' first")
        return
    
    print(f"Found {len(audio_files)} audio chunks to transcribe")
    print()
    
    # Create transcripts directory
    TRANSCRIPTS_DIR.mkdir(exist_ok=True)
    
    # Transcribe each file
    metadata = []
    
    for audio_file in tqdm(audio_files, desc="Transcribing"):
        # Transcribe
        result = model.transcribe(
            str(audio_file),
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
    print(f"   Transcribed {len(audio_files)} audio chunks")
    print(f"   Output:")
    print(f"     - metadata.csv (training dataset)")
    print(f"     - transcripts/*.txt (individual transcripts)")
    print()
    print("Next step: Upload to Google Colab for training")
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
    # Check dependencies
    try:
        import whisper
    except ImportError:
        print("❌ Missing dependency: whisper")
        print("   Install with: pip install openai-whisper")
        print()
        print("   Also need ffmpeg:")
        print("   Windows: Download from https://ffmpeg.org/ or use: winget install ffmpeg")
        exit(1)
    
    transcribe_audio_files()
    verify_transcripts()
