import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create a Supabase client with the service role for admin operations
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

// Create a function to get authenticated client
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

export async function POST(req: NextRequest) {
  try {
    // Get the auth token from headers
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization required" },
        { status: 401 }
      );
    }

    // Get user from Supabase auth
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

    const { followingId } = await req.json();

    if (!followingId) {
      return NextResponse.json(
        { error: "Following user ID required" },
        { status: 400 }
      );
    }

    // Check if user is trying to follow themselves
    if (user.id === followingId) {
      return NextResponse.json(
        { error: "Cannot follow yourself" },
        { status: 400 }
      );
    }

    // Check if already following (use admin client to bypass RLS)
    const { data: existingFollow } = await supabaseAdmin
      .from("followers")
      .select("id")
      .eq("user_id", user.id)
      .eq("following_id", followingId)
      .single();

    if (existingFollow) {
      return NextResponse.json(
        { error: "Already following this user" },
        { status: 400 }
      );
    }

    // Create follow relationship (use admin client to bypass RLS)
    const { error: followError } = await supabaseAdmin
      .from("followers")
      .insert({
        user_id: user.id,
        following_id: followingId,
      });

    if (followError) {
      console.error("Follow error:", followError);
      return NextResponse.json(
        { error: "Failed to follow user" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Successfully followed user",
    });
  } catch (error) {
    console.error("Follow error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Get the auth token from headers
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization required" },
        { status: 401 }
      );
    }

    // Get user from Supabase auth
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

    const { followingId } = await req.json();

    if (!followingId) {
      return NextResponse.json(
        { error: "Following user ID required" },
        { status: 400 }
      );
    }

    // Delete follow relationship (use admin client to bypass RLS)
    const { error: unfollowError } = await supabaseAdmin
      .from("followers")
      .delete()
      .eq("user_id", user.id)
      .eq("following_id", followingId);

    if (unfollowError) {
      console.error("Unfollow error:", unfollowError);
      return NextResponse.json(
        { error: "Failed to unfollow user" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Successfully unfollowed user",
    });
  } catch (error) {
    console.error("Unfollow error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Get the auth token from headers
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization required" },
        { status: 401 }
      );
    }

    // Get user from Supabase auth
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

    const { searchParams } = new URL(req.url);
    const followingId = searchParams.get("followingId");

    if (!followingId) {
      return NextResponse.json(
        { error: "Following user ID required" },
        { status: 400 }
      );
    }

    // Check if following (use admin client to bypass RLS)
    const { data: followData } = await supabaseAdmin
      .from("followers")
      .select("id")
      .eq("user_id", user.id)
      .eq("following_id", followingId)
      .single();

    return NextResponse.json({
      isFollowing: !!followData,
    });
  } catch (error) {
    console.error("Check follow status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
