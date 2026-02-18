import * as dotenv from "dotenv";
dotenv.config();
import * as fs from "fs";
import { LinkedInScraper } from "./scraper/linkedinScraper.js";
import { ProfileCleaner } from "./services/cleanProfile.js";

export type ProgressCallback = (message: string) => void;

/**
 * Scrape a LinkedIn profile and return cleaned profile + posts data.
 * Accepts an optional progress callback for real-time updates.
 */
export async function scrapeLinkedInProfile(
  linkedinUrl: string,
  onProgress?: ProgressCallback,
) {
  const scraper = new LinkedInScraper();
  const cleaner = new ProfileCleaner();
  const log = onProgress || console.log;

  try {
    log("Logging into LinkedIn...");
    await scraper.login();

    log("Scraping profile...");
    const rawProfile = await scraper.scrapeProfile(linkedinUrl);
    const profile = cleaner.clean(rawProfile);

    log("Scraping recent posts...");
    const posts = await scraper.scrapeRecentPosts(linkedinUrl);

    log("Scraping complete!");
    return { profile, posts };
  } finally {
    await scraper.close();
    log("Browser closed.");
  }
}

/**
 * CLI entry point — runs only when this file is executed directly.
 */
async function main() {
  const url = "https://www.linkedin.com/in/yshail/";

  const { profile, posts } = await scrapeLinkedInProfile(url);

  // Save to files
  fs.writeFileSync("scraped-profile.json", JSON.stringify(profile, null, 2));
  console.log("✅ Profile saved to scraped-profile.json");

  fs.writeFileSync("scraped-posts.json", JSON.stringify(posts, null, 2));
  console.log("✅ Posts data saved to scraped-posts.json");

  // Perform Personality Analysis
  try {
    const { analyzePersonality } = await import("../gemini-logic/llm.js");
    await analyzePersonality();
  } catch (llmError) {
    console.error(
      "Skipping personality analysis due to error (check API key):",
      llmError,
    );
  }
}

// Only run main() when this file is executed directly
if (
  process.argv[1]?.endsWith("index.ts") ||
  process.argv[1]?.endsWith("index.js")
) {
  main().catch((err) => {
    console.error(err);
  });
}
