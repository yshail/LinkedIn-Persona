import type { Page, Locator } from "playwright";
import type { LinkedInPost } from "../../interfaces/post.interface.js";

/**
 * Scrapes recent activity posts from a LinkedIn profile's
 * /recent-activity/all/ page using Playwright locators.
 *
 * @param page - Playwright Page instance (already on the activity page)
 * @returns Array of post objects
 */
export async function scrapeRecentPosts(page: Page): Promise<LinkedInPost[]> {
  // ───────────────────────────────────────────────
  //  Helpers
  // ───────────────────────────────────────────────

  /** Safely extract trimmed text from a locator. */
  const safeText = async (
    locator: Locator,
    timeout = 2000,
  ): Promise<string | undefined> => {
    try {
      const count = await locator.count();
      if (count === 0) return undefined;
      const text = (await locator.first().textContent({ timeout }))?.trim();
      return text || undefined;
    } catch {
      return undefined;
    }
  };

  /** Parse a number from text like "94", "1,234", "16 comments" etc. */
  const parseNumber = (text: string | undefined): number | undefined => {
    if (!text) return undefined;
    const match = text.replace(/,/g, "").match(/(\d+)/);
    return match?.[1] ? parseInt(match[1], 10) : undefined;
  };

  /**
   * Convert LinkedIn relative timestamp to number of days.
   * Examples: "4h" → 0, "1d" → 1, "5d" → 5, "1w" → 7, "2w" → 14,
   *           "1mo" → 30, "3mo" → 90, "1yr" → 365
   */
  const toDays = (raw: string | undefined): number | undefined => {
    if (!raw) return undefined;
    // Strip trailing " •" or " ·" and whitespace
    const cleaned = raw.replace(/\s*[•·]\s*$/, "").trim();
    const match = cleaned.match(/^(\d+)\s*(h|d|w|mo|yr)$/i);
    if (!match?.[1] || !match[2]) return undefined;
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    switch (unit) {
      case "h":
        return 0; // hours → same day
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
  //  Scroll to load more posts
  // ───────────────────────────────────────────────

  // Scroll down a few times to load more posts (lazy-loaded feed)
  const scrollCount = 3;
  for (let i = 0; i < scrollCount; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
    await page.waitForTimeout(2000);
  }

  // ───────────────────────────────────────────────
  //  Locate all post containers
  // ───────────────────────────────────────────────

  const postContainers = page.locator("div.feed-shared-update-v2");
  const postCount = await postContainers.count();
  console.log(`Found ${postCount} activity posts`);

  const posts: LinkedInPost[] = [];

  for (let i = 0; i < postCount; i++) {
    try {
      const post = postContainers.nth(i);

      // --- Author Name ---
      const authorName = await safeText(
        post.locator(
          '.update-components-actor__title span[aria-hidden="true"]',
        ),
      );

      // --- Timestamp (converted to days) ---
      const rawTime = await safeText(
        post.locator(
          '.update-components-actor__sub-description span[aria-hidden="true"]',
        ),
      );
      const postedDaysAgo = toDays(rawTime);

      // --- Post Content ---
      const content =
        (await safeText(post.locator(".feed-shared-inline-show-more-text"))) ??
        (await safeText(post.locator(".update-components-text"))) ??
        (await safeText(post.locator("span.break-words"))) ??
        undefined;

      // --- Engagement Stats ---
      const socialCounts = post.locator(".social-details-social-counts");

      // Reactions — typically the first button/span inside social-counts
      const reactionsText = await safeText(
        socialCounts
          .locator(
            "button span, span.social-details-social-counts__reactions-count",
          )
          .first(),
      );
      const reactions = parseNumber(reactionsText);

      // Comments — look for text containing "comment"
      const commentsLink = socialCounts.locator('button:has-text("comment")');
      const commentsText = await safeText(commentsLink);
      const comments = parseNumber(commentsText);

      // Reposts — look for text containing "repost"
      const repostsLink = socialCounts.locator('button:has-text("repost")');
      const repostsText = await safeText(repostsLink);
      const reposts = parseNumber(repostsText);

      posts.push({
        authorName,
        postedDaysAgo,
        content,
        reactions,
        comments,
        reposts,
      });
    } catch (err) {
      console.warn(`  ⚠ Skipping post ${i}:`, err);
    }
  }

  return posts;
}
