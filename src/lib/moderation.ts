// OpenAI Content Moderation
// Filters out hate speech and illegal content while allowing creative content

export interface ModerationResult {
  flagged: boolean;
  categories: {
    hate: boolean;
    "hate/threatening": boolean;
    harassment: boolean;
    "harassment/threatening": boolean;
    "self-harm": boolean;
    "self-harm/intent": boolean;
    "self-harm/instructions": boolean;
    sexual: boolean;
    "sexual/minors": boolean;
    violence: boolean;
    "violence/graphic": boolean;
  };
  category_scores: {
    hate: number;
    "hate/threatening": number;
    harassment: number;
    "harassment/threatening": number;
    "self-harm": number;
    "self-harm/intent": number;
    "self-harm/instructions": number;
    sexual: number;
    "sexual/minors": number;
    violence: number;
    "violence/graphic": number;
  };
  blockedCategories?: string[];
  reason?: string;
}

/**
 * Moderates text content using OpenAI's Moderation API
 * Blocks: hate speech, harassment, sexual content involving minors
 * Allows: sexual content (romance), violence (thrillers) - normal book content
 *
 * @param text - The text content to moderate
 * @returns ModerationResult with flagged status and details
 */
export async function moderateText(text: string): Promise<ModerationResult> {
  try {
    const apiKey = process.env.MODERATION_API_KEY;

    if (!apiKey) {
      console.warn("⚠️ OpenAI API key not configured, skipping moderation");
      return {
        flagged: false,
        categories: {} as any,
        category_scores: {} as any,
      };
    }

    // Truncate text if too long (OpenAI has limits)
    // Sample first 2000 and last 2000 characters for long texts
    let textToModerate = text;
    if (text.length > 4000) {
      const start = text.substring(0, 2000);
      const end = text.substring(text.length - 2000);
      textToModerate = start + "\n...\n" + end;
    }

    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: textToModerate,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("OpenAI Moderation API error:", response.status, errorBody);
      // Don't block upload if moderation fails - fail open
      return {
        flagged: false,
        categories: {} as any,
        category_scores: {} as any,
      };
    }

    const data = await response.json();
    const result = data.results[0];

    console.log("🔍 OpenAI Moderation Result:", {
      flagged: result.flagged,
      categories: result.categories,
      scores: result.category_scores,
    });

    // Custom filtering: Only block specific categories
    // BLOCKED: hate, hate/threatening, harassment/threatening, sexual/minors
    // ALLOWED: sexual (romance), violence (thrillers), harassment (if not threatening)
    const blockedCategories: string[] = [];
    let shouldBlock = false;

    // Block hate speech
    if (result.categories.hate || result.categories["hate/threatening"]) {
      blockedCategories.push("Hate speech");
      shouldBlock = true;
      console.log("🚫 Blocking: Hate speech detected");
    }

    // Block threatening harassment (but allow regular harassment/conflict in stories)
    if (result.categories["harassment/threatening"]) {
      blockedCategories.push("Threatening harassment");
      shouldBlock = true;
      console.log("🚫 Blocking: Threatening harassment detected");
    }

    // CRITICAL: Block any content involving minors
    if (result.categories["sexual/minors"]) {
      blockedCategories.push("Sexual content involving minors");
      shouldBlock = true;
      console.log("🚫 Blocking: Sexual content involving minors detected");
    }

    // Optional: Block extreme self-harm instructions (but allow mentions in mental health books)
    if (result.categories["self-harm/instructions"]) {
      blockedCategories.push("Self-harm instructions");
      shouldBlock = true;
      console.log("🚫 Blocking: Self-harm instructions detected");
    }

    console.log("✅ Final decision:", shouldBlock ? "BLOCK" : "ALLOW");

    return {
      flagged: shouldBlock,
      categories: result.categories,
      category_scores: result.category_scores,
      blockedCategories: shouldBlock ? blockedCategories : undefined,
      reason: shouldBlock
        ? `Content blocked due to: ${blockedCategories.join(", ")}`
        : undefined,
    };
  } catch (error) {
    console.error("Moderation error:", error);
    // Fail open - don't block upload if moderation service fails
    return {
      flagged: false,
      categories: {} as any,
      category_scores: {} as any,
    };
  }
}

/**
 * Moderates text with detailed logging for admin review
 */
export async function moderateTextWithLogging(
  text: string,
  userId: string,
  contentType: "book" | "title" | "description"
): Promise<ModerationResult> {
  const result = await moderateText(text);

  // Log moderation results for tracking
  console.log("Content moderation:", {
    userId,
    contentType,
    flagged: result.flagged,
    blockedCategories: result.blockedCategories,
    textLength: text.length,
    timestamp: new Date().toISOString(),
  });

  // If flagged, you could also store in database for admin review
  if (result.flagged) {
    console.warn("⚠️ CONTENT BLOCKED:", {
      userId,
      contentType,
      reason: result.reason,
      categories: result.blockedCategories,
    });
  }

  return result;
}
