import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as dotenv from "dotenv";

// Load environment variables from the .env file (e.g., your Gemini API Key)
dotenv.config();

/**
 * OCEAN Model (Big Five) Profile Trait Structure
 * This describes a single personality trait score and its reasoning.
 */
export interface OceanTrait {
  score: number; // 1-100 score for the trait
  description: string; // Brief explanation representing the score
  evidence: string[]; // Bullet points of evidence derived from the user's data
}

/**
 * Full OCEAN Analysis Result Structure
 * This ensures the final JSON output from Gemini strictly follows this format.
 */
export interface OceanAnalysis {
  title: string;
  openness: OceanTrait;
  conscientiousness: OceanTrait;
  extraversion: OceanTrait;
  agreeableness: OceanTrait;
  neuroticism: OceanTrait;
  overallPersonaSummary: string; // A general summary of the person's character
}

/**
 * Analyzes a user's LinkedIn profile and posts to build an OCEAN personality profile using Gemini.
 *
 * @param profileData - Optional profile object (if missing, the function reads from a local file)
 * @param postsData - Optional array of posts (if missing, the function reads from a local file)
 * @returns An OceanAnalysis object containing the AI's deductions
 */
export async function analyzePersonality(
  profileData?: unknown,
  postsData?: unknown,
): Promise<OceanAnalysis> {
  // 1. Ensure the Gemini API key is available
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY in environment variables.");
  }

  // 2. Initialize the Gemini AI client
  const ai = new GoogleGenAI({ apiKey });

  // 3. Prepare the data (Use the provided arguments or read from the disk)
  let profile = profileData;
  let posts = postsData;

  // If data wasn't passed directly (e.g., when running via command line), load them from local files
  if (!profile || !posts) {
    const profilePath = "./scraped-profile.json";
    const postsPath = "./scraped-posts.json";

    // Validate that the files actually exist before trying to read them
    if (!fs.existsSync(profilePath) || !fs.existsSync(postsPath)) {
      throw new Error("Data files not found. Please run the scraper first.");
    }

    // Read and parse the local JSON files into JavaScript objects
    profile = JSON.parse(fs.readFileSync(profilePath, "utf-8"));
    posts = JSON.parse(fs.readFileSync(postsPath, "utf-8"));
  }

  // 4. Construct the prompt instructions for the AI
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

  console.log("Analyzing data with Gemini 3 Flash Preview...");

  try {
    // 5. Send the request to Gemini AI
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      // This config forces Gemini to return strictly formatted JSON data
      config: { responseMimeType: "application/json" },
    });

    // 6. Validate and parse the AI's response
    if (!response.text) {
      throw new Error("Received an empty response from Gemini API.");
    }

    const analysis: OceanAnalysis = JSON.parse(response.text);

    // 7. Save the final analysis to the disk for future reference or caching
    const outputPath = "./personality-analysis.json";
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));

    console.log(`✅ Success! Analysis saved to ${outputPath}`);

    // 8. Return the parsed analysis back to the code that called this function
    return analysis;
  } catch (error) {
    // Catch any errors (e.g., network issues, API limits, bad JSON format from AI) and log them clearly
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("❌ Gemini Analysis Failed:", errorMessage);
    throw error;
  }
}

// 9. Auto-run logic (This triggers if the file is executed directly via command line, e.g. `npm run analyze`)
if (
  process.argv[1]?.includes("llm.ts") ||
  process.argv[1]?.includes("llm.js")
) {
  analyzePersonality().catch(() => process.exit(1));
}
