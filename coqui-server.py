"""
Coqui TTS (XTTS v2) Server for Hearo
Provides text-to-speech with voice cloning capabilities
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import torch
import io
import os
import tempfile
import re
import numpy as np
from scipy import signal
from TTS.api import TTS

app = Flask(__name__)
CORS(app)

# Increase max upload size for voice cloning (50MB)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024

# Initialize TTS model (lazy loading)
tts_model = None
device = None

def apply_denoising(audio_path, strength=0.01):
    """
    Apply noise reduction to audio file
    Uses high-pass filtering and spectral gating to reduce robotic hiss
    """
    if strength <= 0:
        return  # No denoising needed
    
    try:
        import wave
        from scipy.signal import butter, filtfilt
        
        # Read WAV file
        with wave.open(audio_path, 'rb') as wav_file:
            params = wav_file.getparams()
            framerate = params.framerate
            frames = wav_file.readframes(params.nframes)
            audio_data = np.frombuffer(frames, dtype=np.int16)
        
        # Convert to float for processing
        audio_float = audio_data.astype(np.float32) / 32768.0
        
        # Apply high-pass filter to remove low-frequency rumble/hiss
        # Cutoff frequency scales with strength (50-200 Hz range)
        cutoff = 50 + (strength * 1500)  # Higher strength = more aggressive
        nyquist = framerate / 2
        normalized_cutoff = min(cutoff / nyquist, 0.99)
        
        print(f"   Applying high-pass filter at {cutoff:.1f} Hz")
        
        # Design Butterworth high-pass filter
        b, a = butter(4, normalized_cutoff, btype='high')
        audio_filtered = filtfilt(b, a, audio_float)
        
        # Apply noise gate to reduce very quiet sections
        gate_threshold = strength * 2.0  # Scale with strength
        gate_mask = np.abs(audio_filtered) > gate_threshold
        
        # Smooth the gate mask to avoid clicks
        gate_mask_float = gate_mask.astype(np.float32)
        kernel_size = int(framerate * 0.005)  # 5ms smoothing
        if kernel_size > 0:
            kernel = np.ones(kernel_size) / kernel_size
            gate_mask_smooth = np.convolve(gate_mask_float, kernel, mode='same')
        else:
            gate_mask_smooth = gate_mask_float
        
        # Apply smooth gate
        audio_gated = audio_filtered * gate_mask_smooth
        
        # Normalize to prevent clipping
        max_val = np.abs(audio_gated).max()
        if max_val > 0:
            audio_gated = audio_gated / max_val * 0.95
        
        # Convert back to int16
        audio_denoised = (audio_gated * 32768.0).astype(np.int16)
        
        # Write back to file
        with wave.open(audio_path, 'wb') as wav_file:
            wav_file.setparams(params)
            wav_file.writeframes(audio_denoised.tobytes())
            
        print(f"   ✓ Denoising applied (strength: {strength}, cutoff: {cutoff:.1f}Hz)")
        
    except Exception as e:
        print(f"   ⚠️  Denoising failed: {e}")
        import traceback
        traceback.print_exc()
        # Don't fail if denoising doesn't work, just continue

def apply_mastering(audio_path):
    """
    Apply professional audio mastering chain:
    - Compression (1.5:1 ratio) for consistent volume
    - EQ (boost 3-6kHz for clarity, cut <120Hz for clean bass)
    
    Uses ffmpeg for fast processing (~0.5s per file)
    """
    try:
        print(f"   🎚️  Applying audio mastering...")
        
        # Create temp output file
        temp_output = audio_path + ".mastered.wav"
        
        # ffmpeg filter chain:
        # 1. highpass=120 - Remove rumble below 120Hz
        # 2. equalizer - Boost 3-6kHz for speech clarity
        # 3. acompressor - Gentle compression (1.5:1 ratio)
        # 4. loudnorm - Final normalization
        
        import subprocess
        import sys
        
        # Try multiple ffmpeg locations
        conda_prefix = os.environ.get('CONDA_PREFIX', '')
        ffmpeg_paths = [
            os.path.join(conda_prefix, 'Library', 'bin', 'ffmpeg.exe') if conda_prefix else None,
            r'C:\Users\dane\miniconda3\envs\coqui-tts\Library\bin\ffmpeg.exe',
            'ffmpeg',  # System PATH
        ]
        
        ffmpeg_cmd = None
        for path in ffmpeg_paths:
            if path and (os.path.exists(path) if os.path.isabs(path) else True):
                ffmpeg_cmd = path
                break
        
        if not ffmpeg_cmd:
            print(f"   ⚠️  Mastering skipped (ffmpeg not found in any location)")
            return
        
        cmd = [
            ffmpeg_cmd,
            '-i', audio_path,
            '-af',
            'highpass=f=120,'                           # Remove low rumble
            'equalizer=f=4500:t=q:w=2:g=3,'            # Boost 3-6kHz for clarity
            'acompressor=threshold=-20dB:ratio=1.5:attack=5:release=50,'  # Gentle compression
            'loudnorm=I=-16:TP=-1.5:LRA=11',           # Final normalization for audiobooks
            '-ar', '22050',                             # Keep sample rate
            '-y',                                       # Overwrite output
            temp_output
        ]
        
        # Run ffmpeg (capture output to avoid clutter)
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=10
        )
        
        if result.returncode == 0 and os.path.exists(temp_output):
            # Replace original with mastered version
            os.replace(temp_output, audio_path)
            print(f"   ✓ Mastering applied (compression + EQ)")
        else:
            error_msg = result.stderr.decode('utf-8', errors='ignore') if result.stderr else 'No stderr output'
            stdout_msg = result.stdout.decode('utf-8', errors='ignore') if result.stdout else 'No stdout'
            print(f"   ⚠️  Mastering skipped")
            print(f"      Return code: {result.returncode}")
            print(f"      Stderr: {error_msg[:200]}")
            print(f"      Stdout: {stdout_msg[:200]}")
            if os.path.exists(temp_output):
                os.unlink(temp_output)
        
    except FileNotFoundError:
        print(f"   ⚠️  Mastering skipped (ffmpeg not found)")
    except subprocess.TimeoutExpired:
        print(f"   ⚠️  Mastering timed out")
        if os.path.exists(temp_output):
            os.unlink(temp_output)
    except Exception as e:
        print(f"   ⚠️  Mastering failed: {e}")
        if os.path.exists(temp_output):
            os.unlink(temp_output)
        # Don't fail if mastering doesn't work, just continue

def preprocess_text(text):
    """
    Preprocess text to improve TTS quality
    - Normalize punctuation
    - Add explicit pauses for better pacing
    - Fix common issues
    """
    # Add explicit pauses after sentence-ending punctuation
    # Using commas creates better pauses in XTTS than ellipsis
    text = re.sub(r'\.(\s+)', r'., ', text)  # Period gets a comma pause
    text = re.sub(r'!(\s+)', r'!, ', text)   # Exclamation gets a comma pause
    text = re.sub(r'\?(\s+)', r'?, ', text)  # Question gets a comma pause
    
    # Add pauses after colons and semicolons
    text = re.sub(r':(\s+)', r':, ', text)
    text = re.sub(r';(\s+)', r';, ', text)
    
    # Ensure commas have proper spacing
    text = re.sub(r',(\s*)', r', ', text)
    
    # Add comma pauses for better pacing in long sentences with "and"
    text = re.sub(r'(\w+)\s+and\s+(\w+)', r'\1, and \2', text)
    
    # Clean up excessive commas (in case of double application)
    text = re.sub(r',\s*,+', r',', text)
    
    # Clean up excessive spaces
    text = re.sub(r'\s+', ' ', text)
    
    return text.strip()

def get_device():
    """Detect available device (CUDA, MPS, or CPU)"""
    if torch.cuda.is_available():
        return "cuda"
    elif torch.backends.mps.is_available():
        return "mps"
    else:
        return "cpu"

def get_tts_model():
    """Initialize and return TTS model"""
    global tts_model, device
    if tts_model is None:
        device = get_device()
        print(f"\n{'='*60}")
        print(f"🎙️  Initializing Coqui TTS (XTTS v2)")
        print(f"{'='*60}")
        print(f"Device: {device.upper()}")
        if device == "cpu":
            print("⚠️  WARNING: CPU inference is SLOW (30-120 seconds per request)")
            print("⚠️  For production, use a GPU instance")
        print(f"{'='*60}\n")
        
        # Initialize XTTS v2 model with TOS agreement
        # Set environment variable to auto-accept license
        import os
        os.environ['COQUI_TOS_AGREED'] = '1'
        
        tts_model = TTS("tts_models/multilingual/multi-dataset/xtts_v2", progress_bar=False).to(device)
        
        print("✅ Model loaded successfully!\n")
    
    return tts_model

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "coqui-tts",
        "model": "xtts_v2",
        "version": "1.0.0"
    }), 200

@app.route('/info', methods=['GET'])
def info():
    """Server information endpoint"""
    dev = get_device()
    return jsonify({
        "service": "coqui-tts",
        "model": "xtts_v2",
        "device": dev,
        "features": {
            "voice_cloning": True,
            "multilingual": True,
            "languages": ["en", "es", "fr", "de", "it", "pt", "pl", "tr", "ru", "nl", "cs", "ar", "zh-cn", "ja", "hu", "ko", "hi"]
        },
        "performance": {
            "cpu": "30-120 seconds per request",
            "gpu": "2-5 seconds per request"
        },
        "available_speakers": [
            "Claribel Dervla",
            "Daisy Studious", 
            "Gracie Wise",
            "Tammie Ema",
            "Alison Dietlinde",
            "Ana Florence"
        ],
        "quality_tips": {
            "temperature": "Lower (0.5-0.7) for more consistent, higher (0.8-0.95) for more expressive",
            "speed": "0.9-1.1 for natural pacing",
            "speaker": "Try different speakers - some sound more natural than others"
        }
    }), 200

@app.route('/voices', methods=['GET'])
def list_voices():
    """
    List available cloned voices
    """
    voices_dir = os.path.join(os.getcwd(), 'uploads', 'voices')
    os.makedirs(voices_dir, exist_ok=True)

    # List all .wav files in the voices directory
    voices = [f for f in os.listdir(voices_dir) if f.endswith('.wav')]
    
    return jsonify({
        "voices": voices
    }), 200

@app.route('/generate', methods=['POST'])
def generate():
    """
    Generate speech from text
    
    Request JSON:
    {
        "text": "Text to convert to speech",
        "voice_id": "voice1.wav" (optional, for voice cloning),
        "language": "en" (default: "en"),
        "temperature": 0.5 (default: 0.5, range 0.1-1.0, lower=more stable, optimized for natural sound),
        "speed": 0.92 (default: 0.92, range 0.5-2.0, optimized for audiobook pacing),
        "speaker": "Claribel Dervla" (default speaker name if not using voice cloning),
        "denoiser_strength": 0.02 (default: 0.02, range 0.0-1.0)
    }
    """
    data = request.get_json()
    text = data.get('text')
    voice_id = data.get('voice_id')  # New parameter for selecting cloned voice
    language = data.get('language', 'en')
    temperature = data.get('temperature', 0.5)  # Default 0.5 for more natural sound
    speed = data.get('speed', 0.92)  # Default 0.92 for audiobook pacing
    speaker_name = data.get('speaker', 'Claribel Dervla')
    denoiser_strength = data.get('denoiser_strength', 0.02)

    if not text:
        return jsonify({"error": "Text is required"}), 400

    # Preprocess text for better quality
    text = preprocess_text(text)

    print(f"\n📝 Generating speech...")
    print(f"   Text: {text[:50]}{'...' if len(text) > 50 else ''}")
    print(f"   Language: {language}")
    print(f"   Voice ID: {voice_id if voice_id else 'Default'}")
    print(f"   Temperature: {temperature} | Speed: {speed} | Denoiser: {denoiser_strength}")

    # Get TTS model
    tts = get_tts_model()

    # Resolve voice file path
    speaker_wav = None
    if voice_id:
        voices_dir = os.path.join(os.getcwd(), 'uploads', 'voices')
        speaker_wav = os.path.join(voices_dir, voice_id)
        if not os.path.exists(speaker_wav):
            return jsonify({"error": f"Voice file '{voice_id}' not found"}), 404

    # Generate speech
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
        output_path = tmp_file.name

    try:
        if speaker_wav:
            # Voice cloning mode with quality settings
            tts.tts_to_file(
                text=text,
                speaker_wav=speaker_wav,
                language=language,
                file_path=output_path,
                speed=speed
            )
        else:
            # Default voice mode with better speaker
            tts.tts_to_file(
                text=text,
                speaker=speaker_name,
                language=language,
                file_path=output_path,
                speed=speed
            )

        # Apply denoising post-processing if requested
        if denoiser_strength > 0:
            apply_denoising(output_path, denoiser_strength)

        # Apply audio mastering (compression + EQ)
        # DISABLED: ffmpeg DLL dependency issues on Windows
        # apply_mastering(output_path)

        print(f"✅ Speech generated successfully!")

        # Read the generated audio file
        with open(output_path, 'rb') as f:
            audio_data = f.read()

        # Clean up temp file
        os.unlink(output_path)

        # Return audio file
        return send_file(
            io.BytesIO(audio_data),
            mimetype='audio/wav',
            as_attachment=True,
            download_name='speech.wav'
        )

    except Exception as e:
        # Cleanup on error
        if os.path.exists(output_path):
            os.unlink(output_path)
        raise e

@app.route('/generate-cloned', methods=['POST'])
def generate_cloned():
    """
    Generate speech using voice cloning from uploaded audio sample
    
    Expects multipart/form-data with:
    - text: Text to convert
    - speaker_wav: Audio file with reference voice (6-30 seconds recommended)
    - language: Language code (default: en)
    - temperature: Temperature setting (default: 0.5)
    - speed: Speed multiplier (default: 0.92)
    - denoiser_strength: Denoising amount (default: 0.02)
    """
    try:
        # Get form data
        text = request.form.get('text')
        language = request.form.get('language', 'en')
        temperature = float(request.form.get('temperature', 0.5))
        speed = float(request.form.get('speed', 0.92))
        denoiser_strength = float(request.form.get('denoiser_strength', 0.02))
        
        # Get uploaded audio file
        if 'speaker_wav' not in request.files:
            return jsonify({"error": "No speaker_wav file provided"}), 400
        
        speaker_file = request.files['speaker_wav']
        if speaker_file.filename == '':
            return jsonify({"error": "Empty filename"}), 400
        
        if not text:
            return jsonify({"error": "Text is required"}), 400
        
        # Save speaker reference temporarily
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as speaker_tmp:
            speaker_wav_path = speaker_tmp.name
            speaker_file.save(speaker_wav_path)
        
        # Preprocess text
        text = preprocess_text(text)
        
        print(f"\n📝 Generating speech with voice cloning...")
        print(f"   Text: {text[:50]}{'...' if len(text) > 50 else ''}")
        print(f"   Language: {language}")
        print(f"   Speaker: Custom (cloned from upload)")
        print(f"   Temperature: {temperature} | Speed: {speed} | Denoiser: {denoiser_strength}")
        
        # Get TTS model
        tts = get_tts_model()
        
        # Generate speech with voice cloning
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as output_tmp:
            output_path = output_tmp.name
        
        try:
            # Voice cloning with quality settings
            tts.tts_to_file(
                text=text,
                speaker_wav=speaker_wav_path,
                language=language,
                file_path=output_path,
                speed=speed
            )
            
            # Apply denoising
            if denoiser_strength > 0:
                apply_denoising(output_path, denoiser_strength)
            
            # Apply audio mastering (compression + EQ)
            # DISABLED: ffmpeg DLL dependency issues on Windows
            # apply_mastering(output_path)
            
            print(f"✅ Voice-cloned speech generated successfully!")
            
            # Read audio
            with open(output_path, 'rb') as f:
                audio_data = f.read()
            
            # Cleanup
            os.unlink(output_path)
            os.unlink(speaker_wav_path)
            
            return send_file(
                io.BytesIO(audio_data),
                mimetype='audio/wav',
                as_attachment=True,
                download_name='speech.wav'
            )
            
        except Exception as e:
            # Cleanup on error
            if os.path.exists(output_path):
                os.unlink(output_path)
            if os.path.exists(speaker_wav_path):
                os.unlink(speaker_wav_path)
            raise e
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Error: {error_msg}")
        return jsonify({"error": error_msg}), 500

@app.route('/voices/upload', methods=['POST'])
def upload_voice():
    """
    Upload a voice sample for cloning
    
    Expects a multipart/form-data file upload with key 'voice'
    Returns the path where the voice was saved
    """
    try:
        if 'voice' not in request.files:
            return jsonify({"error": "No voice file provided"}), 400
        
        voice_file = request.files['voice']
        
        if voice_file.filename == '':
            return jsonify({"error": "Empty filename"}), 400
        
        # Create voices directory if it doesn't exist
        voices_dir = os.path.join(os.getcwd(), 'uploads', 'voices')
        os.makedirs(voices_dir, exist_ok=True)
        
        # Save the voice file
        filename = f"voice_{hash(voice_file.filename)}_{voice_file.filename}"
        filepath = os.path.join(voices_dir, filename)
        voice_file.save(filepath)
        
        print(f"✅ Voice sample uploaded: {filename}")
        
        return jsonify({
            "success": True,
            "path": filepath,
            "filename": filename
        }), 200
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Error uploading voice: {error_msg}")
        return jsonify({"error": error_msg}), 500

if __name__ == '__main__':
    print(f"\n{'='*60}")
    print(f"🎙️  Coqui TTS Server (XTTS v2)")
    print(f"{'='*60}")
    print(f"Port: 8000")
    print(f"Debug: False")
    print(f"Device: Will auto-detect (CUDA/MPS/CPU)")
    print(f"{'='*60}\n")
    print(f"Endpoints:")
    print(f"  GET  http://localhost:8000/health")
    print(f"  GET  http://localhost:8000/info")
    print(f"  POST http://localhost:8000/generate (default voices)")
    print(f"  POST http://localhost:8000/generate-cloned (voice cloning)")
    print(f"  POST http://localhost:8000/voices/upload")
    print(f"  GET  http://localhost:8000/voices")
    print(f"\n{'='*60}")
    print(f"Starting server...")
    print(f"{'='*60}\n")
    
    # Pre-load model on startup
    get_tts_model()
    
    # Start Flask server
    app.run(host='0.0.0.0', port=8000, debug=False)
