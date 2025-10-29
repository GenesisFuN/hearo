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

// POST - Track analytics event
export async function POST(req: NextRequest) {
  try {
    const { workId, eventType, eventData } = await req.json();

    if (!workId || !eventType) {
      return NextResponse.json(
        { error: "Work ID and event type are required" },
        { status: 400 }
      );
    }

    // Valid event types
    const validEventTypes = [
      "view",
      "play_start",
      "play_progress",
      "play_complete",
      "like",
      "comment",
      "share",
    ];

    if (!validEventTypes.includes(eventType)) {
      return NextResponse.json(
        { error: "Invalid event type" },
        { status: 400 }
      );
    }

    let userId = null;

    // Try to get user ID if authenticated (optional for analytics)
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const authenticatedClient = getAuthenticatedClient(token);
      const {
        data: { user },
      } = await authenticatedClient.auth.getUser();
      if (user) {
        userId = user.id;
      }
    }

    // Insert analytics event
    const { error: insertError } = await supabaseAdmin
      .from("analytics_events")
      .insert({
        user_id: userId,
        work_id: workId,
        event_type: eventType,
        event_data: eventData || {},
      });

    if (insertError) {
      console.error("Analytics insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to track event" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Event tracked successfully",
    });
  } catch (error) {
    console.error("Analytics tracking error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
