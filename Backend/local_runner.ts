console.log("HELLO FROM RUNNER");

import { scrapeLinkedInProfile } from "./src/index.js";
import * as fs from "fs";

async function run() {
  console.log("🚀 Starting local scraper...");
  const url = "https://www.linkedin.com/in/yshail/";

  try {
    const { profile, posts } = await scrapeLinkedInProfile(url, (msg) =>
      console.log(`[Progress] ${msg}`),
    );

    console.log("✅ Scraping complete!");

    // Save to files
    try {
      fs.writeFileSync(
        "scraped-profile.json",
        JSON.stringify(profile, null, 2),
      );
      console.log("💾 Saved scraped-profile.json");

      fs.writeFileSync("scraped-posts.json", JSON.stringify(posts, null, 2));
      console.log("💾 Saved scraped-posts.json");
    } catch (saveError) {
      console.error("❌ Failed to save files:", saveError);
    }
  } catch (error) {
    console.error("❌ Fatal Error:", error);
    process.exit(1);
  }
}

run().catch((e) => {
  console.error("Unhandled Runner Error:", e);
  process.exit(1);
});
