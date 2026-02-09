
import { InsightData } from "../types";

const INSIGHT_CACHE_KEY = "tehillim_insight_cache";

/**
 * Lightweight, browser-safe insight generator.
 * Keeps the same API as before but avoids depending on the @google/genai SDK,
 * which can break in browser / edge runtimes.
 */
export async function getDailyInsight(chapters: string): Promise<InsightData> {
  // Try cache first so the text feels "stable" for a given day / range
  try {
    const cached = localStorage.getItem(INSIGHT_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.chapters === chapters && parsed.data) {
        return parsed.data as InsightData;
      }
    }
  } catch {
    // Ignore cache errors and fall through to default
  }

  // Simple built‑in fallback insight
  const insight: InsightData = {
    title: "השראה יומית",
    content:
      "קריאת פרקי התהילים של היום פותחת שערי רחמים ומקרבת את האדם לבוראו. קח רגע של שקט, התבוננות ותפילה מעומק הלב.",
    source: `עיון במזמורי היום (${chapters})`,
  };

  try {
    localStorage.setItem(
      INSIGHT_CACHE_KEY,
      JSON.stringify({ chapters, data: insight })
    );
  } catch {
    // Ignore write errors (e.g. private mode)
  }

  return insight;
}
