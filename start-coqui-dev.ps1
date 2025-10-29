# Coqui TTS Development Server Startup Script

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Coqui TTS (XTTS v2) - Voice Cloning Enabled" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Features:" -ForegroundColor Yellow
Write-Host "  ✓ Voice cloning with narrator-reference.wav" -ForegroundColor Green
Write-Host "  ✓ Audio mastering (compression + EQ)" -ForegroundColor Green
Write-Host "  ✓ Denoising (0.02 strength)" -ForegroundColor Green
Write-Host "  ✓ Optimized for audiobooks (temp: 0.5, speed: 0.92)" -ForegroundColor Green
Write-Host "  ✓ Default for all tiers (ElevenLabs fallback)" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  CPU Mode: ~18 seconds per 250-char chunk" -ForegroundColor Yellow
Write-Host "💡 For production: Deploy to GPU (5-10x faster)" -ForegroundColor Cyan
Write-Host ""

# Check if conda is available
try {
    $condaVersion = conda --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Conda not found"
    }
} catch {
    Write-Host "❌ ERROR: Conda is not installed or not in PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Miniconda:" -ForegroundColor Yellow
    Write-Host "  https://docs.conda.io/en/latest/miniconda.html" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "After installation, restart VS Code and try again." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "✅ Conda found: $condaVersion" -ForegroundColor Green

# Check if coqui-tts environment exists
$envExists = conda env list | Select-String "coqui-tts"

if (-not $envExists) {
    Write-Host ""
    Write-Host "📦 Creating conda environment 'coqui-tts' with Python 3.11..." -ForegroundColor Yellow
    conda create -y -n coqui-tts python=3.11
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "❌ Failed to create conda environment" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Environment created successfully!" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "📦 Installing Coqui TTS and dependencies..." -ForegroundColor Yellow
    Write-Host "   This may take several minutes..." -ForegroundColor Yellow
    
    # Activate and install
    conda run -n coqui-tts pip install -r coqui-requirements.txt
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Dependencies installed successfully!" -ForegroundColor Green
}

Write-Host ""
Write-Host "🚀 Starting Coqui TTS server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Server will be available at: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start the server
conda run -n coqui-tts python coqui-server.py
