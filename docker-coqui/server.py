from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import torch
from TTS.api import TTS
import tempfile
import time

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

tts_model = None
device = None

@app.on_event("startup")
async def startup():
    global tts_model, device
    print("🚀 Starting...")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Device: {device}")
    if device == "cuda":
        print(f"GPU: {torch.cuda.get_device_name(0)}")
    tts_model = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
    print("✅ Ready!")

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "device": device,
        "gpu_available": torch.cuda.is_available(),
        "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None
    }

@app.post("/generate-audio")
async def generate_audio(text: str = Form(...), speaker_wav: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_speaker:
        content = await speaker_wav.read()
        temp_speaker.write(content)
        temp_speaker_path = temp_speaker.name
    
    output_path = f"/tmp/output_{int(time.time())}.wav"
    tts_model.tts_to_file(text=text, file_path=output_path, speaker_wav=temp_speaker_path, language="en")
    
    return FileResponse(output_path, media_type="audio/wav")
