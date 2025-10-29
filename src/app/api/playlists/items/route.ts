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

// POST - Add item to playlist
export async function POST(req: NextRequest) {
  try {
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

    const { playlistId, workId } = await req.json();

    if (!playlistId || !workId) {
      return NextResponse.json(
        { error: "Playlist ID and Work ID are required" },
        { status: 400 }
      );
    }

    // Verify playlist ownership
    const { data: playlist } = await supabaseAdmin
      .from("playlists")
      .select("id, user_id")
      .eq("id", playlistId)
      .single();

    if (!playlist || playlist.user_id !== user.id) {
      return NextResponse.json(
        { error: "Playlist not found or access denied" },
        { status: 403 }
      );
    }

    // Check if item already exists
    const { data: existing } = await supabaseAdmin
      .from("playlist_items")
      .select("id")
      .eq("playlist_id", playlistId)
      .eq("work_id", workId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Item already in playlist" },
        { status: 409 }
      );
    }

    // Add item (position will be auto-set by trigger)
    const { data: item, error: insertError } = await supabaseAdmin
      .from("playlist_items")
      .insert({
        playlist_id: playlistId,
        work_id: workId,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Add to playlist error:", insertError);
      return NextResponse.json(
        { error: "Failed to add item to playlist" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      item: {
        id: item.id,
        position: item.position,
        addedAt: item.added_at,
      },
      message: "Added to playlist successfully",
    });
  } catch (error) {
    console.error("Add to playlist error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Remove item from playlist
export async function DELETE(req: NextRequest) {
  try {
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

    const { playlistItemId } = await req.json();

    if (!playlistItemId) {
      return NextResponse.json(
        { error: "Playlist item ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership through playlist
    const { data: item } = await supabaseAdmin
      .from("playlist_items")
      .select("playlist_id, playlists!inner(user_id)")
      .eq("id", playlistItemId)
      .single();

    if (!item || (item.playlists as any).user_id !== user.id) {
      return NextResponse.json(
        { error: "Item not found or access denied" },
        { status: 403 }
      );
    }

    // Delete item
    const { error: deleteError } = await supabaseAdmin
      .from("playlist_items")
      .delete()
      .eq("id", playlistItemId);

    if (deleteError) {
      console.error("Remove from playlist error:", deleteError);
      return NextResponse.json(
        { error: "Failed to remove item from playlist" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Removed from playlist successfully",
    });
  } catch (error) {
    console.error("Remove from playlist error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
