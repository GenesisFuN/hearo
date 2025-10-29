import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
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

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch saved books for this user
    const { data: savedBooks, error: savedError } = await supabase
      .from("saved_books")
      .select(
        `
        id,
        created_at,
        work_id,
        works (
          id,
          title,
          description,
          genre,
          cover_image,
          is_public,
          created_at,
          creator_id,
          profiles (
            username,
            display_name
          ),
          audio_files (
            file_path
          )
        )
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (savedError) {
      console.error("Error fetching saved books:", savedError);
      return NextResponse.json(
        { error: "Failed to fetch saved books" },
        { status: 500 }
      );
    }

    // Format the response
    const books =
      savedBooks
        ?.filter((item: any) => item.works) // Only include books that still exist
        .map((item: any) => {
          const work = item.works;
          const profile = work.profiles;

          return {
            id: work.id,
            title: work.title,
            description: work.description,
            genre: work.genre,
            coverImage: work.cover_image,
            audioPath: work.audio_files?.[0]?.file_path,
            artist:
              profile?.display_name || profile?.username || "Unknown Artist",
            creatorId: work.creator_id,
            creatorUsername: profile?.username,
            publishedAt: work.published_at,
            savedAt: item.created_at,
          };
        }) || [];

    return NextResponse.json({ books });
  } catch (error) {
    console.error("Error in library API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
