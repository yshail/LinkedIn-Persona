import * as dotenv from "dotenv";
dotenv.config();
import * as fs from "fs";
import { LinkedInScraper } from "./scraper/linkedinScraper.ts";
import { ProfileCleaner } from "./services/cleanProfile.ts";

async function main() {
  const scraper = new LinkedInScraper();
  const cleaner = new ProfileCleaner();

  console.log("Starting LinkedIn Persona Scraper...");

  try {
    // Login to LinkedIn
    await scraper.login();

    // Scrape a profile
    const rawProfile = await scraper.scrapeProfile(
      "https://www.linkedin.com/in/yshail/",
    );

    const cleanProfile = cleaner.clean(rawProfile);
    console.log("Profile data:", JSON.stringify(cleanProfile, null, 2));

    // Save profile to file
    fs.writeFileSync(
      "scraped-profile.json",
      JSON.stringify(cleanProfile, null, 2),
    );
    console.log("✅ Profile saved to scraped-profile.json");

    // Scrape recent activity posts
    const postsData = await scraper.scrapeRecentPosts(
      "https://www.linkedin.com/in/yshail/",
    );
    console.log("Posts data:", JSON.stringify(postsData, null, 2));

    // Save posts data to file
    fs.writeFileSync("scraped-posts.json", JSON.stringify(postsData, null, 2));
    console.log("✅ Posts data saved to scraped-posts.json");
  } catch (error) {
    console.error("Scraping failed:", error);
    throw error;
  } finally {
    await scraper.close();
    console.log("Browser closed.");
  }

  // Perform Personality Analysis
  try {
    const { analyzePersonality } = await import("../gemini-logic/llm.ts");
    await analyzePersonality();
  } catch (llmError) {
    console.error(
      "Skipping personality analysis due to error (check API key):",
      llmError,
    );
  }
}

main().catch((err) => {
  console.error(err);
});
