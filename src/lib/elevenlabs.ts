// ElevenLabs API integration using fetch
// This avoids SDK compatibility issues while maintaining functionality

// Only import fs in server environment
let readFile: any, writeFile: any, mkdir: any, access: any;
if (typeof window === "undefined") {
  try {
    const fs = require("fs/promises");
    ({ readFile, writeFile, mkdir, access } = fs);
  } catch (e) {
    // In edge runtime, these won't be available
  }
}

import { createHash } from "crypto";
import { join } from "path";

export interface VoiceSettings {
  voiceId: string;
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
}

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!ELEVENLABS_API_KEY) {
  console.warn("ELEVENLABS_API_KEY not found in environment variables");
}

// Generate a hash for caching based on text content and voice settings
function generateCacheKey(text: string, voiceSettings: VoiceSettings): string {
  const cacheInput = JSON.stringify({
    text: text.trim(),
    voiceId: voiceSettings.voiceId,
    stability: voiceSettings.stability,
    similarityBoost: voiceSettings.similarityBoost,
    style: voiceSettings.style,
    useSpeakerBoost: voiceSettings.useSpeakerBoost,
  });

  return createHash("sha256").update(cacheInput).digest("hex");
}

// Get the cache file path for a given hash
function getCacheFilePath(cacheKey: string): string {
  const cacheDir = join(process.cwd(), "uploads", "audio", "cache");
  return join(cacheDir, `${cacheKey}.mp3`);
}

// Check if cached audio exists for the given text and voice settings
async function getCachedAudio(
  text: string,
  voiceSettings: VoiceSettings
): Promise<Buffer | null> {
  try {
    const cacheKey = generateCacheKey(text, voiceSettings);
    const cachePath = getCacheFilePath(cacheKey);

    // Check if file exists
    await access(cachePath);

    // Read and return the cached audio
    const cachedAudio = await readFile(cachePath);
    console.log(`Cache hit! Using cached audio for hash: ${cacheKey}`);
    return cachedAudio;
  } catch (error) {
    // File doesn't exist or other error - cache miss
    console.log("Cache miss, will generate new audio");
    return null;
  }
}

// Save generated audio to cache
async function saveToCache(
  text: string,
  voiceSettings: VoiceSettings,
  audioBuffer: Buffer
): Promise<void> {
  try {
    const cacheKey = generateCacheKey(text, voiceSettings);
    const cachePath = getCacheFilePath(cacheKey);
    const cacheDir = join(process.cwd(), "uploads", "audio", "cache");

    // Ensure cache directory exists
    await mkdir(cacheDir, { recursive: true });

    // Save audio to cache
    await writeFile(cachePath, audioBuffer);
    console.log(`Audio cached with hash: ${cacheKey}`);
  } catch (error) {
    console.error("Failed to cache audio:", error);
    // Don't throw - caching failure shouldn't break the main flow
  }
}

export async function generateSpeech(
  text: string,
  voiceSettings: VoiceSettings
): Promise<Buffer> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ElevenLabs API key not configured");
  }

  try {
    // First, check if we have cached audio for this text + voice combination
    const cachedAudio = await getCachedAudio(text, voiceSettings);
    if (cachedAudio) {
      return cachedAudio;
    }

    console.log("Generating speech with ElevenLabs:", {
      voiceId: voiceSettings.voiceId,
      textLength: text.length,
      settings: voiceSettings,
    });

    console.log(
      "VOICE DEBUG - Making request to ElevenLabs with voice:",
      voiceSettings.voiceId
    );
    console.log(
      "VOICE DEBUG - Full URL:",
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceSettings.voiceId}`
    );

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceSettings.voiceId}`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: voiceSettings.stability,
            similarity_boost: voiceSettings.similarityBoost,
            style: voiceSettings.style,
            use_speaker_boost: voiceSettings.useSpeakerBoost,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `ElevenLabs API error: ${response.status} - ${errorText}`
      );
    }

    console.log("ElevenLabs speech generation completed");

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    // Cache the generated audio for future use
    await saveToCache(text, voiceSettings, audioBuffer);

    return audioBuffer;
  } catch (error) {
    console.error("ElevenLabs API error:", error);
    throw new Error(
      `Failed to generate speech: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function getAvailableVoices() {
  if (!ELEVENLABS_API_KEY) {
    console.warn(
      "ElevenLabs API key not configured, returning empty voices list"
    );
    return [];
  }

  try {
    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.status}`);
    }

    const data = await response.json();
    return data.voices || [];
  } catch (error) {
    console.error("Failed to fetch voices:", error);
    return [];
  }
}

// Utility function to split long text into chunks
export function splitTextIntoChunks(
  text: string,
  maxChunkSize: number = 2500
): string[] {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    // If adding this sentence would exceed the limit, save current chunk and start new one
    if (currentChunk.length + trimmedSentence.length + 1 > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim() + ".");
        currentChunk = "";
      }
    }

    currentChunk += (currentChunk ? " " : "") + trimmedSentence;
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim() + ".");
  }

  return chunks;
}
