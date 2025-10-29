// Test if audio URLs are accessible
const testUrl =
  "https://wrsvzwgexjsdkpjfyokh.supabase.co/storage/v1/object/public/audiobooks/26217f77-e737-4d7c-8138-68e73b948bd1/1761088606246-combined-audio.wav";

console.log("🧪 Testing audio URL access...\n");
console.log("URL:", testUrl);
console.log("\n📊 Fetching...");

fetch(testUrl)
  .then((response) => {
    console.log("\n✅ Response:");
    console.log("   Status:", response.status, response.statusText);
    console.log("   Content-Type:", response.headers.get("content-type"));
    console.log(
      "   Content-Length:",
      response.headers.get("content-length"),
      "bytes"
    );
    console.log(
      "   CORS:",
      response.headers.get("access-control-allow-origin")
    );

    if (response.ok) {
      console.log("\n✅ Audio file is accessible!");
    } else {
      console.log("\n❌ Audio file returned error");
    }
  })
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
  });
