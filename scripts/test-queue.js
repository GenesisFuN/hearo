// Quick test script for TTS Queue
// Run with: node scripts/test-queue.js

require("dotenv").config({ path: ".env.local" });
const fetch = require("node-fetch");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testQueue() {
  console.log("🧪 Testing TTS Queue...\n");

  // Step 1: Create a test auth session
  console.log("📝 First, you need to get your auth token:");
  console.log("   1. Open your Hearo app in browser: http://localhost:3000");
  console.log("   2. Open DevTools (F12)");
  console.log("   3. Go to Console tab");
  console.log("   4. Paste this and press Enter:");
  console.log(
    "      (await supabase.auth.getSession()).data.session.access_token"
  );
  console.log("   5. Copy the token (without quotes)\n");

  const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  readline.question("Paste your auth token here: ", async (token) => {
    readline.close();

    if (!token || token.length < 20) {
      console.error("❌ Invalid token. Please try again.");
      return;
    }

    // Step 2: Create a test job
    console.log("\n📤 Creating test TTS job...");

    try {
      const response = await fetch("http://localhost:3000/api/tts/queue", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workId: "test-work-" + Date.now(),
          chapters: [
            {
              id: "ch1",
              text: "This is a test chapter for the TTS queue system. It will be processed by the worker.",
              title: "Test Chapter 1",
            },
            {
              id: "ch2",
              text: "This is the second test chapter. The worker processes chapters sequentially.",
              title: "Test Chapter 2",
            },
          ],
          voiceSettings: {
            voiceId: "default",
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("❌ Error:", data.error);
        console.log(
          '\nNote: If you see "Work not found", you need to create a real work first.'
        );
        console.log(
          "      Or modify the test to use an existing work_id from your database."
        );
        return;
      }

      console.log("✅ Job created successfully!");
      console.log("\n📊 Job Details:");
      console.log("   Job ID:", data.jobId);
      console.log("   Status:", data.job.status);
      console.log("   Chapters:", data.job.totalChapters);
      console.log(
        "\n🔍 Watch your worker terminal - it should pick up this job!"
      );
      console.log("\n💡 To check job status, run:");
      console.log(`   node scripts/check-job.js ${data.jobId}`);
    } catch (error) {
      console.error("❌ Network error:", error.message);
    }
  });
}

testQueue();
