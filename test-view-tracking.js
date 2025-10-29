// Test View Tracking
// Run this with: node test-view-tracking.js

const workId = "c49c6faa-7241-4f06-9487-61ae8d9f05a2"; // Your Glass Forest book ID

async function testViewTracking() {
  console.log("🔍 Testing view tracking...\n");

  try {
    const response = await fetch("http://localhost:3000/api/analytics/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workId: workId,
        eventType: "view",
        eventData: {},
      }),
    });

    if (response.ok) {
      console.log("✅ View event tracked successfully!");
      const data = await response.json();
      console.log("Response:", data);
    } else {
      console.error("❌ Failed to track view event");
      console.error("Status:", response.status);
      const error = await response.text();
      console.error("Error:", error);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testViewTracking();
