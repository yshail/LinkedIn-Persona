import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * OCEAN Model (Big Five) Personality Interface
 */
interface OceanAnalysis {
  title: string; // Creative archetype or title
  openness: {
    score: number; // 1-100
    description: string;
    evidence: string[];
  };
  conscientiousness: {
    score: number;
    description: string;
    evidence: string[];
  };
  extraversion: {
    score: number;
    description: string;
    evidence: string[];
  };
  agreeableness: {
    score: number;
    description: string;
    evidence: string[];
  };
  neuroticism: {
    score: number;
    description: string;
    evidence: string[];
  };
  overallPersonaSummary: string;
}

export async function analyzePersonality() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not found in environment variables.");
  }

  // Use the new GoogleGenAI SDK as per your successful test
  const ai = new GoogleGenAI({ apiKey });

  // Load scraped data
  const profilePath = "./scraped-profile.json";
  const postsPath = "./scraped-posts.json";

  if (!fs.existsSync(profilePath) || !fs.existsSync(postsPath)) {
    throw new Error(
      "Scraped data files not found. Please run the scraper first.",
    );
  }

  const profile = JSON.parse(fs.readFileSync(profilePath, "utf-8"));
  const posts = JSON.parse(fs.readFileSync(postsPath, "utf-8"));

  const prompt = `
    Analyze the following LinkedIn profile and recent activity posts to create a detailed personality profile using the OCEAN (Big Five) model.
    Return ONLY a JSON object.
    
    ### OCEAN Model Definitions:
    - Openness: Appreciation for art, emotion, adventure, unusual ideas, curiosity, and variety of experience.
    - Conscientiousness: A tendency to be organized/dependable, show self-discipline, and aim for achievement.
    - Extraversion: Energy, sociability, and the tendency to seek stimulation in the company of others.
    - Agreeableness: Compassion and cooperation vs suspicion/antagonism.
    - Neuroticism: Tendency to experience unpleasant emotions like anxiety or vulnerability.

    ### LinkedIn Profile Data:
    ${JSON.stringify(profile, null, 1)}

    ### Recent Post Activity:
    ${JSON.stringify(posts, null, 1)}

    ### Task:
    1. Invent a creative title or archetype for this person (e.g., "The Visionary Architect", "The Pragmatic Problem Solver").
    2. Score each OCEAN trait from 1-100.
    3. Provide a description and evidence for each.
    4. Return valid JSON matching the schema.

    JSON Structure:
    {
      "title": "string",
      "openness": { "score": number, "description": "string", "evidence": ["string"] },
      "conscientiousness": { "score": number, "description": "string", "evidence": ["string"] },
      "extraversion": { "score": number, "description": "string", "evidence": ["string"] },
      "agreeableness": { "score": number, "description": "string", "evidence": ["string"] },
      "neuroticism": { "score": number, "description": "string", "evidence": ["string"] },
      "overallPersonaSummary": "string"
    }
  `;

  console.log(
    "Sending data to Gemini (gemini-3-flash-preview) for OCEAN analysis...",
  );

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from Gemini");
    }

    const analysis: OceanAnalysis = JSON.parse(responseText);

    // Save the analysis
    const outputPath = "./personality-analysis.json";
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));

    console.log("✅ Personality analysis complete!");
    console.log(`Results saved to ${outputPath}`);
    return analysis;
  } catch (error) {
    console.error("Error during personality analysis:", error);
    console.log((error as Error).message);
    throw error;
  }
}

// If running directly
if (
  process.argv[1]?.endsWith("llm.ts") ||
  process.argv[1]?.endsWith("llm.js")
) {
  analyzePersonality().catch(console.error);
}
