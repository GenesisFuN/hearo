"""
Coqui TTS Server for GPU Deployment (Runpod/Production)
Optimized for RTX 3090/4090 with XTTS-v2 model
"""

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Body
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
import torchaudio
from TTS.api import TTS
import os
import tempfile
import logging
from pathlib import Path
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(title="Coqui TTS GPU Server")

# CORS configuration - Updated with production domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001", 
        "https://*.vercel.app",  # Your Vercel deployments
        "https://hearo-kn4b83b5k-genesisfuns-projects.vercel.app",  # Production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global TTS model (loaded once at startup)
tts_model = None
device = None

# Model configuration
MODEL_NAME = "tts_models/multilingual/multi-dataset/xtts_v2"
OUTPUT_DIR = Path("/tmp/tts-output")
OUTPUT_DIR.mkdir(exist_ok=True)

# Request models
class GenerateRequest(BaseModel):
    text: str
    voice_id: str = None
    language: str = "en"
    temperature: float = 0.5
    speed: float = 0.92
    speaker: str = "Claribel Dervla"
    denoiser_strength: float = 0.02

@app.on_event("startup")
async def startup_event():
    """Load TTS model on server startup"""
    global tts_model, device
    
    logger.info("🚀 Starting Coqui TTS Server...")
    
    # Check for GPU
    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"🎮 Using device: {device}")
    
    if device == "cuda":
        gpu_name = torch.cuda.get_device_name(0)
        gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1e9
        logger.info(f"   GPU: {gpu_name}")
        logger.info(f"   VRAM: {gpu_memory:.1f} GB")
    else:
        logger.warning("⚠️  No GPU detected! Voice generation will be SLOW.")
    
    # Load model
    logger.info(f"📦 Loading model: {MODEL_NAME}...")
    start_time = time.time()
    
    try:
        tts_model = TTS(MODEL_NAME).to(device)
        load_time = time.time() - start_time
        logger.info(f"✅ Model loaded in {load_time:.2f}s")
        logger.info("🎤 Server ready for voice generation!")
    except Exception as e:
        logger.error(f"❌ Failed to load model: {e}")
        raise

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Coqui TTS GPU Server",
        "model": MODEL_NAME,
        "device": device,
        "status": "ready" if tts_model else "loading"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    if not tts_model:
        return JSONResponse(
            status_code=503,
            content={"status": "loading", "message": "Model still loading"}
        )
    
    return {
        "status": "healthy",
        "model": MODEL_NAME,
        "device": device,
        "gpu_available": torch.cuda.is_available(),
        "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None
    }

@app.post("/generate")
async def generate_speech_json(request: GenerateRequest):
    """
    Generate audio from text using JSON payload (for worker compatibility)
    Uses default speaker voice (no cloning)
    
    Args:
        request: GenerateRequest with text and voice settings
    
    Returns:
        Audio file (WAV format)
    """
    if not tts_model:
        raise HTTPException(status_code=503, detail="Model not loaded yet")
    
    if not request.text or len(request.text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    logger.info(f"🎤 Generating audio (JSON endpoint): {request.text[:50]}...")
    start_time = time.time()
    
    output_path = None
    
    try:
        # Generate output filename
        output_filename = f"output_{int(time.time())}_{os.getpid()}.wav"
        output_path = OUTPUT_DIR / output_filename
        
        # Generate audio with default speaker (no cloning)
        logger.info(f"   Using default speaker: {request.speaker}")
        logger.info("   Generating speech...")
        gen_start = time.time()
        
        tts_model.tts_to_file(
            text=request.text,
            file_path=str(output_path),
            language=request.language,
            speaker=request.speaker,
            split_sentences=True
        )
        
        gen_time = time.time() - gen_start
        total_time = time.time() - start_time
        
        logger.info(f"✅ Audio generated in {gen_time:.2f}s (total: {total_time:.2f}s)")
        
        # Return audio file
        return FileResponse(
            path=output_path,
            media_type="audio/wav",
            filename=output_filename,
            headers={
                "X-Generation-Time": f"{gen_time:.2f}",
                "X-Total-Time": f"{total_time:.2f}"
            }
        )
    
    except Exception as e:
        logger.error(f"❌ Error generating audio: {e}")
        raise HTTPException(status_code=500, detail=f"Audio generation failed: {str(e)}")

@app.post("/generate-audio")
async def generate_audio(
    text: str = Form(...),
    speaker_wav: UploadFile = File(...)
):
    """
    Generate audio from text using voice cloning
    
    Args:
        text: Text to convert to speech
        speaker_wav: Reference audio file for voice cloning (WAV, MP3)
    
    Returns:
        Audio file (WAV format)
    """
    if not tts_model:
        raise HTTPException(status_code=503, detail="Model not loaded yet")
    
    if not text or len(text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    logger.info(f"🎤 Generating audio for text: {text[:50]}...")
    start_time = time.time()
    
    # Create temp files
    temp_speaker_path = None
    output_path = None
    
    try:
        # Save uploaded speaker audio
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_speaker:
            temp_speaker_path = temp_speaker.name
            content = await speaker_wav.read()
            temp_speaker.write(content)
        
        logger.info(f"   Speaker audio saved: {len(content)} bytes")
        
        # Generate output filename
        output_filename = f"output_{int(time.time())}.wav"
        output_path = OUTPUT_DIR / output_filename
        
        # Generate audio with voice cloning
        logger.info("   Generating speech...")
        gen_start = time.time()
        
        tts_model.tts_to_file(
            text=text,
            file_path=str(output_path),
            speaker_wav=temp_speaker_path,
            language="en",  # Change if needed
            split_sentences=True  # Better for long texts
        )
        
        gen_time = time.time() - gen_start
        total_time = time.time() - start_time
        
        logger.info(f"✅ Audio generated in {gen_time:.2f}s (total: {total_time:.2f}s)")
        
        # Return audio file
        return FileResponse(
            path=output_path,
            media_type="audio/wav",
            filename=output_filename,
            headers={
                "X-Generation-Time": f"{gen_time:.2f}",
                "X-Total-Time": f"{total_time:.2f}"
            }
        )
    
    except Exception as e:
        logger.error(f"❌ Error generating audio: {e}")
        raise HTTPException(status_code=500, detail=f"Audio generation failed: {str(e)}")
    
    finally:
        # Cleanup temp speaker file
        if temp_speaker_path and os.path.exists(temp_speaker_path):
            try:
                os.remove(temp_speaker_path)
            except:
                pass

@app.post("/generate-audio-batch")
async def generate_audio_batch(
    texts: list[str] = Form(...),
    speaker_wav: UploadFile = File(...)
):
    """
    Generate multiple audio files from a list of texts (for chapters)
    
    Args:
        texts: List of texts to convert (JSON array)
        speaker_wav: Reference audio for voice cloning
    
    Returns:
        List of audio file URLs
    """
    if not tts_model:
        raise HTTPException(status_code=503, detail="Model not loaded yet")
    
    logger.info(f"🎤 Batch generation: {len(texts)} texts")
    
    # TODO: Implement batch processing
    # For now, return error to implement later
    raise HTTPException(
        status_code=501, 
        detail="Batch generation coming soon. Use single generation endpoint for now."
    )

@app.get("/models")
async def list_models():
    """List available TTS models"""
    return {
        "current_model": MODEL_NAME,
        "available_models": [
            "tts_models/multilingual/multi-dataset/xtts_v2",
            "tts_models/en/vctk/vits",
            "tts_models/en/ljspeech/tacotron2-DDC"
        ]
    }

@app.delete("/cleanup")
async def cleanup_temp_files():
    """Clean up old temporary audio files"""
    try:
        deleted = 0
        for file in OUTPUT_DIR.glob("*.wav"):
            # Delete files older than 1 hour
            if time.time() - file.stat().st_mtime > 3600:
                file.unlink()
                deleted += 1
        
        return {"deleted_files": deleted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    
    # Run server
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
