import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    // Get user from Authorization header
    const authorization = request.headers.get("Authorization");
    if (!authorization || !authorization.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required - please sign in" },
        { status: 401 }
      );
    }

    const token = authorization.replace("Bearer ", "");

    // Create authenticated Supabase client for this request
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
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return NextResponse.json(
        { error: "Invalid authentication - please sign in again" },
        { status: 401 }
      );
    }

    console.log("📚 Fetching books for user:", user.id);

    // Query works table with engagement data - RLS will automatically filter to user's works
    const { data: works, error: worksError } = await supabase
      .from("works")
      .select(
        `
        *,
        likes_count,
        comments_count,
        average_rating,
        ratings_count,
        views_count
      `
      )
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });

    if (worksError) {
      console.error("Error fetching works:", worksError);
      return NextResponse.json(
        {
          error: "Failed to fetch books from database",
          details: worksError.message,
        },
        { status: 500 }
      );
    }

    console.log(`📚 Found ${works?.length || 0} works for user ${user.id}`);

    if (works && works.length > 0) {
      console.log(
        "Works details:",
        works.map((w) => ({ id: w.id, title: w.title, status: w.status }))
      );
    }

    // Get audio files separately for each work
    const booksWithAudio = await Promise.all(
      (works || []).map(async (work: any) => {
        const { data: audioFiles } = await supabase
          .from("audio_files")
          .select(
            "id, file_path, file_size_bytes, duration_seconds, tts_provider"
          )
          .eq("work_id", work.id);

        return {
          work,
          audioFiles: audioFiles || [],
        };
      })
    );

    // Transform to match expected format
    const books = booksWithAudio.map(({ work, audioFiles }) => ({
      id: work.id,
      title: work.title,
      filename: work.title, // Add filename for compatibility
      description: work.description,
      coverImage: work.cover_image, // Fixed: use cover_image column
      type: audioFiles?.length > 0 ? "audio" : "text",
      status: work.status,
      isPublic: work.is_public,
      hasAudio: audioFiles?.length > 0,
      audioPath: audioFiles?.[0]?.file_path, // Use file_path from audio_files table
      createdAt: work.created_at,
      uploadDate: work.created_at, // Add uploadDate for compatibility
      fileSize: audioFiles?.[0]?.file_size_bytes || 0, // Get actual file size from audio_files
      progress:
        work.progress_percent ?? // Use nullish coalescing to allow 0
        (work.status === "published"
          ? 100
          : work.status === "processing"
            ? 50
            : 0), // Fallback only if null/undefined
      processingMessage:
        work.status === "processing"
          ? `Generating audio... ${work.progress_percent ?? 0}%`
          : undefined,
      // Engagement data
      likes: work.likes_count || 0,
      comments: work.comments_count || 0,
      averageRating: work.average_rating || 0,
      ratingsCount: work.ratings_count || 0,
      views: work.views_count || 0,
    }));

    console.log(`✅ Returning ${books.length} books to frontend`);

    return NextResponse.json({
      success: true,
      books,
      count: books.length,
    });
  } catch (error) {
    console.error("Error fetching books:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch books",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
