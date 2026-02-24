import * as dotenv from "dotenv";
dotenv.config();

import * as fs from "fs"; // fs = File System. It allows Node.js to read and write files on your computer.

// Import our custom modules (code we wrote in other files).
import { LinkedInScraper } from "./scraper/linkedinScraper.js";
import { ProfileCleaner } from "./services/cleanProfile.js";

// ✨ A "Callback" function type.
// A callback is a function you pass into ANOTHER function to be called later.
// We use this to send live "progress updates" back to the server.
export type ProgressCallback = (message: string) => void;

/**
 * --------------------------------------------------------------------------
 * CORE LOGIC: Scrape a LinkedIn Profile
 * --------------------------------------------------------------------------
 * This function orchestrates our scraper and cleaner.
 *
 * @param linkedinUrl - The full URL of the person's LinkedIn profile.
 * @param onProgress - (Optional) A function we call whenever we want to log a status update.
 */
export async function scrapeLinkedInProfile(
  linkedinUrl: string,
  onProgress?: ProgressCallback,
) {
  // 1. Create instances (objects) of our tools.
  // Think of `new LinkedInScraper()` like buying a new Swiss Army Knife, and `scraper` is holding it.
  const scraper = new LinkedInScraper();
  const cleaner = new ProfileCleaner();

  // 2. If the user didn't provide an `onProgress` function, fallback (||) to standard `console.log`.
  const log = onProgress || console.log;

  try {
    // 💡 Await: The code pauses here until the browser fully logs into LinkedIn.
    log("Logging into LinkedIn...");
    await scraper.login();

    log("Scraping profile...");
    const rawProfile = await scraper.scrapeProfile(linkedinUrl);

    // 🧹 Clean the data (ensure no missing/broken fields crash our app later).
    const profile = cleaner.clean(rawProfile);

    log("Scraping recent posts...");
    const posts = await scraper.scrapeRecentPosts(linkedinUrl);

    log("Scraping complete!");
    // Return an object containing both the clean profile and their posts.
    return { profile, posts };
  } finally {
    // 💡 Beginner Concept: Try...Catch...Finally
    // `finally` runs NO MATTER WHAT. Whether the scraping failed with an error, or succeeded perfectly,
    // we MUST close the browser. If we forget this, headless Chrome browsers will pile up and crash your computer!
    await scraper.close();
    log("Browser closed.");
  }
}

/**
 * --------------------------------------------------------------------------
 * CLI TESTING ENGINES (Command Line Interface)
 * --------------------------------------------------------------------------
 * If you run this exact file via `npm run dev` or `node index.js`, this function fires.
 * If another file (like server.ts) IMPORTS index.ts, this function does NOT fire.
 */
async function main() {
  const url = "https://www.linkedin.com/in/yshail/";

  const { profile, posts } = await scrapeLinkedInProfile(url);

  // fs.writeFileSync saves text to your hard drive.
  // JSON.stringify turns our Javascript Objects back into readable text format. "null, 2" makes it pretty indented.
  fs.writeFileSync("scraped-profile.json", JSON.stringify(profile, null, 2));
  console.log("✅ Profile saved to scraped-profile.json");

  fs.writeFileSync("scraped-posts.json", JSON.stringify(posts, null, 2));
  console.log("✅ Posts data saved to scraped-posts.json");

  // Perform Personality Analysis using Gemini AI
  try {
    // 💡 Dynamic Import
    // We import this here instead of at the top of the file because we only need it IF we reach this step!
    const { analyzePersonality } = await import("../gemini-logic/llm.js");
    await analyzePersonality();
  } catch (llmError) {
    // If the user forgot to add a GEMINI_API_KEY in their .env file, this will catch the error smoothly.
    console.error(
      "Skipping personality analysis due to error (check API key):",
      llmError,
    );
  }
}

// --------------------------------------------------------------------------
// MAGIC AUTO-RUN DETECTOR
// --------------------------------------------------------------------------
// ❓ Why did we write this messy `process.argv` logic?
// If we just wrote `main()`, it would run EVERY time a file imported `index.ts`.
// By checking if this file is the EXACT file being executed by Node (argv[1]),
// we ensure `main()` only runs when we explicitly type `ts-node index.ts` in our terminal.
if (
  process.argv[1]?.endsWith("index.ts") ||
  process.argv[1]?.endsWith("index.js")
) {
  // If `main()` throws an unhandled error, catch it and print it.
  main().catch((err) => {
    console.error("🔴 Fatal Error in main execution:", err);
  });
}
