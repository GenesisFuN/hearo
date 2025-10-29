import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization required" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid authentication" },
        { status: 401 }
      );
    }

    // Get list of users the current user follows
    const { data: following, error: followError } = await supabase
      .from("followers")
      .select("following_id")
      .eq("user_id", user.id);

    if (followError) {
      console.error("Error fetching following:", followError);
      return NextResponse.json(
        { error: "Failed to fetch following list" },
        { status: 500 }
      );
    }

    const followingIds = following?.map((f) => f.following_id) || [];

    if (followingIds.length === 0) {
      return NextResponse.json({
        success: true,
        books: [],
        message: "You're not following anyone yet",
      });
    }

    // Fetch published books from followed users
    const { data: works, error: worksError } = await supabase
      .from("works")
      .select(
        `
        id,
        title,
        description,
        genre,
        cover_image,
        created_at,
        published_at,
        views_count,
        likes_count,
        average_rating,
        ratings_count,
        comments_count,
        creator_id,
        profiles!inner (
          id,
          username,
          display_name,
          avatar_url
        ),
        audio_files!inner (
          id,
          file_path,
          duration_seconds
        )
      `
      )
      .in("creator_id", followingIds)
      .eq("is_public", true)
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(50);

    if (worksError) {
      console.error("Error fetching works:", worksError);
      return NextResponse.json(
        { error: "Failed to fetch books" },
        { status: 500 }
      );
    }

    // Transform the data
    const books = (works || []).map((work: any) => ({
      id: work.id,
      title: work.title,
      description: work.description,
      genre: work.genre,
      coverImage: work.cover_image,
      audioPath: work.audio_files?.[0]?.file_path || "",
      duration: work.audio_files?.[0]?.duration_seconds || 0,
      publishedAt: work.published_at || work.created_at,
      views: work.views_count || 0,
      likes: work.likes_count || 0,
      rating: work.average_rating || 0,
      ratingsCount: work.ratings_count || 0,
      comments: work.comments_count || 0,
      author: {
        id: work.profiles.id,
        name: work.profiles.display_name || work.profiles.username,
        username: work.profiles.username,
        avatar: work.profiles.avatar_url,
      },
    }));

    return NextResponse.json({
      success: true,
      books,
      count: books.length,
    });
  } catch (error) {
    console.error("Feed error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
