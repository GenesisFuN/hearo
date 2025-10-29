"""
Simple audio preprocessing using scipy and soundfile
Works with Python 3.11 conda environment
"""

import os
import numpy as np
import soundfile as sf
from pathlib import Path
from scipy import signal
from scipy.io import wavfile

# Configuration
RAW_AUDIO_DIR = Path("raw-audio")
PROCESSED_DIR = Path("processed-audio")
TARGET_SAMPLE_RATE = 22050  # XTTS standard
CHUNK_DURATION = 15  # seconds per chunk

def convert_and_split_audio(input_file):
    """Convert MP3 to WAV and split into chunks"""
    print(f"\nProcessing {input_file.name}...")
    
    # Load audio using soundfile (handles MP3)
    try:
        audio_data, sample_rate = sf.read(input_file)
    except Exception as e:
        print(f"  Error loading file: {e}")
        print(f"  Trying alternative method...")
        # Fallback: use scipy's wavfile if it's already WAV
        sample_rate, audio_data = wavfile.read(input_file)
        audio_data = audio_data.astype(np.float32) / 32768.0  # Normalize to -1 to 1
    
    print(f"  Loaded: {len(audio_data)/sample_rate:.1f} seconds at {sample_rate} Hz")
    
    # Convert to mono if stereo
    if len(audio_data.shape) > 1:
        audio_data = np.mean(audio_data, axis=1)
        print(f"  Converted stereo to mono")
    
    # Resample to 22050 Hz if needed
    if sample_rate != TARGET_SAMPLE_RATE:
        num_samples = int(len(audio_data) * TARGET_SAMPLE_RATE / sample_rate)
        audio_data = signal.resample(audio_data, num_samples)
        sample_rate = TARGET_SAMPLE_RATE
        print(f"  Resampled to {TARGET_SAMPLE_RATE} Hz")
    
    # Split into chunks
    chunk_samples = CHUNK_DURATION * sample_rate
    num_chunks = int(np.ceil(len(audio_data) / chunk_samples))
    
    base_name = input_file.stem
    saved_chunks = []
    
    for i in range(num_chunks):
        start = i * chunk_samples
        end = min((i + 1) * chunk_samples, len(audio_data))
        chunk = audio_data[start:end]
        
        # Skip if chunk is too short (< 5 seconds)
        if len(chunk) / sample_rate < 5:
            continue
        
        # Save chunk
        output_file = PROCESSED_DIR / f"{base_name}_chunk_{i:03d}.wav"
        sf.write(output_file, chunk, sample_rate)
        
        duration = len(chunk) / sample_rate
        saved_chunks.append(output_file)
        print(f"  ✓ Chunk {i:03d}: {duration:.1f}s -> {output_file.name}")
    
    return saved_chunks

def main():
    print("="*60)
    print("XTTS Audio Preprocessing (Simple)")
    print("="*60)
    
    # Create output directory
    PROCESSED_DIR.mkdir(exist_ok=True)
    
    # Find audio files
    audio_files = list(RAW_AUDIO_DIR.glob("*.mp3")) + list(RAW_AUDIO_DIR.glob("*.wav"))
    
    if not audio_files:
        print("\n❌ No audio files found in raw-audio/")
        print("   Supported: .mp3, .wav")
        return
    
    print(f"\nFound {len(audio_files)} audio file(s):")
    for f in audio_files:
        print(f"  - {f.name}")
    
    all_chunks = []
    
    # Process each file
    for audio_file in audio_files:
        try:
            chunks = convert_and_split_audio(audio_file)
            all_chunks.extend(chunks)
        except Exception as e:
            print(f"  ❌ Error processing {audio_file.name}: {e}")
            import traceback
            traceback.print_exc()
    
    print("\n" + "="*60)
    print(f"✅ Preprocessing Complete!")
    print(f"   Created {len(all_chunks)} audio chunks")
    total_duration = len(all_chunks) * CHUNK_DURATION / 60
    print(f"   Estimated duration: ~{total_duration:.1f} minutes")
    print(f"   Output: processed-audio/")
    print()
    print("Next step: Run '2-transcribe-audio.py' to generate transcriptions")
    print("="*60)

if __name__ == "__main__":
    main()
