"""
Step 1: Audio Preprocessing
Converts your audio files to the correct format for XTTS training
Splits into manageable chunks (10-30 seconds each)
"""

import os
from pathlib import Path
from pydub import AudioSegment
from pydub.silence import split_on_silence
import subprocess

# Configuration
RAW_AUDIO_DIR = Path("raw-audio")
PROCESSED_DIR = Path("processed-audio")
TARGET_SAMPLE_RATE = 22050  # XTTS standard
MIN_CHUNK_LENGTH = 5000  # 5 seconds minimum
MAX_CHUNK_LENGTH = 30000  # 30 seconds maximum
SILENCE_THRESH = -40  # dB threshold for silence detection

def convert_to_wav_22050(input_file, output_file):
    """Convert any audio file to WAV 22050Hz mono"""
    print(f"Converting {input_file.name}...")
    
    # Load audio (pydub handles MP3, WAV, etc.)
    audio = AudioSegment.from_file(input_file)
    
    # Convert to mono if stereo
    if audio.channels > 1:
        audio = audio.set_channels(1)
    
    # Resample to 22050 Hz
    audio = audio.set_frame_rate(TARGET_SAMPLE_RATE)
    
    # Export as WAV
    audio.export(output_file, format="wav")
    print(f"  ✓ Converted to {output_file.name}")
    
    return audio

def split_audio_intelligent(audio, base_name):
    """Split audio into chunks based on silence detection"""
    print(f"Splitting {base_name} into chunks...")
    
    # Split on silence (natural pauses)
    chunks = split_on_silence(
        audio,
        min_silence_len=500,  # 0.5 second silence
        silence_thresh=SILENCE_THRESH,
        keep_silence=200,  # Keep 200ms of silence at edges
        seek_step=10
    )
    
    # Combine small chunks, split large ones
    processed_chunks = []
    current_chunk = AudioSegment.empty()
    
    for chunk in chunks:
        chunk_len = len(chunk)
        
        # If chunk is too long, split it
        if chunk_len > MAX_CHUNK_LENGTH:
            # If we have accumulated audio, save it first
            if len(current_chunk) > 0:
                processed_chunks.append(current_chunk)
                current_chunk = AudioSegment.empty()
            
            # Split long chunk into smaller pieces
            num_pieces = (chunk_len // MAX_CHUNK_LENGTH) + 1
            piece_len = chunk_len // num_pieces
            for i in range(num_pieces):
                start = i * piece_len
                end = start + piece_len if i < num_pieces - 1 else chunk_len
                processed_chunks.append(chunk[start:end])
        
        # If adding this chunk would exceed max length
        elif len(current_chunk) + chunk_len > MAX_CHUNK_LENGTH:
            processed_chunks.append(current_chunk)
            current_chunk = chunk
        
        # Add to current chunk
        else:
            current_chunk += chunk
    
    # Add remaining chunk
    if len(current_chunk) >= MIN_CHUNK_LENGTH:
        processed_chunks.append(current_chunk)
    
    # Save chunks
    saved_chunks = []
    for i, chunk in enumerate(processed_chunks):
        if len(chunk) >= MIN_CHUNK_LENGTH:
            output_file = PROCESSED_DIR / f"{base_name}_chunk_{i:03d}.wav"
            chunk.export(output_file, format="wav")
            duration = len(chunk) / 1000.0
            saved_chunks.append(output_file)
            print(f"  ✓ Chunk {i:03d}: {duration:.1f}s -> {output_file.name}")
    
    return saved_chunks

def main():
    print("="*60)
    print("XTTS Audio Preprocessing")
    print("="*60)
    print()
    
    # Create output directory
    PROCESSED_DIR.mkdir(exist_ok=True)
    
    # Find all audio files in raw-audio directory
    audio_files = list(RAW_AUDIO_DIR.glob("*"))
    audio_files = [f for f in audio_files if f.suffix.lower() in ['.mp3', '.wav', '.m4a', '.flac', '.ogg']]
    
    if not audio_files:
        print("❌ No audio files found in raw-audio/")
        print("   Please move your audio files to the 'raw-audio' directory")
        print("   Supported formats: MP3, WAV, M4A, FLAC, OGG")
        return
    
    print(f"Found {len(audio_files)} audio file(s):")
    for f in audio_files:
        print(f"  - {f.name}")
    print()
    
    all_chunks = []
    
    # Process each file
    for audio_file in audio_files:
        base_name = audio_file.stem
        
        # Convert to correct format
        temp_wav = PROCESSED_DIR / f"{base_name}_temp.wav"
        audio = convert_to_wav_22050(audio_file, temp_wav)
        
        # Split into chunks
        chunks = split_audio_intelligent(audio, base_name)
        all_chunks.extend(chunks)
        
        # Remove temp file
        temp_wav.unlink()
        print()
    
    print("="*60)
    print(f"✅ Preprocessing Complete!")
    print(f"   Created {len(all_chunks)} audio chunks")
    print(f"   Total duration: ~{sum(AudioSegment.from_wav(c).duration_seconds for c in all_chunks) / 60:.1f} minutes")
    print(f"   Output: processed-audio/")
    print()
    print("Next step: Run '2-transcribe-audio.py' to generate transcriptions")
    print("="*60)

if __name__ == "__main__":
    # Check dependencies
    try:
        import pydub
    except ImportError:
        print("❌ Missing dependency: pydub")
        print("   Install with: pip install pydub")
        exit(1)
    
    main()
