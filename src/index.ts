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
      "https://www.linkedin.com/in/kuldeepk-pandit/",
    );

    const cleanProfile = cleaner.clean(rawProfile);
    console.log("Profile data:", JSON.stringify(cleanProfile, null, 2));

    // Save to file
    fs.writeFileSync(
      "scraped-profile.json",
      JSON.stringify(cleanProfile, null, 2),
    );
    console.log(" Profile saved to scraped-profile.json");
  } finally {
    await scraper.close();
  }
}

main().catch((err) => {
  console.error(err);
});
