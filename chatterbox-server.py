"""
Chatterbox TTS Server
A simple Flask server for self-hosted text-to-speech using Chatterbox TTS
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import torchaudio as ta
from chatterbox.tts import ChatterboxTTS, ChatterboxMultilingualTTS
import io
import os
import sys

app = Flask(__name__)
CORS(app)

# Initialize models (lazy loading)
english_model = None
multilingual_model = None

def get_english_model():
    global english_model
    if english_model is None:
        print("Loading Chatterbox English model...")
        # Auto-detect: Use CUDA if available, otherwise CPU
        import torch
        device = "cuda" if torch.cuda.is_available() and os.environ.get("USE_CPU") != "true" else "cpu"
        print(f"🔧 Using device: {device}")
        if device == "cpu":
            print("⚠️  WARNING: Running on CPU - generation will be VERY slow!")
            print("   For production, use an NVIDIA GPU (cloud or local)")
        english_model = ChatterboxTTS.from_pretrained(device=device)
        print(f"✅ English model loaded on {device}")
    return english_model

def get_multilingual_model():
    global multilingual_model
    if multilingual_model is None:
        print("Loading Chatterbox Multilingual model...")
        # Auto-detect: Use CUDA if available, otherwise CPU
        import torch
        device = "cuda" if torch.cuda.is_available() and os.environ.get("USE_CPU") != "true" else "cpu"
        print(f"🔧 Using device: {device}")
        if device == "cpu":
            print("⚠️  WARNING: Running on CPU - generation will be VERY slow!")
            print("   For production, use an NVIDIA GPU (cloud or local)")
        multilingual_model = ChatterboxMultilingualTTS.from_pretrained(device=device)
        print(f"✅ Multilingual model loaded on {device}")
    return multilingual_model

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "chatterbox-tts",
        "version": "1.0.0"
    }), 200

@app.route('/info', methods=['GET'])
def info():
    """Get server information"""
    return jsonify({
        "service": "Chatterbox TTS Server",
        "supported_languages": [
            "ar", "da", "de", "el", "en", "es", "fi", "fr",
            "he", "hi", "it", "ja", "ko", "ms", "nl", "no",
            "pl", "pt", "ru", "sv", "sw", "tr", "zh"
        ],
        "features": [
            "Zero-shot voice cloning",
            "Emotion/exaggeration control",
            "Multilingual support (23 languages)",
            "High-quality speech synthesis"
        ]
    }), 200

@app.route('/generate', methods=['POST'])
def generate():
    """
    Generate speech from text
    
    Request body:
    {
        "text": "Text to synthesize",
        "audio_prompt_path": "/path/to/voice.wav" (optional),
        "exaggeration": 0.5 (default, 0.0-1.0),
        "cfg_weight": 0.5 (default, 0.0-1.0),
        "language_id": "en" (default)
    }
    """
    try:
        data = request.json
        
        if not data:
            return jsonify({"error": "Request body is required"}), 400
        
        text = data.get('text')
        if not text:
            return jsonify({"error": "Text is required"}), 400
        
        audio_prompt_path = data.get('audio_prompt_path')
        exaggeration = float(data.get('exaggeration', 0.5))
        cfg_weight = float(data.get('cfg_weight', 0.5))
        language_id = data.get('language_id', 'en')
        
        # Validate parameters
        if not 0.0 <= exaggeration <= 1.0:
            return jsonify({"error": "exaggeration must be between 0.0 and 1.0"}), 400
        if not 0.0 <= cfg_weight <= 1.0:
            return jsonify({"error": "cfg_weight must be between 0.0 and 1.0"}), 400
        
        print(f"🎙️ Generating speech: {len(text)} chars, lang={language_id}")
        
        # Choose model based on language
        if language_id == 'en':
            model = get_english_model()
        else:
            model = get_multilingual_model()
        
        # Generate audio
        generate_kwargs = {
            "exaggeration": exaggeration,
            "cfg_weight": cfg_weight
        }
        
        if audio_prompt_path and os.path.exists(audio_prompt_path):
            print(f"📢 Using voice sample: {audio_prompt_path}")
            generate_kwargs["audio_prompt_path"] = audio_prompt_path
        
        wav = model.generate(text, **generate_kwargs)
        
        # Convert to MP3 bytes
        buffer = io.BytesIO()
        ta.save(buffer, wav, model.sr, format='mp3')
        buffer.seek(0)
        
        print(f"✅ Speech generated successfully ({buffer.getbuffer().nbytes} bytes)")
        
        return send_file(
            buffer,
            mimetype='audio/mpeg',
            as_attachment=False,
            download_name='output.mp3'
        )
        
    except Exception as e:
        print(f"❌ Error generating speech: {e}", file=sys.stderr)
        return jsonify({"error": str(e)}), 500

@app.route('/voices/upload', methods=['POST'])
def upload_voice():
    """
    Upload a voice sample for voice cloning
    
    This saves the voice sample to a temporary location and returns a path
    that can be used in the /generate endpoint
    """
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "Audio file is required"}), 400
        
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Create voices directory if it doesn't exist
        voices_dir = os.path.join(os.getcwd(), 'voices')
        os.makedirs(voices_dir, exist_ok=True)
        
        # Generate unique filename
        import time
        filename = f"voice_{int(time.time())}_{audio_file.filename}"
        filepath = os.path.join(voices_dir, filename)
        
        # Save the file
        audio_file.save(filepath)
        
        print(f"📁 Voice sample saved: {filepath}")
        
        return jsonify({
            "message": "Voice sample uploaded successfully",
            "path": filepath,
            "filename": filename
        }), 200
        
    except Exception as e:
        print(f"❌ Error uploading voice: {e}", file=sys.stderr)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    debug = os.environ.get('DEBUG', 'false').lower() == 'true'
    
    print("=" * 60)
    print("🎙️  Chatterbox TTS Server")
    print("=" * 60)
    print(f"Port: {port}")
    print(f"Debug: {debug}")
    print(f"Device: {'CPU' if os.environ.get('USE_CPU') == 'true' else 'CUDA/GPU'}")
    print("=" * 60)
    print()
    print("Endpoints:")
    print(f"  GET  http://localhost:{port}/health")
    print(f"  GET  http://localhost:{port}/info")
    print(f"  POST http://localhost:{port}/generate")
    print(f"  POST http://localhost:{port}/voices/upload")
    print()
    print("Starting server...")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=port, debug=debug)
