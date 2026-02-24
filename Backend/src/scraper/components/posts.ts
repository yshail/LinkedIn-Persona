import type { Page, Locator } from "playwright";
import type { LinkedInPost } from "../../interfaces/post.interface.js";

/**
 * --------------------------------------------------------------------------
 * POST SCRAPING ENGINE
 * --------------------------------------------------------------------------
 * Scrapes recent activity posts from a LinkedIn profile's /recent-activity/all/ page.
 */
export async function scrapeRecentPosts(page: Page): Promise<LinkedInPost[]> {
  // ───────────────────────────────────────────────
  //  Helper Functions
  // ───────────────────────────────────────────────

  /**
   * Helper: Extract Text Safely
   * ❓ Why do we need this?
   * If a post doesn't have an author name, and we try to read `.textContent()`, our code will crash!
   * This function safely checks if the item exists first. If it doesn't, it returns `undefined` (nothing).
   */
  const safeText = async (
    locator: Locator,
    timeout = 2000,
  ): Promise<string | undefined> => {
    try {
      if ((await locator.count()) === 0) return undefined;
      const text = await locator.first().textContent({ timeout });
      return text?.trim() || undefined; // `.trim()` removes useless extra spaces
    } catch {
      return undefined;
    }
  };

  /**
   * Helper: Parse Numbers from Text
   * 💡 Beginner Concept: Regular Expressions (RegEx)
   * If a post says "1,234 Likes", we only want the number `1234`.
   * `/.replace(/,/g, "")/` removes all commas.
   * `.match(/(\d+)/)` grabs only the digits (\d+).
   */
  const parseNumber = (text: string | undefined): number | undefined => {
    if (!text) return undefined;
    const match = text.replace(/,/g, "").match(/(\d+)/);
    return match?.[1] ? parseInt(match[1], 10) : undefined;
  };

  /**
   * Helper: Convert LinkedIn Relative Timestamps
   * LinkedIn doesn't say "Jan 5th". It says "4h" or "1w".
   * We convert these into strictly "Days Ago" for our database.
   */
  const toDays = (raw: string | undefined): number | undefined => {
    if (!raw) return undefined;
    // Remove weird LinkedIn dots like " •"
    const cleaned = raw.replace(/\s*[•·]\s*$/, "").trim();

    // RegEx match the number and the letter (e.g. 5 and d)
    const match = cleaned.match(/^(\d+)\s*(h|d|w|mo|yr)$/i);
    if (!match?.[1] || !match[2]) return undefined;

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case "h":
        return 0; // Hours = same day
      case "d":
        return value;
      case "w":
        return value * 7;
      case "mo":
        return value * 30;
      case "yr":
        return value * 365;
      default:
        return undefined;
    }
  };

  // ───────────────────────────────────────────────
  //  The "Infinite Scroll" Hack (Lazy Loading)
  // ───────────────────────────────────────────────
  // ❓ What is Lazy Loading?
  // LinkedIn doesn't load all 100 posts at once. It only loads the first 3 to save internet speed.
  // To scrape more posts, we have to inject Javascript into the browser to physically scroll down!
  const scrollCount = 3;
  for (let i = 0; i < scrollCount; i++) {
    // `evaluate` runs code INSIDE the browser, just like the browser console!
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
    await page.waitForTimeout(2000); // Wait 2 seconds for new posts to load
  }

  // ───────────────────────────────────────────────
  //  Locating and Reading Data
  // ───────────────────────────────────────────────

  // 💡 What is a Locator?
  // A locator is like a homing missile. We give it a CSS Class (like "div.feed-shared-update-v2")
  // and it finds ALL elements on the page that match that description.
  const postContainers = page.locator("div.feed-shared-update-v2");
  const postCount = await postContainers.count();
  console.log(`📡 Found ${postCount} activity posts to scrape!`);

  const posts: LinkedInPost[] = [];

  // Loop through every post we found
  for (let i = 0; i < postCount; i++) {
    try {
      const post = postContainers.nth(i); // Grabs the specific post (1st, 2nd, 3rd...)

      // Find the Author's Name
      const authorName = await safeText(
        post.locator(
          '.update-components-actor__title span[aria-hidden="true"]',
        ),
      );

      // Find the Time it was posted
      const rawTime = await safeText(
        post.locator(
          '.update-components-actor__sub-description span[aria-hidden="true"]',
        ),
      );
      const postedDaysAgo = toDays(rawTime);

      // Find the Post Text Content
      // LinkedIn constantly changes their class names. So we try 3 different ones! (The ?? means "If undefined, try the next one")
      const content =
        (await safeText(post.locator(".feed-shared-inline-show-more-text"))) ??
        (await safeText(post.locator(".update-components-text"))) ??
        (await safeText(post.locator("span.break-words"))) ??
        undefined;

      // --- Engagement Stats (Likes and Comments) ---
      const socialCounts = post.locator(".social-details-social-counts");

      // Extract Likes
      const reactionsText = await safeText(
        socialCounts
          .locator(
            "button span, span.social-details-social-counts__reactions-count",
          )
          .first(),
      );
      const reactions = parseNumber(reactionsText);

      // Extract Comments (Find the button that literally has the text "comment" inside it)
      const commentsLink = socialCounts.locator('button:has-text("comment")');
      const commentsText = await safeText(commentsLink);
      const comments = parseNumber(commentsText);

      // Extract Reposts
      const repostsLink = socialCounts.locator('button:has-text("repost")');
      const repostsText = await safeText(repostsLink);
      const reposts = parseNumber(repostsText);

      // Save this entire post into our master list
      posts.push({
        authorName,
        postedDaysAgo,
        content,
        reactions,
        comments,
        reposts,
      });
    } catch (err) {
      console.warn(
        `  ⚠ Skipping post ${i} because its format was unexpected:`,
        err,
      );
    }
  }

  return posts;
}
