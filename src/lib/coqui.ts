/**
 * Coqui TTS Integration
 * Provides self-hosted TTS using Coqui XTTS v2 model
 */

const COQUI_SERVER_URL =
  process.env.COQUI_SERVER_URL || "http://localhost:8000";

export interface CoquiGenerateOptions {
  text: string;
  speaker_wav?: string; // Path to voice sample for cloning
  language?: string; // Default: 'en'
  temperature?: number; // 0.1-1.0, lower = more stable, higher = more expressive (default: 0.5)
  speed?: number; // 0.5-2.0, speech speed multiplier (default: 0.92)
  speaker?: string; // Speaker name for default voices (default: "Claribel Dervla")
  denoiser_strength?: number; // 0.0-1.0, removes robotic hiss (default: 0.01, recommended 0.005-0.02 for subtle)
}

export interface CoquiServerInfo {
  service: string;
  model: string;
  device: string;
  features: {
    voice_cloning: boolean;
    multilingual: boolean;
    languages: string[];
  };
  performance: {
    cpu: string;
    gpu: string;
  };
}

/**
 * Check if Coqui server is healthy
 */
export async function checkCoquiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${COQUI_SERVER_URL}/health`);
    if (!response.ok) return false;

    const data = await response.json();
    return data.status === "healthy";
  } catch (error) {
    console.error("Coqui health check failed:", error);
    return false;
  }
}

/**
 * Get Coqui server information
 */
export async function getCoquiInfo(): Promise<CoquiServerInfo | null> {
  try {
    const response = await fetch(`${COQUI_SERVER_URL}/info`);
    if (!response.ok) return null;

    return await response.json();
  } catch (error) {
    console.error("Failed to get Coqui info:", error);
    return null;
  }
}

/**
 * Generate speech using Coqui TTS
 */
export async function generateCoquiSpeech(
  options: CoquiGenerateOptions
): Promise<ArrayBuffer> {
  const {
    text,
    speaker_wav, // Voice cloning disabled by default (undefined = use default speaker)
    language = "en",
    temperature = 0.5, // Lower temperature for less robotic, more natural speech
    speed = 0.92, // Audiobook pace - most natural sounding
    speaker = "Claribel Dervla", // Claribel sounds most natural
    denoiser_strength = 0.02, // Light denoising - balanced hiss removal without voice degradation
  } = options;

  if (!text || text.trim().length === 0) {
    throw new Error("Text is required for speech generation");
  }

  try {
    const response = await fetch(`${COQUI_SERVER_URL}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        speaker_wav,
        language,
        temperature,
        speed,
        speaker,
        denoiser_strength,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to generate speech");
    }

    // Return audio as ArrayBuffer
    return await response.arrayBuffer();
  } catch (error) {
    console.error("Coqui TTS generation failed:", error);
    throw error;
  }
}

/**
 * Upload a voice sample for cloning
 */
export async function uploadVoiceSample(
  audioFile: File
): Promise<{ path: string; filename: string }> {
  try {
    const formData = new FormData();
    formData.append("voice", audioFile);

    const response = await fetch(`${COQUI_SERVER_URL}/voices/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to upload voice sample");
    }

    const data = await response.json();
    return {
      path: data.path,
      filename: data.filename,
    };
  } catch (error) {
    console.error("Voice upload failed:", error);
    throw error;
  }
}

/**
 * Generate speech with optional caching
 * Similar to ElevenLabs integration but for Coqui
 */
export async function generateCoquiSpeechWithCache(
  text: string,
  language: string = "en",
  speaker_wav?: string
): Promise<ArrayBuffer> {
  // For now, just generate without caching
  // Can add caching later if needed
  return generateCoquiSpeech({
    text,
    language,
    speaker_wav,
  });
}
