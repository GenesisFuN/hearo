/**
 * Unified TTS Service
 * Uses Coqui TTS (self-hosted) as default for all tiers
 * Falls back to ElevenLabs if Coqui is unavailable
 * ElevenLabs reserved for future premium features
 */

import { generateSpeech as generateSpeechElevenLabs } from "./elevenlabs";
import { generateCoquiSpeech, checkCoquiHealth } from "./coqui";

export type TTSProvider = "elevenlabs" | "coqui";

export interface TTSOptions {
  // Common options
  text: string;

  // ElevenLabs options
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;

  // Coqui options
  audioPromptPath?: string; // Path to voice sample for cloning
  languageId?: string; // Language code (en, es, fr, etc.)
  exaggeration?: number; // Legacy from Chatterbox (not used by Coqui)
  cfgWeight?: number; // Legacy from Chatterbox (not used by Coqui)
}

export interface UserSubscription {
  tier: "free" | "basic" | "premium" | "creator";
  features?: {
    useElevenLabs?: boolean; // Reserved for future premium feature
    useSelfHostedTTS?: boolean; // Use Coqui TTS (default for premium/creator)
    maxMonthlyGenerations?: number;
  };
}

/**
 * Determine which TTS provider to use based on subscription
 * Default: Coqui TTS (self-hosted, free)
 * Fallback: ElevenLabs (if Coqui unavailable)
 * Future: ElevenLabs as premium feature for higher tiers
 */
export function selectTTSProvider(subscription: UserSubscription): TTSProvider {
  // Future: Premium tiers can opt-in to use ElevenLabs
  // if (subscription.tier === "premium" || subscription.tier === "creator") {
  //   if (subscription.features?.useElevenLabs) {
  //     return "elevenlabs";
  //   }
  // }

  // Default to Coqui for all tiers (self-hosted, no API costs)
  return "coqui";
}

/**
 * Generate speech using the appropriate TTS provider
 */
export async function generateSpeech(
  options: TTSOptions,
  subscription: UserSubscription
): Promise<{ audio: Buffer; provider: TTSProvider }> {
  const provider = selectTTSProvider(subscription);

  console.log(
    `🎙️ Using TTS provider: ${provider} (tier: ${subscription.tier})`
  );

  try {
    if (provider === "coqui") {
      // Check if Coqui is available
      const isHealthy = await checkCoquiHealth();

      if (!isHealthy) {
        console.warn("⚠️ Coqui server unavailable, falling back to ElevenLabs");
        const audio = await generateSpeechElevenLabs(options.text, {
          voiceId: options.voiceId || "VR6AewLTigWG4xSOukaG",
          stability: options.stability ?? 0.75,
          similarityBoost: options.similarityBoost ?? 0.75,
          style: options.style ?? 0,
          useSpeakerBoost: options.useSpeakerBoost ?? true,
        });
        return { audio, provider: "elevenlabs" };
      }

      // Use Coqui
      const audioBuffer = await generateCoquiSpeech({
        text: options.text,
        speaker_wav: options.audioPromptPath,
        language: options.languageId || "en",
      });

      // Convert ArrayBuffer to Buffer
      const audio = Buffer.from(audioBuffer);

      return { audio, provider: "coqui" };
    } else {
      // Use ElevenLabs
      const audio = await generateSpeechElevenLabs(options.text, {
        voiceId: options.voiceId || "VR6AewLTigWG4xSOukaG",
        stability: options.stability ?? 0.75,
        similarityBoost: options.similarityBoost ?? 0.75,
        style: options.style ?? 0,
        useSpeakerBoost: options.useSpeakerBoost ?? true,
      });

      return { audio, provider: "elevenlabs" };
    }
  } catch (error) {
    console.error(`TTS generation failed with ${provider}:`, error);
    throw error;
  }
}

/**
 * Get TTS provider info for display in UI
 */
export function getTTSProviderInfo(subscription: UserSubscription) {
  const provider = selectTTSProvider(subscription);

  return {
    provider,
    name:
      provider === "coqui" ? "Coqui TTS (Self-Hosted)" : "ElevenLabs (Premium)",
    description:
      provider === "coqui"
        ? "High-quality open-source TTS - Free for all users"
        : "Premium cloud-based text-to-speech",
    features:
      provider === "coqui"
        ? [
            "Free for all users",
            "Zero-shot voice cloning",
            "Multilingual (17 languages)",
            "Self-hosted control",
          ]
        : [
            "Premium feature (future)",
            "High-quality voices",
            "Fast generation",
            "Cloud-based",
          ],
  };
}

export async function listAvailableVoices(): Promise<string[]> {
  try {
    const response = await fetch("http://localhost:8000/voices");
    const data = await response.json();
    return data.voices || [];
  } catch (error) {
    console.error("Failed to fetch available voices:", error);
    return [];
  }
}
