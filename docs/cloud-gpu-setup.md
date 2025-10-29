# Cloud GPU Setup for Chatterbox TTS

This guide explains how to deploy Chatterbox TTS on cloud GPU providers for production use.

## 🌟 Why Cloud GPU?

- ✅ **Fast generation** - NVIDIA GPUs provide 10-100x faster inference than CPU
- ✅ **Scalable** - Easily scale up/down based on demand
- ✅ **Cost-effective** - Pay only for what you use
- ✅ **No local hardware** - No need for expensive local GPU setup

## 💰 Cost Comparison

| Provider         | GPU Type         | Cost/hour  | Performance | Best For       |
| ---------------- | ---------------- | ---------- | ----------- | -------------- |
| **RunPod**       | RTX 4090         | $0.44      | Excellent   | Production     |
| **RunPod**       | RTX 3090         | $0.34      | Excellent   | Production     |
| **Vast.ai**      | RTX 3090         | $0.20-0.40 | Excellent   | Cost-conscious |
| **Google Cloud** | T4               | $0.35      | Good        | Enterprise     |
| **AWS**          | g4dn.xlarge (T4) | $0.526     | Good        | Enterprise     |
| **Azure**        | NC6s v3 (V100)   | $3.06      | Excellent   | Enterprise     |
| **Lambda Labs**  | RTX A6000        | $0.80      | Excellent   | ML workloads   |

**Recommendation**: Start with **RunPod** or **Vast.ai** for the best price/performance ratio.

---

## Option 1: RunPod (Recommended)

RunPod is the easiest and most cost-effective option for hosting Chatterbox TTS.

### Step 1: Create RunPod Account

1. Go to [runpod.io](https://runpod.io)
2. Sign up and add credits ($10 minimum)

### Step 2: Deploy GPU Pod

1. Click **"Deploy"** → **"GPU Pod"**
2. Choose a GPU:
   - **RTX 3090** (24GB VRAM) - $0.34/hr - Recommended
   - **RTX 4090** (24GB VRAM) - $0.44/hr - Fastest
3. Select **"RunPod PyTorch"** template (or any PyTorch template)
4. Set **Container Disk** to at least **20GB**
5. Click **"Deploy On-Demand"**

### Step 3: Connect to Your Pod

Once deployed, you'll get:

- **SSH Access**: For terminal access
- **HTTP Ports**: For exposing your server
- **Jupyter**: For interactive development

Click **"Connect"** → **"Start Jupyter Lab"** or use SSH.

### Step 4: Install Chatterbox

In the Jupyter terminal or SSH:

```bash
# Install dependencies
pip install chatterbox-tts flask flask-cors

# Download your server file (upload via Jupyter or use git)
# Option A: Upload chatterbox-server.py via Jupyter interface
# Option B: Clone your repo
git clone https://github.com/yourusername/hearo.git
cd hearo
```

### Step 5: Start the Server

```bash
# Start on port 8000 (or any available port)
python chatterbox-server.py
```

### Step 6: Expose the Port

1. In RunPod dashboard, go to your pod
2. Click **"Edit Pod"** → **"Expose HTTP Ports"**
3. Add port **8000**
4. Save and restart pod

You'll get a public URL like: `https://your-pod-id.runpod.net`

### Step 7: Update Your Hearo App

In `.env.local` or `.env.production`:

```env
CHATTERBOX_SERVER_URL=https://your-pod-id.runpod.net
```

---

## Option 2: Vast.ai (Cheapest)

Vast.ai offers the cheapest GPU rentals through a marketplace.

### Step 1: Create Account

1. Go to [vast.ai](https://vast.ai)
2. Sign up and add credits

### Step 2: Find a GPU Instance

1. Click **"Create"** → **"Rent"**
2. Filter by:
   - **GPU**: RTX 3090, RTX 4090, or A6000
   - **VRAM**: At least 12GB (24GB recommended)
   - **Disk**: 20GB+
3. Sort by **"DPH"** (dollars per hour) - lowest first
4. Choose an instance and click **"Rent"**

### Step 3: Connect via SSH

```bash
ssh -p <port> root@<instance-ip> -L 8000:localhost:8000
```

### Step 4: Install and Run

```bash
# Install dependencies
apt update && apt install -y git python3-pip
pip install chatterbox-tts flask flask-cors

# Clone your repo or upload server file
git clone https://github.com/yourusername/hearo.git
cd hearo

# Run server
python chatterbox-server.py
```

### Step 5: Expose via Tunnel (ngrok or localhost)

Since Vast.ai doesn't provide direct HTTP access, use ngrok:

```bash
# Install ngrok
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok

# Start ngrok tunnel
ngrok http 8000
```

Copy the public URL (e.g., `https://abc123.ngrok.io`) and add to your `.env`:

```env
CHATTERBOX_SERVER_URL=https://abc123.ngrok.io
```

---

## Option 3: Google Cloud Platform

Best for enterprise deployments with high reliability requirements.

### Step 1: Create GCP Account

1. Go to [cloud.google.com](https://cloud.google.com)
2. Get $300 free credits for new accounts

### Step 2: Create VM with GPU

```bash
gcloud compute instances create chatterbox-tts \
  --zone=us-central1-a \
  --machine-type=n1-standard-4 \
  --accelerator=type=nvidia-tesla-t4,count=1 \
  --image-family=pytorch-latest-gpu \
  --image-project=deeplearning-platform-release \
  --boot-disk-size=50GB \
  --maintenance-policy=TERMINATE \
  --metadata="install-nvidia-driver=True"
```

### Step 3: SSH into Instance

```bash
gcloud compute ssh chatterbox-tts --zone=us-central1-a
```

### Step 4: Install Chatterbox

```bash
# Update pip
pip install --upgrade pip

# Install Chatterbox
pip install chatterbox-tts flask flask-cors

# Upload your server file
# (use gcloud scp or git clone)
```

### Step 5: Configure Firewall

```bash
gcloud compute firewall-rules create allow-chatterbox \
  --allow tcp:8000 \
  --source-ranges 0.0.0.0/0 \
  --target-tags chatterbox-tts
```

### Step 6: Start Server

```bash
python chatterbox-server.py
```

Get the external IP:

```bash
gcloud compute instances describe chatterbox-tts --zone=us-central1-a --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

Update `.env`:

```env
CHATTERBOX_SERVER_URL=http://EXTERNAL_IP:8000
```

---

## Production Best Practices

### 1. Use Process Manager

Keep the server running even after disconnect:

```bash
# Install PM2
npm install -g pm2

# Or use screen
screen -S chatterbox
python chatterbox-server.py
# Ctrl+A, D to detach
```

### 2. Add HTTPS

Use nginx as a reverse proxy with Let's Encrypt:

```bash
# Install nginx and certbot
apt install -y nginx certbot python3-certbot-nginx

# Configure nginx
cat > /etc/nginx/sites-available/chatterbox << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/chatterbox /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

# Get SSL certificate
certbot --nginx -d your-domain.com
```

### 3. Monitor Performance

Add monitoring to `chatterbox-server.py`:

```python
import psutil
import time

@app.route('/metrics', methods=['GET'])
def metrics():
    return jsonify({
        "cpu_percent": psutil.cpu_percent(),
        "memory_percent": psutil.virtual_memory().percent,
        "gpu_available": torch.cuda.is_available(),
        "gpu_memory_used": torch.cuda.memory_allocated() if torch.cuda.is_available() else 0,
    })
```

### 4. Auto-restart on Crash

Create systemd service:

```bash
cat > /etc/systemd/system/chatterbox.service << 'EOF'
[Unit]
Description=Chatterbox TTS Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/hearo
ExecStart=/usr/bin/python3 chatterbox-server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl enable chatterbox
systemctl start chatterbox
```

### 5. Use Docker

Create `Dockerfile`:

```dockerfile
FROM nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04

RUN apt-get update && apt-get install -y python3.11 python3-pip git
RUN pip install chatterbox-tts flask flask-cors

WORKDIR /app
COPY chatterbox-server.py .

EXPOSE 8000
CMD ["python3", "chatterbox-server.py"]
```

Build and run:

```bash
docker build -t chatterbox-tts .
docker run --gpus all -p 8000:8000 chatterbox-tts
```

---

## Development vs Production Setup

### Development (CPU - Local)

```bash
# .env.local
CHATTERBOX_SERVER_URL=http://localhost:8000

# Run locally on CPU (slow but works)
python chatterbox-server.py
```

### Production (GPU - Cloud)

```bash
# .env.production
CHATTERBOX_SERVER_URL=https://your-gpu-server.com

# Run on RunPod/Vast.ai/GCP with GPU
python chatterbox-server.py
```

---

## Cost Optimization Tips

1. **Use Spot Instances** - Save 50-70% on cloud providers (GCP, AWS)
2. **Auto-shutdown** - Turn off GPU when not in use
3. **Cache Aggressively** - Use Redis/CDN for frequently generated audio
4. **Batch Requests** - Process multiple requests together
5. **Use Smaller Models** - If quality isn't critical, use lighter models

---

## Monitoring & Alerts

Set up basic monitoring:

```python
# Add to chatterbox-server.py
import logging
from datetime import datetime

logging.basicConfig(
    filename=f'chatterbox-{datetime.now().strftime("%Y%m%d")}.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

@app.before_request
def log_request():
    logging.info(f"{request.method} {request.path} - {request.remote_addr}")

@app.after_request
def log_response(response):
    logging.info(f"Response: {response.status_code}")
    return response
```

---

## Troubleshooting

### GPU Not Detected

```bash
# Check CUDA
nvidia-smi

# Reinstall PyTorch with CUDA
pip uninstall torch torchaudio
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### Out of Memory

```python
# Add to server before generating
torch.cuda.empty_cache()
```

### Slow First Request

The model downloads on first use (~2GB). Pre-download:

```python
# Run once to download models
from chatterbox.tts import ChatterboxTTS
ChatterboxTTS.from_pretrained(device="cuda")
```

---

## Next Steps

1. ✅ Choose a cloud provider (RunPod recommended)
2. ✅ Deploy GPU instance
3. ✅ Install Chatterbox server
4. ✅ Expose public URL
5. ✅ Update `.env.production`
6. ✅ Test from your Hearo app
7. ✅ Monitor performance and costs

For questions, check the [Chatterbox Discord](https://discord.gg/rJq9cRJBJ6) or open an issue!
