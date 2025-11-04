"""
RunPod Serverless Handler for Coqui TTS
Optimized for GPU inference with XTTS-v2 model
"""

import runpod
import torch
import torchaudio
from TTS.api import TTS
import tempfile
import base64
import logging
from pathlib import Path
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global TTS model (loaded once at cold start)
tts_model = None
device = None

def load_model():
    """Load TTS model on cold start"""
    global tts_model, device
    
    if tts_model is not None:
        return tts_model
    
    logger.info("Loading TTS model...")
    
    # Check GPU availability
    if torch.cuda.is_available():
        device = "cuda"
        logger.info(f"GPU detected: {torch.cuda.get_device_name(0)}")
    else:
        device = "cpu"
        logger.warning("No GPU detected, using CPU (will be slow)")
    
    # Load XTTS-v2 model
    tts_model = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
    logger.info("TTS model loaded successfully")
    
    return tts_model

def handler(event):
    """
    RunPod serverless handler
    
    Expected input format:
    {
        "input": {
            "text": "Text to synthesize",
            "voice_file_base64": "base64_encoded_audio",  # Optional
            "language": "en",  # Optional, default "en"
            "speed": 1.0  # Optional, default 1.0
        }
    }
    """
    try:
        # Load model if not already loaded
        model = load_model()
        
        # Parse input
        input_data = event.get("input", {})
        text = input_data.get("text")
        voice_file_base64 = input_data.get("voice_file_base64")
        language = input_data.get("language", "en")
        speed = input_data.get("speed", 1.0)
        
        if not text:
            return {"error": "Text is required"}
        
        logger.info(f"Generating TTS for text: {text[:50]}...")
        
        # Handle voice reference if provided
        speaker_wav = None
        if voice_file_base64:
            try:
                # Decode base64 audio
                audio_bytes = base64.b64decode(voice_file_base64)
                
                # Save to temp file
                with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_voice:
                    temp_voice.write(audio_bytes)
                    speaker_wav = temp_voice.name
                    
                logger.info(f"Voice reference saved to {speaker_wav}")
            except Exception as e:
                logger.error(f"Error processing voice file: {e}")
                return {"error": f"Invalid voice file: {str(e)}"}
        
        # Generate audio
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_output:
            output_path = temp_output.name
        
        try:
            if speaker_wav:
                # Clone voice
                model.tts_to_file(
                    text=text,
                    speaker_wav=speaker_wav,
                    language=language,
                    file_path=output_path,
                    speed=speed
                )
            else:
                # Use default voice
                model.tts_to_file(
                    text=text,
                    language=language,
                    file_path=output_path,
                    speed=speed
                )
            
            logger.info(f"Audio generated successfully: {output_path}")
            
            # Read generated audio and encode to base64
            with open(output_path, "rb") as audio_file:
                audio_base64 = base64.b64encode(audio_file.read()).decode("utf-8")
            
            # Clean up temp files
            if speaker_wav and os.path.exists(speaker_wav):
                os.remove(speaker_wav)
            if os.path.exists(output_path):
                os.remove(output_path)
            
            return {
                "audio_base64": audio_base64,
                "format": "wav",
                "sample_rate": 24000,
                "language": language
            }
            
        except Exception as e:
            logger.error(f"TTS generation error: {e}")
            # Clean up on error
            if speaker_wav and os.path.exists(speaker_wav):
                os.remove(speaker_wav)
            if os.path.exists(output_path):
                os.remove(output_path)
            
            return {"error": f"TTS generation failed: {str(e)}"}
        
    except Exception as e:
        logger.error(f"Handler error: {e}")
        return {"error": str(e)}

# Health check handler
def health_handler(event):
    """Health check endpoint"""
    global tts_model, device
    
    return {
        "status": "healthy",
        "model_loaded": tts_model is not None,
        "device": device if device else "not initialized",
        "gpu_available": torch.cuda.is_available()
    }

# RunPod serverless entry point
runpod.serverless.start({
    "handler": handler,
    "health": health_handler
})
