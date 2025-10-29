// Simple direct database test - no API, no auth needed
// Run with: node scripts/test-queue-simple.js

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testQueue() {
  console.log("🧪 Creating test TTS job directly in database...\n");

  try {
    // Use one of your existing works
    const workId = "b95b5878-7e95-48f9-a1ca-634f6dbdf2e0"; // The Thawing Season

    // Get the creator_id from the work
    const { data: work, error: workError } = await supabase
      .from("works")
      .select("creator_id")
      .eq("id", workId)
      .single();

    if (workError || !work) {
      console.error(
        "❌ Failed to get work:",
        workError?.message || "Work not found"
      );
      return;
    }

    console.log("📚 Found work owned by user:", work.creator_id);

    const testJob = {
      work_id: workId,
      user_id: work.creator_id,
      status: "pending",
      priority: 5,
      payload: {
        chapters: [
          {
            chapterNumber: 1,
            text: "This is a test chapter. The TTS worker should process this text.",
            title: "Test Chapter One",
          },
        ],
        voiceSettings: {
          // Don't specify voiceId to use default speaker
          language: "en",
          temperature: 0.5,
          speed: 0.92,
          speaker: "Claribel Dervla",
          denoiserStrength: 0.02,
        },
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Insert directly into database
    const { data, error } = await supabase
      .from("tts_jobs")
      .insert(testJob)
      .select()
      .single();

    if (error) {
      console.error("❌ Failed to create job:", error.message);
      return;
    }

    console.log("✅ Test job created successfully!");
    console.log("📋 Job ID:", data.id);
    console.log("📊 Status:", data.status);
    console.log("🎯 Priority:", data.priority);
    console.log(
      "\n👀 Now watch your worker terminal - it should pick up this job within 5 seconds!"
    );
    console.log("\n📊 Check job status by running:");
    console.log("   node scripts/check-queue.js");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testQueue();
