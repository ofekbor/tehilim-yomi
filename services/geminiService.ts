
import { GoogleGenAI, Type } from "@google/genai";
import { InsightData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const INSIGHT_CACHE_KEY = 'tehillim_insight_cache';

export async function getDailyInsight(chapters: string): Promise<InsightData> {
  // Check local cache first for today's chapters to save tokens and allow offline use
  const cached = localStorage.getItem(INSIGHT_CACHE_KEY);
  if (cached) {
    const parsed = JSON.parse(cached);
    if (parsed.chapters === chapters) {
      return parsed.data;
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide a short, inspirational spiritual insight in Hebrew for the Tehillim chapters: ${chapters}. 
                 The tone should be classic, warm, and encouraging. Return it as a JSON object.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A catchy Hebrew title for the insight" },
            content: { type: Type.STRING, description: "The insight text in Hebrew" },
            source: { type: Type.STRING, description: "A classic source or general attribution in Hebrew" }
          },
          required: ["title", "content", "source"]
        }
      }
    });

    const insight = JSON.parse(response.text.trim());
    
    // Save to cache
    localStorage.setItem(INSIGHT_CACHE_KEY, JSON.stringify({ chapters, data: insight }));
    
    return insight;
  } catch (error) {
    console.error("Gemini insight error:", error);
    
    // If we have any cached insight at all, return it even if for different chapters
    // This ensures the UI doesn't look empty when offline
    if (cached) {
      return JSON.parse(cached).data;
    }

    return {
      title: "השראה יומית",
      content: "פרקי התהילים של היום מלאים בנחמה וביטחון בבורא עולם. קריאתם מקרבת אותנו למקור החיים.",
      source: "מחשבת ישראל"
    };
  }
}
