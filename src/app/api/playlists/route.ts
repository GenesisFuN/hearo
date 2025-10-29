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

// GET - Fetch user's playlists
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

    // Fetch user's playlists with item count
    const { data: playlists, error: playlistsError } = await supabaseAdmin
      .from("playlists")
      .select(
        `
        id,
        name,
        description,
        is_public,
        created_at,
        updated_at,
        playlist_items(count)
      `
      )
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (playlistsError) {
      console.error("Playlists fetch error:", playlistsError);
      return NextResponse.json(
        { error: "Failed to fetch playlists" },
        { status: 500 }
      );
    }

    const transformedPlaylists = (playlists || []).map((playlist: any) => ({
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      isPublic: playlist.is_public,
      itemCount: playlist.playlist_items[0]?.count || 0,
      createdAt: playlist.created_at,
      updatedAt: playlist.updated_at,
    }));

    return NextResponse.json({
      success: true,
      playlists: transformedPlaylists,
    });
  } catch (error) {
    console.error("Playlist fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new playlist
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

    const { name, description, isPublic } = await req.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Playlist name is required" },
        { status: 400 }
      );
    }

    if (name.length > 255) {
      return NextResponse.json(
        { error: "Playlist name must be 255 characters or less" },
        { status: 400 }
      );
    }

    // Create playlist
    const { data: playlist, error: createError } = await supabaseAdmin
      .from("playlists")
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        is_public: isPublic || false,
      })
      .select()
      .single();

    if (createError) {
      console.error("Playlist creation error:", createError);
      return NextResponse.json(
        { error: "Failed to create playlist" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      playlist: {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        isPublic: playlist.is_public,
        itemCount: 0,
        createdAt: playlist.created_at,
        updatedAt: playlist.updated_at,
      },
    });
  } catch (error) {
    console.error("Playlist creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
