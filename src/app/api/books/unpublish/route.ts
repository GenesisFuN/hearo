import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { bookId } = await request.json();

    if (!bookId) {
      return NextResponse.json(
        { error: "Book ID is required" },
        { status: 400 }
      );
    }

    // Get user from Authorization header
    const authorization = request.headers.get("Authorization");
    if (!authorization || !authorization.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "Authentication required - please sign in to unpublish books",
        },
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
        {
          error: "Book not found or you don't have permission to unpublish it",
        },
        { status: 404 }
      );
    }

    // Check if book is public
    if (!work.is_public) {
      return NextResponse.json({
        success: true,
        message: "Book is already private",
        bookTitle: work.title,
      });
    }

    // Update work to be private
    const { error: updateError } = await supabase
      .from("works")
      .update({
        is_public: false,
      })
      .eq("id", bookId);

    if (updateError) {
      console.error("Error unpublishing book:", updateError);
      return NextResponse.json(
        { error: "Failed to remove book from community" },
        { status: 500 }
      );
    }

    console.log(
      `Book unpublished: ${work.title} (ID: ${bookId}) by user ${user.id}`
    );

    return NextResponse.json({
      success: true,
      message: "Book successfully removed from public view",
      bookTitle: work.title,
    });
  } catch (error) {
    console.error("Unpublish error:", error);
    return NextResponse.json(
      { error: "Failed to unpublish book" },
      { status: 500 }
    );
  }
}
