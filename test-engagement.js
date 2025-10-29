// Quick test script for engagement endpoints
// Run in browser console on your Next.js app

async function testEngagement() {
  console.log("🧪 Testing Social Engagement APIs...\n");

  // Get your auth token
  const supabase =
    window.supabase ||
    (await import("@supabase/supabase-js")).createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    console.error("❌ Not authenticated. Please sign in first.");
    return;
  }

  const token = session.access_token;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // Get first book from your library
  const booksRes = await fetch("/api/books", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const booksData = await booksRes.json();

  if (!booksData.books || booksData.books.length === 0) {
    console.error("❌ No books found. Upload a book first.");
    return;
  }

  const bookId = booksData.books[0].id;
  const bookTitle = booksData.books[0].title;

  console.log(`📚 Testing with book: "${bookTitle}" (${bookId})\n`);

  // Test 1: Like the book
  console.log("1️⃣ Testing LIKE...");
  const likeRes = await fetch(`/api/books/${bookId}/like`, {
    method: "POST",
    headers,
  });
  const likeData = await likeRes.json();
  console.log("✅ Like result:", likeData);
  console.log("");

  // Test 2: Rate the book
  console.log("2️⃣ Testing RATING (5 stars)...");
  const rateRes = await fetch(`/api/books/${bookId}/rate`, {
    method: "POST",
    headers,
    body: JSON.stringify({ rating: 5 }),
  });
  const rateData = await rateRes.json();
  console.log("✅ Rating result:", rateData);
  console.log("");

  // Test 3: Post a comment
  console.log("3️⃣ Testing COMMENT...");
  const commentRes = await fetch(`/api/books/${bookId}/comments`, {
    method: "POST",
    headers,
    body: JSON.stringify({ commentText: "Amazing audiobook! 🎧" }),
  });
  const commentData = await commentRes.json();
  console.log("✅ Comment result:", commentData);
  console.log("");

  // Test 4: Track a view
  console.log("4️⃣ Testing VIEW tracking...");
  const viewRes = await fetch(`/api/books/${bookId}/view`, {
    method: "POST",
  });
  const viewData = await viewRes.json();
  console.log("✅ View result:", viewData);
  console.log("");

  // Test 5: Get all comments
  console.log("5️⃣ Testing GET comments...");
  const getCommentsRes = await fetch(`/api/books/${bookId}/comments`);
  const getCommentsData = await getCommentsRes.json();
  console.log("✅ Comments:", getCommentsData);
  console.log("");

  // Test 6: Get engagement status
  console.log("6️⃣ Testing GET engagement status...");
  const getLikeRes = await fetch(`/api/books/${bookId}/like`, { headers });
  const getLikeData = await getLikeRes.json();
  console.log("✅ Like status:", getLikeData);

  const getRateRes = await fetch(`/api/books/${bookId}/rate`, { headers });
  const getRateData = await getRateRes.json();
  console.log("✅ Rating status:", getRateData);
  console.log("");

  // Test 7: Unlike the book
  console.log("7️⃣ Testing UNLIKE...");
  const unlikeRes = await fetch(`/api/books/${bookId}/like`, {
    method: "POST",
    headers,
  });
  const unlikeData = await unlikeRes.json();
  console.log("✅ Unlike result:", unlikeData);
  console.log("");

  console.log(
    "🎉 All tests completed! Check Supabase dashboard to verify data."
  );
}

// Run the test
testEngagement().catch(console.error);
