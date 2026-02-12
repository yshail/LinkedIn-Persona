import { LinkedInScraper } from "./scraper/linkedinScraper.js";
import { ProfileCleaner } from "./services/cleanProfile.js";

async function main() {
  const scraper = new LinkedInScraper();
  const cleaner = new ProfileCleaner();

  console.log("Starting LinkedIn Persona Scraper...");

  // Example usage
  // const rawProfile = await scraper.scrapeProfile("https://www.linkedin.com/in/some-profile");
  // const cleanProfile = cleaner.clean(rawProfile);
  // console.log(cleanProfile);
}

main().catch(console.error);
