# Start Chatterbox TTS Server for Development (CPU)
# This script starts the Chatterbox server on CPU for local development

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Chatterbox TTS - Development Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
Write-Host "Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found! Please install Python 3.11 or higher." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check if dependencies are installed
Write-Host "Checking if Chatterbox TTS is installed..." -ForegroundColor Yellow
$checkChatterbox = pip list | Select-String "chatterbox-tts"

if ($checkChatterbox) {
    Write-Host "✅ Chatterbox TTS is installed" -ForegroundColor Green
} else {
    Write-Host "❌ Chatterbox TTS not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Installing Chatterbox TTS and dependencies..." -ForegroundColor Yellow
    Write-Host "This may take several minutes..." -ForegroundColor Yellow
    Write-Host ""
    
    pip install chatterbox-tts flask flask-cors
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "❌ Installation failed!" -ForegroundColor Red
        Write-Host "Please run manually: pip install chatterbox-tts flask flask-cors" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host ""
    Write-Host "✅ Installation complete!" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Server (CPU Mode)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  WARNING: CPU mode is SLOW!" -ForegroundColor Yellow
Write-Host "   Generation: 30-120 seconds per request" -ForegroundColor Yellow
Write-Host "   For production, use cloud GPU" -ForegroundColor Yellow
Write-Host "   See: docs/cloud-gpu-setup.md" -ForegroundColor Yellow
Write-Host ""
Write-Host "Server will start on: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Start the server
python chatterbox-server.py
