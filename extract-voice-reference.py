"""
Extract a reference voice sample for voice cloning
Takes one of your processed audio chunks and trims to 6 seconds (optimal for cloning)
"""

from pathlib import Path
import soundfile as sf
import numpy as np

PROCESSED_DIR = Path("fine-tune-data/processed-audio")
REFERENCE_SAMPLE = Path("narrator-reference.wav")

def extract_reference_sample():
    """Extract a clean 6-second sample for voice cloning (optimal size)"""
    
    print("="*60)
    print("Voice Cloning Reference Sample Extractor")
    print("="*60)
    print()
    
    # Get all processed audio files
    audio_files = sorted(PROCESSED_DIR.glob("*.wav"))
    
    if not audio_files:
        print("❌ No audio files found in fine-tune-data/processed-audio/")
        print("   Run preprocessing first")
        return
    
    # Use the 10th chunk (should be good quality, past intro)
    source_file = audio_files[10] if len(audio_files) > 10 else audio_files[0]
    
    # Load and trim to 6 seconds (optimal for voice cloning)
    audio, sr = sf.read(source_file)
    target_samples = 6 * sr  # 6 seconds
    
    if len(audio) > target_samples:
        # Take middle 6 seconds (usually clearest)
        start = (len(audio) - target_samples) // 2
        audio = audio[start:start + target_samples]
    
    # Save trimmed reference
    sf.write(REFERENCE_SAMPLE, audio, sr)
    
    print(f"✅ Reference sample created: {REFERENCE_SAMPLE}")
    print(f"   Source: {source_file.name}")
    print(f"   Duration: ~6 seconds (optimal for voice cloning)")
    print(f"   File size: ~{REFERENCE_SAMPLE.stat().st_size / 1024:.1f} KB")
    print()
    print("This sample will be used for voice cloning.")
    print("The model will generate speech in this narrator's voice!")
    print("="*60)

if __name__ == "__main__":
    extract_reference_sample()
