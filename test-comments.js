// Test Comments vs Analytics
// Run this with: node test-comments.js

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testComments() {
  console.log("🔍 Testing Comments vs Analytics Events...\n");

  const workId = "c49c6faa-7241-4f06-9487-61ae8d9f05a2"; // Glass Forest

  // Check actual comments in database
  console.log("1️⃣ Checking actual comments in database...");
  const { data: comments, error: commentsError } = await supabase
    .from("book_comments")
    .select("*")
    .eq("work_id", workId);

  if (commentsError) {
    console.error("❌ Error fetching comments:", commentsError.message);
  } else {
    console.log(`✅ Found ${comments.length} actual comments in database\n`);
    comments.forEach((comment, i) => {
      console.log(`   ${i + 1}. "${comment.comment_text.substring(0, 50)}..."`);
      console.log(
        `      Posted at: ${new Date(comment.created_at).toLocaleString()}`
      );
      console.log("");
    });
  }

  // Check comment events in analytics
  console.log("2️⃣ Checking comment events in analytics...");
  const { data: events, error: eventsError } = await supabase
    .from("analytics_events")
    .select("*")
    .eq("work_id", workId)
    .eq("event_type", "comment");

  if (eventsError) {
    console.error("❌ Error fetching events:", eventsError.message);
  } else {
    console.log(`✅ Found ${events.length} comment events in analytics\n`);
  }

  console.log(
    "\n💡 TIP: Comments created before analytics tracking won't have events."
  );
  console.log("   New comments will be tracked going forward.");
}

testComments().catch(console.error);
