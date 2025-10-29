# Runpod GPU Server Setup for Coqui TTS

## Step 1: Create Runpod Account

1. Go to https://runpod.io
2. Sign up (GitHub login works)
3. Add credit ($10 minimum, lasts ~25 hours on RTX 3090)

## Step 2: Deploy GPU Pod

1. Click **"Deploy"** in Runpod dashboard
2. Select **"GPU Cloud"**
3. Choose GPU:
   - **Recommended:** RTX 3090 (24GB) - ~$0.40/hr
   - Alternative: RTX 4090 (24GB) - ~$0.60/hr (faster)
4. Select **"Deploy"** on available GPU

## Step 3: Pod Configuration

**Template:** Select "RunPod Pytorch" or "RunPod Fast Stable Diffusion" (both work)

**Settings:**

- Container Disk: 50 GB (enough for Coqui models)
- Volume Disk: Optional (for persistence)
- Expose HTTP Ports: **8000** (for our FastAPI server)

Click **"Deploy On-Demand"**

## Step 4: Access Your Pod

Once deployed (takes 1-2 minutes):

1. Click **"Connect"** on your pod
2. Copy the **"Connect via Web Terminal"** URL
3. Click **"Start Web Terminal"**

You now have a terminal to your GPU server!

## Step 5: Install Coqui TTS

In the Runpod web terminal, run these commands:

```bash
# Update system
apt-get update

# Install Coqui TTS
pip install TTS

# Install FastAPI and dependencies
pip install fastapi uvicorn python-multipart aiofiles

# Test Coqui installation
tts --list_models
```

## Step 6: Upload Your Server Code

**Option A: Direct upload to Runpod**

In Runpod terminal:

```bash
# Create directory
mkdir /workspace/coqui-server
cd /workspace/coqui-server

# Create the server file
nano coqui-server.py
```

Then paste the contents of your `coqui-server.py` file (I'll create an updated version in next file).

**Option B: Use GitHub**

```bash
cd /workspace
git clone https://github.com/yourusername/hearo.git
cd hearo
```

## Step 7: Start the Server

```bash
# Navigate to server directory
cd /workspace/coqui-server

# Start FastAPI server
uvicorn coqui-server:app --host 0.0.0.0 --port 8000
```

The server will start and show:

```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

## Step 8: Get Your Public URL

1. Go back to Runpod dashboard
2. Find your pod
3. Look for **"HTTP Service"** section
4. You'll see a URL like: `https://xxxxx-8000.proxy.runpod.net`
5. **Copy this URL** - this is your Coqui server endpoint!

## Step 9: Test Your Server

In your local terminal (on your computer):

```bash
curl https://xxxxx-8000.proxy.runpod.net/health
```

Should return:

```json
{ "status": "healthy" }
```

## Step 10: Update Your Next.js App

Update the Coqui server URL in your code:

**In your API route** (wherever you call Coqui):

```typescript
const COQUI_SERVER_URL =
  process.env.COQUI_SERVER_URL || "https://xxxxx-8000.proxy.runpod.net";
```

**Add to `.env.local`:**

```bash
COQUI_SERVER_URL=https://xxxxx-8000.proxy.runpod.net
```

## Cost Management

**Start/Stop Pod:**

- Stop pod when not testing: $0/hour
- Start when needed: takes 30 seconds
- Only charged when running

**Auto-stop:**

- Runpod can auto-stop after idle time
- Settings → Auto-stop after 30 minutes

## Keeping Server Running

**Option A: Keep terminal open**

- Leave Runpod web terminal open
- Server runs as long as terminal is open

**Option B: Use systemd (persistent)**

```bash
# Create service file
nano /etc/systemd/system/coqui.service
```

Paste:

```ini
[Unit]
Description=Coqui TTS Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/workspace/coqui-server
ExecStart=/usr/local/bin/uvicorn coqui-server:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable:

```bash
systemctl daemon-reload
systemctl enable coqui
systemctl start coqui
```

**Option C: Use tmux (simple persistence)**

```bash
# Install tmux
apt-get install tmux

# Start tmux session
tmux new -s coqui

# Run server
cd /workspace/coqui-server
uvicorn coqui-server:app --host 0.0.0.0 --port 8000

# Detach: Press Ctrl+B, then D
# Reattach later: tmux attach -t coqui
```

## Testing Voice Generation

```bash
# Test endpoint
curl -X POST https://xxxxx-8000.proxy.runpod.net/generate-audio \
  -F "text=Hello, this is a test." \
  -F "speaker_wav=@/path/to/voice-sample.wav" \
  --output test-output.wav
```

## Troubleshooting

**Server not starting:**

```bash
# Check Python version
python --version  # Should be 3.8+

# Reinstall TTS
pip uninstall TTS
pip install TTS
```

**Out of memory:**

- Upgrade to GPU with more VRAM (RTX 4090)
- Or reduce batch size in code

**Connection refused:**

- Make sure port 8000 is exposed in pod settings
- Check server is running: `ps aux | grep uvicorn`

## Next Steps

1. ✅ Deploy pod
2. ✅ Install Coqui
3. ✅ Start server
4. ✅ Get public URL
5. ✅ Update Next.js code
6. ✅ Test voice generation
7. → Move to production deployment

Ready to proceed? Let me know when you've created your Runpod account and I'll walk you through the setup! 🚀
