// Single test to verify moderation works
// Run with: node test-single-moderation.js

async function testSingle() {
  console.log("🧪 Testing Single Moderation Request\n");
  console.log("Testing HATE SPEECH (should be BLOCKED)...\n");

  try {
    const response = await fetch("http://localhost:3000/api/test-moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testType: "hate" }),
    });

    const result = await response.json();

    console.log("Result:", result.result.flagged ? "🚫 BLOCKED" : "✅ ALLOWED");
    console.log("\nDetails:");
    console.log("  Expected: BLOCKED");
    console.log("  Got:", result.result.flagged ? "BLOCKED ✅" : "ALLOWED ❌");
    console.log(
      "\n  Categories:",
      result.debug?.allCategories || result.result.categories
    );
    console.log("  Scores:", result.debug?.allScores || result.result.scores);

    if (result.result.flagged) {
      console.log("  Blocked Categories:", result.result.blockedCategories);
      console.log("  Reason:", result.result.reason);
    }

    console.log("\n" + "=".repeat(60));
    if (result.passed) {
      console.log("✅ SUCCESS! Moderation is working correctly!");
    } else {
      console.log("❌ FAIL: Expected BLOCKED but got ALLOWED");
    }
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testSingle().catch(console.error);
