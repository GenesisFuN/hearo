import { NextRequest, NextResponse } from "next/server";
import { moderateText } from "@/lib/moderation";

/**
 * Test endpoint for content moderation
 * Tests various categories without requiring actual offensive content upload
 */
export async function POST(request: NextRequest) {
  try {
    const { testType } = await request.json();

    // Test cases with representative text that should trigger moderation
    const testCases: Record<string, string> = {
      // Should be BLOCKED
      hate: "I hate all people from [specific group]. They should all be eliminated.",
      threatening: "I'm going to find you and hurt you for what you said.",
      minors: "Sexual content involving children under 18.",

      // Should be ALLOWED
      romance:
        "She kissed him passionately as they embraced, their bodies pressed together in the moonlight.",
      violence:
        "The assassin struck swiftly, blood spattering across the wall as the knife found its mark.",
      thriller:
        "The serial killer stalked his prey through the dark alley, knife gleaming in the streetlight.",
      conflict:
        "They argued bitterly, harsh words exchanged in anger and frustration.",
      mentalHealth:
        "The character struggled with depression and had thoughts of self-harm throughout the chapter.",

      // Control - totally clean
      clean:
        "The birds sang sweetly in the trees as the sun rose over the peaceful valley.",
    };

    if (!testType || !testCases[testType]) {
      return NextResponse.json(
        {
          error: "Invalid test type",
          availableTests: Object.keys(testCases),
        },
        { status: 400 }
      );
    }

    const testText = testCases[testType];
    const result = await moderateText(testText);

    return NextResponse.json({
      testType,
      textSample: testText.substring(0, 100) + "...",
      result: {
        flagged: result.flagged,
        blockedCategories: result.blockedCategories,
        reason: result.reason,
        categories: result.categories,
        categoryScores: result.category_scores,
      },
      debug: {
        rawFlagged: result.flagged,
        allCategories: result.categories,
        allScores: result.category_scores,
      },
      expected:
        testType === "hate" ||
        testType === "threatening" ||
        testType === "minors"
          ? "BLOCKED"
          : "ALLOWED",
      passed:
        (result.flagged &&
          (testType === "hate" ||
            testType === "threatening" ||
            testType === "minors")) ||
        (!result.flagged &&
          testType !== "hate" &&
          testType !== "threatening" &&
          testType !== "minors"),
    });
  } catch (error) {
    console.error("Test error:", error);
    return NextResponse.json(
      { error: "Test failed", details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Content Moderation Test Endpoint",
    usage: "POST with { testType: string }",
    availableTests: [
      "hate - Should be BLOCKED",
      "threatening - Should be BLOCKED",
      "minors - Should be BLOCKED",
      "romance - Should be ALLOWED",
      "violence - Should be ALLOWED",
      "thriller - Should be ALLOWED",
      "conflict - Should be ALLOWED",
      "mentalHealth - Should be ALLOWED",
      "clean - Should be ALLOWED",
    ],
  });
}
