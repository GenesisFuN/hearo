# RunPod Serverless TTS Setup

## Deploy to RunPod Serverless

### 1. Build and Push Docker Image

```bash
# Login to Docker Hub (or your registry)
docker login

# Build image
docker build -t YOUR_DOCKERHUB_USERNAME/hearo-tts:latest ./runpod-serverless

# Push to registry
docker push YOUR_DOCKERHUB_USERNAME/hearo-tts:latest
```

### 2. Create RunPod Serverless Endpoint

1. Go to https://www.runpod.io/console/serverless
2. Click "New Endpoint"
3. Configure:
   - **Name**: hearo-tts
   - **Container Image**: `YOUR_DOCKERHUB_USERNAME/hearo-tts:latest`
   - **GPU Type**: RTX 3090 or RTX 4090
   - **Min Workers**: 0 (scales to zero when not in use)
   - **Max Workers**: 3 (adjust based on expected traffic)
   - **Idle Timeout**: 5 seconds
   - **Execution Timeout**: 60 seconds

4. Click "Deploy"

### 3. Get Your Endpoint URL

After deployment, you'll get:

- **Endpoint ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- **API Key**: `XXXXXXXXXXXXXXXXXXXXXX`

Your endpoint URL will be:

```
https://api.runpod.ai/v2/{ENDPOINT_ID}/runsync
```

### 4. Update Environment Variables

Add to Vercel:

```bash
RUNPOD_ENDPOINT_ID=your_endpoint_id
RUNPOD_API_KEY=your_api_key
```

## Pricing

RunPod Serverless charges only for:

- **GPU Time**: ~$0.00034/second for RTX 3090
- **Example**: 1000 TTS generations (5 seconds each) = $1.70

Much cheaper than keeping a pod running 24/7 ($245/month)!

## Testing Your Endpoint

```bash
curl -X POST "https://api.runpod.ai/v2/YOUR_ENDPOINT_ID/runsync" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "text": "Hello, this is a test of the TTS system."
    }
  }'
```

## Next Steps

1. Build and push Docker image
2. Create RunPod Serverless endpoint
3. Update your Next.js app to use the new endpoint
