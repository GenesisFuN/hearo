import { NextRequest, NextResponse } from "next/server";
import {
  createAuthenticatedClient,
  createAdminClient,
} from "../../../../lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json(
        { error: "Authorization token required" },
        { status: 401 }
      );
    }

    // Verify user with authenticated client
    const authenticatedClient = createAuthenticatedClient(token);
    const {
      data: { user },
      error: authError,
    } = await authenticatedClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { displayName, bio, avatarUrl } = body;

    // Validate inputs
    if (displayName && displayName.trim().length === 0) {
      return NextResponse.json(
        { error: "Display name cannot be empty" },
        { status: 400 }
      );
    }

    if (displayName && displayName.length > 100) {
      return NextResponse.json(
        { error: "Display name must be 100 characters or less" },
        { status: 400 }
      );
    }

    if (bio && bio.length > 500) {
      return NextResponse.json(
        { error: "Bio must be 500 characters or less" },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updates: {
      display_name?: string;
      bio?: string;
      avatar_url?: string;
    } = {};

    if (displayName !== undefined) {
      updates.display_name = displayName.trim();
    }
    if (bio !== undefined) {
      updates.bio = bio.trim();
    }
    if (avatarUrl !== undefined) {
      updates.avatar_url = avatarUrl.trim() || null;
    }

    // Use admin client to update profile
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Profile update error:", error);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: data.id,
        username: data.username,
        displayName: data.display_name,
        bio: data.bio,
        avatarUrl: data.avatar_url,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
