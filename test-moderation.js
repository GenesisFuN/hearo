// Test Content Moderation
// Run with: node test-moderation.js

const tests = [
  { name: "Hate Speech (Should BLOCK)", type: "hate" },
  { name: "Threats (Should BLOCK)", type: "threatening" },
  { name: "Minors (Should BLOCK)", type: "minors" },
  { name: "Romance (Should ALLOW)", type: "romance" },
  { name: "Violence/Thriller (Should ALLOW)", type: "violence" },
  { name: "Character Conflict (Should ALLOW)", type: "conflict" },
  { name: "Mental Health (Should ALLOW)", type: "mentalHealth" },
  { name: "Clean Content (Should ALLOW)", type: "clean" },
];

async function runTests() {
  console.log("🧪 Testing Content Moderation\n");
  console.log("Testing against: http://localhost:3000/api/test-moderation\n");

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const response = await fetch(
        "http://localhost:3000/api/test-moderation",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testType: test.type }),
        }
      );

      const result = await response.json();

      const status = result.passed ? "✅ PASS" : "❌ FAIL";
      const action = result.result.flagged ? "🚫 BLOCKED" : "✅ ALLOWED";

      console.log(`${status} | ${action} | ${test.name}`);

      // Show debug info for failed tests
      if (!result.passed && result.debug) {
        console.log(`   📊 OpenAI Categories:`, result.debug.allCategories);
        console.log(`   📈 Scores:`, result.debug.allScores);
      }

      if (result.result.flagged) {
        console.log(`   Reason: ${result.result.reason}`);
      }

      if (result.passed) {
        passed++;
      } else {
        failed++;
        console.log(
          `   ⚠️  Expected: ${result.expected}, Got: ${result.result.flagged ? "BLOCKED" : "ALLOWED"}`
        );
      }

      console.log("");

      // Add delay to avoid rate limits (500ms between requests)
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.log(`❌ FAIL | ${test.name}`);
      console.log(`   Error: ${error.message}\n`);
      failed++;
    }
  }

  console.log("=".repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(60));

  if (failed === 0) {
    console.log(
      "\n🎉 All tests passed! Content moderation is working correctly.\n"
    );
  } else {
    console.log(
      "\n⚠️  Some tests failed. Check your OPENAI_API_KEY configuration.\n"
    );
  }
}

// Run tests
runTests().catch(console.error);
