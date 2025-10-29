import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Fetch all public books from database
    console.log("🔍 Fetching public books from database...");
    const { data: works, error: worksError } = await supabase
      .from("works")
      .select(
        `
        *,
        likes_count,
        comments_count,
        average_rating,
        ratings_count,
        views_count,
        creator:profiles(id, username)
      `
      )
      .eq("is_public", true)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    console.log("📊 Query result:", {
      worksCount: works?.length || 0,
      error: worksError,
      works: works,
    });

    if (worksError) {
      console.error("❌ Error fetching public books:", worksError);
      return NextResponse.json({
        success: true,
        books: [],
        count: 0,
      });
    }

    // Get audio files for each work
    console.log(`📁 Fetching audio files for ${works?.length || 0} works...`);
    const booksWithAudio = await Promise.all(
      (works || []).map(async (work: any) => {
        const { data: audioFiles, error: audioError } = await supabase
          .from("audio_files")
          .select("file_path, file_size_bytes, duration_seconds")
          .eq("work_id", work.id);

        if (audioError) {
          console.error(
            `❌ Error fetching audio for work ${work.id}:`,
            audioError
          );
        } else {
          console.log(`✅ Audio files for "${work.title}":`, audioFiles);
        }

        return {
          id: work.id,
          originalId: work.id, // For backwards compatibility
          title: work.title,
          description: work.description,
          coverImage: work.cover_image,
          audioPath: audioFiles?.[0]?.file_path,
          genre: work.genre || "Others",
          publishedAt: work.created_at,
          views: work.views_count || 0,
          likes: work.likes_count || 0,
          comments: work.comments_count || 0,
          averageRating: work.average_rating || 0,
          ratingsCount: work.ratings_count || 0,
          isPublic: work.is_public,
          author: work.creator
            ? {
                id: work.creator.id,
                name: work.creator.username,
                username: work.creator.username,
                avatar: null,
              }
            : undefined,
        };
      })
    );

    console.log(`✅ Returning ${booksWithAudio.length} books to frontend`);
    return NextResponse.json({
      success: true,
      books: booksWithAudio,
      count: booksWithAudio.length,
    });
  } catch (error) {
    console.error("Get public books error:", error);
    return NextResponse.json(
      { error: "Failed to get public books" },
      { status: 500 }
    );
  }
}
