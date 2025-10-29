import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workId = id;

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
        { error: "Cannot like private books" },
        { status: 403 }
      );
    }

    // Toggle like (insert if not exists, delete if exists)
    const { data: existingLike } = await supabase
      .from("book_likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("work_id", workId)
      .single();

    if (existingLike) {
      // Unlike
      const { error: deleteError } = await supabase
        .from("book_likes")
        .delete()
        .eq("id", existingLike.id);

      if (deleteError) throw deleteError;

      return NextResponse.json({
        liked: false,
        message: "Book unliked",
      });
    } else {
      // Like
      const { error: insertError } = await supabase.from("book_likes").insert({
        user_id: user.id,
        work_id: workId,
      });

      if (insertError) throw insertError;

      return NextResponse.json({
        liked: true,
        message: "Book liked",
      });
    }
  } catch (error) {
    console.error("Error toggling like:", error);
    return NextResponse.json(
      { error: "Failed to toggle like" },
      { status: 500 }
    );
  }
}

// Get like status for current user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workId = id;

    // Get user from Authorization header
    const authorization = request.headers.get("Authorization");

    // If no auth, just return public data
    if (!authorization || !authorization.startsWith("Bearer ")) {
      // Create unauthenticated client to get public data
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: work } = await supabase
        .from("works")
        .select("likes_count")
        .eq("id", workId)
        .single();

      return NextResponse.json({
        liked: false,
        likesCount: work?.likes_count || 0,
      });
    }

    const token = authorization.replace("Bearer ", "");

    // Create authenticated client
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
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ liked: false, likesCount: 0 });
    }

    // Check if user has liked this book
    const { data: like } = await supabase
      .from("book_likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("work_id", workId)
      .single();

    // Get total likes count
    const { data: work } = await supabase
      .from("works")
      .select("likes_count")
      .eq("id", workId)
      .single();

    return NextResponse.json({
      liked: !!like,
      likesCount: work?.likes_count || 0,
    });
  } catch (error) {
    console.error("Error getting like status:", error);
    return NextResponse.json(
      { error: "Failed to get like status" },
      { status: 500 }
    );
  }
}
