/**
 * Chatterbox TTS Integration
 * Self-hosted TTS solution for premium users
 */

import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const CHATTERBOX_CACHE_DIR = path.join(
  process.cwd(),
  "uploads",
  "audio",
  "cache"
);
const CHATTERBOX_SERVER_URL =
  process.env.CHATTERBOX_SERVER_URL || "http://localhost:8000";

interface ChatterboxOptions {
  voiceId?: string;
  audioPromptPath?: string;
  exaggeration?: number;
  cfgWeight?: number;
  languageId?: string;
}

/**
 * Generate a hash for caching purposes
 */
function generateContentHash(text: string, options: ChatterboxOptions): string {
  const content = JSON.stringify({ text, options });
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Check if audio is cached
 */
export async function getCachedAudioChatterbox(
  text: string,
  options: ChatterboxOptions = {}
): Promise<Buffer | null> {
  try {
    const hash = generateContentHash(text, options);
    const cachePath = path.join(CHATTERBOX_CACHE_DIR, `${hash}.mp3`);

    const audioBuffer = await fs.readFile(cachePath);
    console.log("✅ Chatterbox cache hit:", hash.substring(0, 16));
    return audioBuffer;
  } catch (error) {
    console.log("❌ Chatterbox cache miss");
    return null;
  }
}

/**
 * Save audio to cache
 */
async function saveToCache(
  text: string,
  options: ChatterboxOptions,
  audioBuffer: Buffer
): Promise<void> {
  try {
    await fs.mkdir(CHATTERBOX_CACHE_DIR, { recursive: true });
    const hash = generateContentHash(text, options);
    const cachePath = path.join(CHATTERBOX_CACHE_DIR, `${hash}.mp3`);
    await fs.writeFile(cachePath, audioBuffer);
    console.log("💾 Audio cached with hash:", hash);
  } catch (error) {
    console.error("Failed to cache audio:", error);
  }
}

/**
 * Generate speech using Chatterbox TTS via HTTP API
 * This assumes you have a Chatterbox server running (see docs/chatterbox-server-setup.md)
 */
export async function generateSpeechChatterbox(
  text: string,
  options: ChatterboxOptions = {}
): Promise<Buffer> {
  console.log("Generating speech with Chatterbox:", {
    textLength: text.length,
    options,
  });

  // Check cache first
  const cachedAudio = await getCachedAudioChatterbox(text, options);
  if (cachedAudio) {
    return cachedAudio;
  }

  try {
    // Call Chatterbox HTTP server
    const response = await fetch(`${CHATTERBOX_SERVER_URL}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        audio_prompt_path: options.audioPromptPath,
        exaggeration: options.exaggeration ?? 0.5,
        cfg_weight: options.cfgWeight ?? 0.5,
        language_id: options.languageId ?? "en",
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Chatterbox API error: ${response.status} ${response.statusText}`
      );
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    console.log("✅ Chatterbox speech generation completed");

    // Cache the result
    await saveToCache(text, options, audioBuffer);

    return audioBuffer;
  } catch (error) {
    console.error("Chatterbox TTS error:", error);
    throw new Error(`Failed to generate speech with Chatterbox: ${error}`);
  }
}

/**
 * Generate speech using Chatterbox TTS via Python subprocess
 * This is an alternative method if you don't want to run a separate server
 */
export async function generateSpeechChatterboxSubprocess(
  text: string,
  options: ChatterboxOptions = {}
): Promise<Buffer> {
  console.log("Generating speech with Chatterbox (subprocess):", {
    textLength: text.length,
    options,
  });

  // Check cache first
  const cachedAudio = await getCachedAudioChatterbox(text, options);
  if (cachedAudio) {
    return cachedAudio;
  }

  return new Promise((resolve, reject) => {
    const tempFile = path.join(CHATTERBOX_CACHE_DIR, `temp-${Date.now()}.wav`);

    // Python script to call Chatterbox
    const pythonScript = `
import sys
import json
from chatterbox.tts import ChatterboxTTS
import torchaudio as ta

# Parse input
data = json.loads(sys.argv[1])
text = data['text']
output_path = data['output_path']
audio_prompt_path = data.get('audio_prompt_path')
exaggeration = data.get('exaggeration', 0.5)
cfg_weight = data.get('cfg_weight', 0.5)

# Initialize model
model = ChatterboxTTS.from_pretrained(device="cuda")

# Generate audio
if audio_prompt_path:
    wav = model.generate(text, audio_prompt_path=audio_prompt_path, exaggeration=exaggeration, cfg_weight=cfg_weight)
else:
    wav = model.generate(text, exaggeration=exaggeration, cfg_weight=cfg_weight)

# Save to file
ta.save(output_path, wav, model.sr)
print(f"Audio saved to {output_path}")
`;

    const args = JSON.stringify({
      text,
      output_path: tempFile,
      audio_prompt_path: options.audioPromptPath,
      exaggeration: options.exaggeration,
      cfg_weight: options.cfgWeight,
    });

    const python = spawn("python", ["-c", pythonScript, args]);

    let stderr = "";
    python.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    python.on("close", async (code) => {
      if (code !== 0) {
        reject(new Error(`Chatterbox subprocess failed: ${stderr}`));
        return;
      }

      try {
        const audioBuffer = await fs.readFile(tempFile);
        await fs.unlink(tempFile); // Clean up temp file

        // Cache the result
        await saveToCache(text, options, audioBuffer);

        console.log("✅ Chatterbox speech generation completed (subprocess)");
        resolve(audioBuffer);
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * Health check for Chatterbox server
 */
export async function checkChatterboxHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${CHATTERBOX_SERVER_URL}/health`, {
      method: "GET",
    });
    return response.ok;
  } catch (error) {
    console.error("Chatterbox server not available:", error);
    return false;
  }
}
