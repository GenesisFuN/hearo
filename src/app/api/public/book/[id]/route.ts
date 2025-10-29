import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workId } = await params;

    if (!workId) {
      return NextResponse.json(
        { error: "Book ID is required" },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    console.log("Fetching book with ID:", workId);

    // Fetch public book from database
    const { data: work, error: workError } = await supabase
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
      .eq("id", workId)
      .eq("is_public", true)
      .single();

    if (workError) {
      console.error("Error fetching book:", workError);
      return NextResponse.json(
        { error: "Book not found", details: workError },
        { status: 404 }
      );
    }

    if (!work) {
      console.log("No book found with ID:", workId);
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    console.log("Book found:", work.title);

    // Get audio file
    const { data: audioFiles } = await supabase
      .from("audio_files")
      .select("file_path, file_size_bytes, duration_seconds")
      .eq("work_id", workId);

    // Track view (increment counter)
    await supabase
      .from("works")
      .update({
        views_count: (work.views_count || 0) + 1,
      })
      .eq("id", workId);

    // Format response
    const publicBook = {
      id: work.id,
      originalId: work.id, // Add originalId for save functionality
      title: work.title,
      description: work.description,
      coverImage: work.cover_image,
      audioPath: audioFiles?.[0]?.file_path,
      genre: work.genre || "Others",
      publishedAt: work.created_at,
      views: (work.views_count || 0) + 1, // Return incremented count
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

    return NextResponse.json({
      success: true,
      book: publicBook,
    });
  } catch (error) {
    console.error("Get public book error:", error);
    return NextResponse.json(
      { error: "Failed to get public book" },
      { status: 500 }
    );
  }
}
