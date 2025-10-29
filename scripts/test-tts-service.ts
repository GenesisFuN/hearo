/**
 * Test script for TTS service integration
 * Run with: npx tsx scripts/test-tts-service.ts
 */

import {
  generateSpeech,
  getTTSProviderInfo,
  type UserSubscription,
} from "../src/lib/tts-service";
import { writeFile } from "fs/promises";
import { join } from "path";

async function testTTSService() {
  console.log("🧪 Testing TTS Service Integration\n");
  console.log("=".repeat(60));

  // Test data
  const testText =
    "Hello! This is a test of the text-to-speech system. It should work with both ElevenLabs and Chatterbox.";

  // Test different subscription tiers
  const subscriptions: { name: string; subscription: UserSubscription }[] = [
    {
      name: "Free Tier (Coqui default)",
      subscription: {
        tier: "free",
        features: {
          maxMonthlyGenerations: 10,
        },
      },
    },
    {
      name: "Creator Tier (Coqui with premium features)",
      subscription: {
        tier: "creator",
        features: {
          useSelfHostedTTS: true,
          maxMonthlyGenerations: -1,
        },
      },
    },
  ];

  for (const { name, subscription } of subscriptions) {
    console.log(`\n📋 Testing: ${name}`);
    console.log("-".repeat(60));

    // Get provider info
    const providerInfo = getTTSProviderInfo(subscription);
    console.log(`Provider: ${providerInfo.name}`);
    console.log(`Features: ${providerInfo.features.join(", ")}`);

    try {
      // Generate speech
      console.log("\n🎙️  Generating speech...");
      const startTime = Date.now();

      const { audio, provider } = await generateSpeech(
        {
          text: testText,
          voiceId: "VR6AewLTigWG4xSOukaG", // Arnold voice for ElevenLabs
          stability: 0.75,
          similarityBoost: 0.75,
          exaggeration: 0.5,
          cfgWeight: 0.5,
        },
        subscription
      );

      const duration = Date.now() - startTime;

      console.log(`✅ Success!`);
      console.log(`   Provider used: ${provider}`);
      console.log(`   Audio size: ${audio.length} bytes`);
      console.log(`   Duration: ${duration}ms`);

      // Save test audio
      const filename = `test-audio-${provider}-${Date.now()}.mp3`;
      const outputPath = join(process.cwd(), "uploads", "audio", filename);
      await writeFile(outputPath, audio);
      console.log(`   Saved to: ${filename}`);
    } catch (error) {
      console.error(`❌ Failed:`, error);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ TTS Service test complete!\n");
}

// Run the test
testTTSService().catch(console.error);
