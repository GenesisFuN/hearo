// Test Analytics Tracking
// Run this with: node test-analytics.js

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAnalytics() {
  console.log("🔍 Testing Analytics Tracking...\n");

  // Check if tables exist
  console.log("1️⃣ Checking if analytics tables exist...");
  const { data: tables, error: tablesError } = await supabase
    .from("analytics_events")
    .select("id")
    .limit(1);

  if (tablesError) {
    console.error("❌ Error accessing analytics_events:", tablesError.message);
    return;
  }
  console.log("✅ analytics_events table exists\n");

  // Check for recent events
  console.log("2️⃣ Checking for recent analytics events...");
  const { data: events, error: eventsError } = await supabase
    .from("analytics_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  if (eventsError) {
    console.error("❌ Error fetching events:", eventsError.message);
    return;
  }

  if (events.length === 0) {
    console.log("⚠️  No events found yet. Try:\n");
    console.log("   - Navigate to a book page (view event)");
    console.log("   - Play some audio (play_start, play_progress events)");
    console.log("   - Like a book (like event)");
    console.log("   - Post a comment (comment event)\n");
  } else {
    console.log(`✅ Found ${events.length} recent events:\n`);
    events.forEach((event, i) => {
      console.log(`   ${i + 1}. ${event.event_type.toUpperCase()}`);
      console.log(`      Work ID: ${event.work_id}`);
      console.log(`      User ID: ${event.user_id || "anonymous"}`);
      console.log(`      Time: ${new Date(event.created_at).toLocaleString()}`);
      if (event.event_data) {
        console.log(`      Data: ${JSON.stringify(event.event_data)}`);
      }
      console.log("");
    });
  }

  // Check event type breakdown
  console.log("3️⃣ Event type breakdown:");
  const { data: breakdown, error: breakdownError } = await supabase
    .from("analytics_events")
    .select("event_type");

  if (!breakdownError && breakdown.length > 0) {
    const counts = {};
    breakdown.forEach((e) => {
      counts[e.event_type] = (counts[e.event_type] || 0) + 1;
    });

    Object.entries(counts).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
  } else {
    console.log("   No events yet");
  }

  console.log("\n✨ Analytics test complete!");
}

testAnalytics().catch(console.error);
