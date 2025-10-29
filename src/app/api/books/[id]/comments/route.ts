import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Get comments for a book
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workId } = await params;

    // Create unauthenticated client for public reads
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    console.log("Fetching comments for work_id:", workId);

    // Get comments with user info
    const { data: comments, error } = await supabase
      .from("book_comments")
      .select(
        `
        id,
        comment_text,
        parent_comment_id,
        created_at,
        updated_at,
        user:profiles(id, username)
      `
      )
      .eq("work_id", workId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching comments from database:", error);
      throw error;
    }

    console.log("Successfully fetched comments:", comments?.length || 0);

    return NextResponse.json({ comments: comments || [] });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments", details: error },
      { status: 500 }
    );
  }
}

// Create a new comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workId } = await params;

    // Get user from Authorization header
    const authorization = request.headers.get("Authorization");
    if (!authorization || !authorization.startsWith("Bearer ")) {
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

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { commentText, parentCommentId } = body;

    if (!commentText || commentText.trim().length === 0) {
      return NextResponse.json(
        { error: "Comment text is required" },
        { status: 400 }
      );
    }

    if (commentText.length > 1000) {
      return NextResponse.json(
        { error: "Comment must be 1000 characters or less" },
        { status: 400 }
      );
    }

    // Check if book exists and is public
    const { data: work, error: workError } = await supabase
      .from("works")
      .select("id, is_public")
      .eq("id", workId)
      .single();

    if (workError || !work) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    if (!work.is_public) {
      return NextResponse.json(
        { error: "Cannot comment on private books" },
        { status: 403 }
      );
    }

    // Insert comment
    const { data: comment, error: insertError } = await supabase
      .from("book_comments")
      .insert({
        user_id: user.id,
        work_id: workId,
        comment_text: commentText.trim(),
        parent_comment_id: parentCommentId || null,
      })
      .select(
        `
        id,
        comment_text,
        parent_comment_id,
        created_at,
        updated_at,
        user:profiles(id, username)
      `
      )
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({
      comment,
      message: "Comment created successfully",
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
