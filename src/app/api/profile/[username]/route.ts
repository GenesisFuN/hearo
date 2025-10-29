import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    console.log("📋 Fetching profile for username:", username);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        "id, username, display_name, bio, avatar_url, user_type, created_at, followers_count, following_count"
      )
      .eq("username", username)
      .single();

    if (profileError || !profile) {
      console.error("Profile not found:", profileError);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user's published works with engagement stats
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
        audio_files!inner (
          id,
          file_path,
          duration_seconds
        )
      `
      )
      .eq("creator_id", profile.id)
      .eq("is_public", true)
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false });

    if (worksError) {
      console.error("Error fetching works:", worksError);
    }

    // Calculate stats
    const stats = {
      booksCount: works?.length || 0,
      totalViews:
        works?.reduce((sum, work) => sum + (work.views_count || 0), 0) || 0,
      totalLikes:
        works?.reduce((sum, work) => sum + (work.likes_count || 0), 0) || 0,
      averageRating: works?.length
        ? works.reduce((sum, work) => sum + (work.average_rating || 0), 0) /
          works.length
        : 0,
      followers: profile.followers_count || 0,
    };

    // Transform works
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
    }));

    console.log(`✅ Found profile with ${books.length} books`);

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        username: profile.username,
        displayName: profile.display_name || profile.username,
        bio: profile.bio,
        avatar: profile.avatar_url,
        userType: profile.user_type,
        joinedAt: profile.created_at,
        stats,
      },
      books,
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch profile",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
