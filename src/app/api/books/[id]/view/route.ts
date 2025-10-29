import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Track a view/play
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Create unauthenticated client (views can be tracked anonymously)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const workId = params.id;

    // Increment view count
    const { error } = await supabase
      .from("works")
      .update({
        views_count: supabase.rpc("increment", { row_id: workId }),
      })
      .eq("id", workId);

    // Alternative if rpc doesn't work:
    // First get current count, then increment
    const { data: work } = await supabase
      .from("works")
      .select("views_count")
      .eq("id", workId)
      .single();

    if (work) {
      await supabase
        .from("works")
        .update({
          views_count: (work.views_count || 0) + 1,
        })
        .eq("id", workId);
    }

    return NextResponse.json({
      message: "View tracked successfully",
    });
  } catch (error) {
    console.error("Error tracking view:", error);
    // Don't fail the request if view tracking fails
    return NextResponse.json({
      message: "View tracking failed but continuing",
    });
  }
}
