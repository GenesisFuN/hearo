/**
 * Example: How to Integrate TTS Service into Upload Routes
 * 
 * This file shows how to modify your text upload route to use the
 * unified TTS service that automatically chooses between ElevenLabs
 * and Chatterbox based on user subscription.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateSpeech, type UserSubscription, type TTSOptions } from "@/lib/tts-service";

/**
 * Example: Get user subscription from request
 * You'll need to implement this based on your auth system
 */
async function getUserSubscription(req: NextRequest): Promise<UserSubscription> {
  // This is a placeholder - implement your actual auth/subscription logic
  // You might check Supabase auth, JWT tokens, session cookies, etc.
  
  // Example: Parse from headers or session
  const subscriptionTier = req.headers.get('x-subscription-tier') as 'free' | 'basic' | 'premium' | 'creator' || 'free';
  
  return {
    tier: subscriptionTier,
    features: {
      useSelfHostedTTS: subscriptionTier === 'premium' || subscriptionTier === 'creator',
      maxMonthlyGenerations: subscriptionTier === 'free' ? 10 : -1, // -1 = unlimited
    },
  };
}

/**
 * Example modified POST handler for text upload
 */
export async function POST(req: NextRequest) {
  try {
    console.log("Text upload API called");

    // Get user subscription
    const subscription = await getUserSubscription(req);
    console.log(`👤 User tier: ${subscription.tier}`);

    // ... existing code to handle file upload, duplicate detection, etc. ...

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const text = await file.text();

    // Check for duplicates (your existing logic)
    // const duplicateCheck = await checkForDuplicateContent(text);
    // if (duplicateCheck.isDuplicate) { ... }

    // Generate speech using the unified TTS service
    const ttsOptions: TTSOptions = {
      text: text,
      // ElevenLabs options (used if ElevenLabs is selected)
      voiceId: 'VR6AewLTigWG4xSOukaG', // Arnold voice
      stability: 0.75,
      similarityBoost: 0.75,
      style: 0,
      useSpeakerBoost: true,
      // Chatterbox options (used if Chatterbox is selected)
      exaggeration: 0.5,
      cfgWeight: 0.5,
      languageId: 'en',
    };

    // Generate speech - automatically uses correct provider
    const { audio, provider } = await generateSpeech(ttsOptions, subscription);

    console.log(`✅ Generated audio using ${provider} (${audio.length} bytes)`);

    // ... rest of your existing code to save the audio file, update database, etc. ...

    return NextResponse.json({
      success: true,
      provider: provider,
      message: `Audio generated successfully using ${provider}`,
    });

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to process upload" },
      { status: 500 }
    );
  }
}

/**
 * Example: Add a new endpoint to show user's TTS provider
 */
export async function GET(req: NextRequest) {
  try {
    const subscription = await getUserSubscription(req);
    
    // Import the helper function
    const { getTTSProviderInfo } = await import("@/lib/tts-service");
    const providerInfo = getTTSProviderInfo(subscription);

    return NextResponse.json({
      subscription: subscription.tier,
      ttsProvider: providerInfo,
    });

  } catch (error) {
    console.error("Error getting TTS info:", error);
    return NextResponse.json(
      { error: "Failed to get TTS information" },
      { status: 500 }
    );
  }
}

/**
 * Usage Notes:
 * 
 * 1. Update your subscription database to include TTS preferences:
 *    - Add 'useSelfHostedTTS' boolean field
 *    - Add 'maxMonthlyGenerations' number field
 * 
 * 2. Set up Chatterbox server (see docs/chatterbox-server-setup.md)
 * 
 * 3. Add CHATTERBOX_SERVER_URL to your .env.local:
 *    CHATTERBOX_SERVER_URL=http://localhost:8000
 * 
 * 4. The system will automatically:
 *    - Use ElevenLabs for free/basic users
 *    - Use Chatterbox for premium/creator users (if enabled)
 *    - Fallback to ElevenLabs if Chatterbox is unavailable
 * 
 * 5. Both services use caching to avoid redundant generations
 */
