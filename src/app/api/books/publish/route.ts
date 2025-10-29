import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { bookId, genre } = await request.json();

    if (!bookId || !genre) {
      return NextResponse.json(
        { error: "Book ID and genre are required" },
        { status: 400 }
      );
    }

    // Get user from Authorization header
    const authorization = request.headers.get("Authorization");
    if (!authorization || !authorization.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required - please sign in to publish books" },
        { status: 401 }
      );
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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError);
      return NextResponse.json(
        { error: "Invalid authentication - please sign in again" },
        { status: 401 }
      );
    }

    // Check if book exists and belongs to user
    const { data: work, error: workError } = await supabase
      .from("works")
      .select("*")
      .eq("id", bookId)
      .eq("creator_id", user.id)
      .single();

    if (workError || !work) {
      console.error("Work not found or access denied:", workError);
      return NextResponse.json(
        { error: "Book not found or you don't have permission to publish it" },
        { status: 404 }
      );
    }

    // Check if already published
    if (work.is_public) {
      return NextResponse.json({
        success: true,
        message: "Book already published",
        bookId: work.id,
        shareUrl: `${request.nextUrl.origin}/public/book/${work.id}`,
      });
    }

    // Ensure book has audio and is in published status
    if (work.status !== "published") {
      return NextResponse.json(
        {
          error:
            "Book must be fully processed before publishing. Current status: " +
            work.status,
        },
        { status: 400 }
      );
    }

    // Update work to be public with genre
    const { error: updateError } = await supabase
      .from("works")
      .update({
        is_public: true,
        genre: genre,
      })
      .eq("id", bookId);

    if (updateError) {
      console.error("Error publishing book:", updateError);
      return NextResponse.json(
        { error: "Failed to publish book to community" },
        { status: 500 }
      );
    }

    console.log(
      `Book published: ${work.title} (ID: ${bookId}) with genre: ${genre}`
    );

    return NextResponse.json({
      success: true,
      message: "Book published successfully",
      bookId: work.id,
      shareUrl: `${request.nextUrl.origin}/public/book/${work.id}`,
    });
  } catch (error) {
    console.error("Publish error:", error);
    return NextResponse.json(
      { error: "Failed to publish book" },
      { status: 500 }
    );
  }
}
