import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    // Get user from Authorization header
    const authorization = request.headers.get("Authorization");
    if (!authorization || !authorization.startsWith("Bearer ")) {
      console.error("Save API - No authorization header");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authorization.replace("Bearer ", "");

    // Create authenticated Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    console.log("Save API - Auth check:", {
      hasUser: !!user,
      userId: user?.id,
      userError: userError?.message,
    });

    if (userError || !user) {
      console.error("Save API - Unauthorized:", userError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get book ID from request body
    const body = await request.json();
    console.log("Save API - Received body:", body);
    const { bookId } = body;

    console.log("Save API - Extracted bookId:", bookId);

    if (!bookId) {
      console.error("Save API - No bookId provided");
      return NextResponse.json(
        { error: "Book ID is required" },
        { status: 400 }
      );
    }

    console.log("Save API - Looking for work with id:", bookId);

    // Check if book exists
    const { data: work, error: workError } = await supabase
      .from("works")
      .select("id")
      .eq("id", bookId)
      .single();

    console.log("Save API - Work query result:", { work, workError });

    if (workError || !work) {
      console.error("Save API - Book not found:", workError);
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Save the book (will fail gracefully if already saved due to UNIQUE constraint)
    const { data: savedBook, error: saveError } = await supabase
      .from("saved_books")
      .insert({
        user_id: user.id,
        work_id: bookId,
      })
      .select()
      .single();

    if (saveError) {
      // If duplicate, that's okay - book is already saved
      if (saveError.code === "23505") {
        return NextResponse.json({
          message: "Book already saved",
          saved: true,
        });
      }

      console.error("Error saving book:", saveError);
      return NextResponse.json(
        { error: "Failed to save book" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Book saved successfully",
      saved: true,
      savedBook,
    });
  } catch (error) {
    console.error("Error in save API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
