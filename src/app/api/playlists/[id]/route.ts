import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const getAuthenticatedClient = (token: string) => {
  return createClient(
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
};

// GET - Fetch playlist with items
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization required" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const authenticatedClient = getAuthenticatedClient(token);
    const {
      data: { user },
      error: authError,
    } = await authenticatedClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid authentication" },
        { status: 401 }
      );
    }

    // Fetch playlist
    const { data: playlist, error: playlistError } = await supabaseAdmin
      .from("playlists")
      .select("*")
      .eq("id", id)
      .single();

    if (playlistError || !playlist) {
      return NextResponse.json(
        { error: "Playlist not found" },
        { status: 404 }
      );
    }

    // Check permissions
    if (playlist.user_id !== user.id && !playlist.is_public) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch playlist items with work details
    const { data: items, error: itemsError } = await supabaseAdmin
      .from("playlist_items")
      .select(
        `
        id,
        work_id,
        position,
        added_at
      `
      )
      .eq("playlist_id", id)
      .order("position", { ascending: true });

    if (itemsError) {
      console.error("Items fetch error:", itemsError);
      return NextResponse.json(
        { error: "Failed to fetch playlist items" },
        { status: 500 }
      );
    }

    // Fetch full work details for each item
    const booksWithDetails = await Promise.all(
      (items || []).map(async (item: any) => {
        // Get work
        const { data: work } = await supabaseAdmin
          .from("works")
          .select("*")
          .eq("id", item.work_id)
          .single();

        if (!work) return null;

        // Get audio files
        const { data: audioFiles } = await supabaseAdmin
          .from("audio_files")
          .select("id, file_path, duration_seconds")
          .eq("work_id", work.id);

        // Get author profile
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .eq("id", work.creator_id)
          .single();

        return {
          playlistItemId: item.id,
          workId: item.work_id,
          position: item.position,
          addedAt: item.added_at,
          work: {
            id: work.id,
            title: work.title,
            description: work.description,
            genre: work.genre,
            coverImage: work.cover_image,
            audioPath: audioFiles?.[0]?.file_path || "",
            duration: audioFiles?.[0]?.duration_seconds || 0,
            views: work.views_count || 0,
            likes: work.likes_count || 0,
            rating: work.average_rating || 0,
            author: profile
              ? {
                  id: profile.id,
                  name: profile.display_name || profile.username,
                  username: profile.username,
                  avatar: profile.avatar_url,
                }
              : null,
          },
        };
      })
    );

    // Filter out null entries (deleted works)
    const validBooks = booksWithDetails.filter((book) => book !== null);

    const books = validBooks.map((item: any) => ({
      id: item.playlistItemId,
      playlistItemId: item.playlistItemId,
      workId: item.workId,
      position: item.position,
      addedAt: item.addedAt,
      work: item.work,
    }));

    return NextResponse.json({
      success: true,
      playlist: {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        isPublic: playlist.is_public,
        createdAt: playlist.created_at,
        updatedAt: playlist.updated_at,
      },
      items: books,
    });
  } catch (error) {
    console.error("Playlist fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update playlist
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization required" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const authenticatedClient = getAuthenticatedClient(token);
    const {
      data: { user },
      error: authError,
    } = await authenticatedClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid authentication" },
        { status: 401 }
      );
    }

    const { name, description, isPublic } = await req.json();

    // Update playlist
    const { data: playlist, error: updateError } = await supabaseAdmin
      .from("playlists")
      .update({
        name: name?.trim(),
        description: description?.trim() || null,
        is_public: isPublic,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("Playlist update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update playlist" },
        { status: 500 }
      );
    }

    if (!playlist) {
      return NextResponse.json(
        { error: "Playlist not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      playlist: {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        isPublic: playlist.is_public,
        createdAt: playlist.created_at,
        updatedAt: playlist.updated_at,
      },
    });
  } catch (error) {
    console.error("Playlist update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete playlist
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization required" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const authenticatedClient = getAuthenticatedClient(token);
    const {
      data: { user },
      error: authError,
    } = await authenticatedClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid authentication" },
        { status: 401 }
      );
    }

    // Delete playlist (cascade will delete items)
    const { error: deleteError } = await supabaseAdmin
      .from("playlists")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Playlist delete error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete playlist" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Playlist deleted successfully",
    });
  } catch (error) {
    console.error("Playlist delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
