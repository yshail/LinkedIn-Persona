import { type Browser, type BrowserContext, type Page } from "playwright";

// 💡 Why "playwright-extra" instead of normal "playwright"?
// Websites like LinkedIn actively block robots. "playwright-extra" allows us to add plugins.
import { chromium as pwExtra } from "playwright-extra";

// 💡 The Stealth Plugin
// This plugin masks the browser so LinkedIn thinks it's a real human, not an automated script.
import stealthPlugin from "puppeteer-extra-plugin-stealth";
pwExtra.use(stealthPlugin());

import { scrapeProfileData } from "./components/profile.js";
import { scrapeRecentPosts as scrapeRecentPostsData } from "./components/posts.js";
import type { LinkedInPost } from "../interfaces/post.interface.js";
import * as fs from "fs";

// We save our login session here so we don't have to log in every time (which can trigger security alerts).
const AUTH_FILE = "auth.json";

/**
 * --------------------------------------------------------------------------
 * LINKEDIN SCRAPER ENGINE
 * --------------------------------------------------------------------------
 * ❓ Why a Class?
 * A Class lets us keep the Browser, Context, and Page "alive" and share them
 * between different functions without constantly opening and closing Chrome.
 */
export class LinkedInScraper {
  private browser: Browser | null = null;

  // 💡 Beginner Concept: Browser Context
  // Think of a "Context" like a completely fresh, "Incognito" window. It holds our cookies and saved logins.
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  /**
   * ------------------------------------------------------------------------
   * LOGIN STRATEGY (The Waterfall Approach)
   * ------------------------------------------------------------------------
   * 1. Check if we have a hardcoded Session Cookie (`li_at`) in .env. If yes, try it.
   * 2. If it fails, check if we saved a session to `auth.json` previously. If yes, try it.
   * 3. If both fail, actually type the email/password into the browser (Fresh Login).
   */
  async ensureLoggedIn(): Promise<void> {
    // --- Strategy 1: The Magic Cookie ---
    if (process.env.LINKEDIN_SESSION_COOKIE) {
      console.log("Cookie found in .env! Attempting magic cookie login...");
      try {
        await this.launchWithCookie();
        if (await this.validateSession()) {
          console.log("✅ Cookie login successful!");
          return; // Stop here! We are logged in.
        }
        await this.close(); // Cookie failed, close the browser before trying the next logic.
      } catch (error) {
        console.log("⚠️ Cookie login failed:", (error as Error).message);
        await this.close();
      }
    }

    // --- Strategy 2: Saved 'auth.json' Session ---
    if (fs.existsSync(AUTH_FILE)) {
      console.log(
        "Found 'auth.json'. Attempting to restore previous session...",
      );
      try {
        await this.launchWithSavedAuth();
        if (await this.validateSession()) {
          console.log("✅ Restored session successfully!");
          return; // Stop here! We are logged in.
        }
        await this.close(); // Saved auth failed
      } catch (error) {
        console.log("⚠️ Failed to restore session:", (error as Error).message);
        await this.close();
      }
    }

    // --- Strategy 3: The Hard Way (Fresh Login) ---
    console.log(
      "No valid saved sessions. Proceeding with fresh manual login...",
    );
    await this.freshLogin();
  }

  // ------------------------- HELPER LOGIN FUNCTIONS -------------------------

  /** Helper: Starts Chrome and manually injects the LinkedIn `li_at` tracking cookie. */
  private async launchWithCookie(): Promise<void> {
    const launchOptions: any = { headless: true }; // 💡 Headless = true means the browser runs invisibly.

    this.browser = await pwExtra.launch(launchOptions);
    this.context = await this.browser.newContext();

    // Inject the cookie directly into the browser's memory
    await this.context.addCookies([
      {
        name: "li_at",
        value: process.env.LINKEDIN_SESSION_COOKIE!,
        domain: ".linkedin.com",
        path: "/",
      },
    ]);

    this.page = await this.context.newPage();
  }

  /** Helper: Starts Chrome and loads the `auth.json` file into the Context. */
  private async launchWithSavedAuth(): Promise<void> {
    const launchOptions: any = { headless: true };
    this.browser = await pwExtra.launch(launchOptions);

    // `storageState` tells Playwright to load our saved cookies!
    this.context = await this.browser.newContext({ storageState: AUTH_FILE });
    this.page = await this.context.newPage();
  }

  /** Helper: The actual Email & Password login script. */
  private async freshLogin(): Promise<void> {
    const phone = process.env.LINKEDIN_PHONE;
    const password = process.env.LINKEDIN_PASSWORD;

    if (!phone || !password) {
      throw new Error(
        "Missing LINKEDIN_PHONE or LINKEDIN_PASSWORD in .env file",
      );
    }

    this.browser = await pwExtra.launch({ headless: true });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();

    console.log("Navigating to LinkedIn sign-in page...");
    await this.page.goto("https://www.linkedin.com/login", {
      waitUntil: "domcontentloaded",
    });

    // 💡 Playwright Locators
    // `waitForSelector` ensures the input box actually exists on the screen before typing.
    console.log("Entering phone number and password...");
    await this.page.waitForSelector("input#username", { state: "visible" });
    await this.page.fill("input#username", phone);
    await this.page.fill("input#password", password);

    console.log("Clicking Sign in...");
    await this.page.click('button[type="submit"]');

    // Wait until the URL changes to the Feed (meaning we successfully bypassed the login page)
    console.log("Waiting for feed to load...");
    await this.page.waitForURL(
      (url) => url.pathname.includes("/feed") || url.pathname.includes("/in/"),
      { timeout: 120000 },
    );

    console.log("✅ Successfully signed into LinkedIn!");

    // ✨ Magic: Save all the cookies we just got into a file so we don't have to do this again tomorrow!
    await this.context.storageState({ path: AUTH_FILE });
    console.log("💾 Auth state saved to auth.json!");
  }

  /** Helper: Checks if the browser is currently logged in or stuck on a login screen. */
  private async validateSession(): Promise<boolean> {
    try {
      if (!this.page) return false;

      console.log("Testing session by visiting the LinkedIn feed...");
      // We go to the feed. If we aren't logged in, LinkedIn will forcefully redirect us to the login page.
      await this.page.goto("https://www.linkedin.com/feed/", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await this.page.waitForTimeout(3000); // Wait 3 seconds to see if it redirects us

      const currentUrl = this.page.url();

      // If the URL still says "feed" or "in" (profile), we survived!
      if (currentUrl.includes("/feed") || currentUrl.includes("/in/")) {
        return true;
      }

      return false; // We got redirected to a login wall.
    } catch {
      return false; // If the page crashes or times out, assume session is bad.
    }
  }

  // Legacy standard function
  async login(): Promise<void> {
    await this.ensureLoggedIn();
  }

  /**
   * ------------------------------------------------------------------------
   * SCRAPING FUNCTIONS
   * ------------------------------------------------------------------------
   */

  async scrapeProfile(url: string) {
    if (!this.page || !this.context) {
      // 💡 Beginner Mistake: Forgetting to log in before trying to scrape private data!
      await this.ensureLoggedIn();
    }

    try {
      console.log(`Navigating to profile: ${url}`);
      await this.page!.goto(url, { waitUntil: "domcontentloaded" });
      await this.page!.waitForTimeout(5000); // 💡 Hard pause to let complex React apps (like LinkedIn) render HTML.

      // We separated the messy CSS query selectors into another file (`components/profile.ts`) to keep this file clean.
      const profileData = await scrapeProfileData(this.page!);
      console.log("✅ Profile scraped successfully!");
      return profileData;
    } catch (error) {
      console.error("❌ Error during profile scraping:", error);
      throw error;
    }
  }

  async scrapeRecentPosts(url: string): Promise<LinkedInPost[]> {
    if (!this.page || !this.context) await this.ensureLoggedIn();

    try {
      const activityUrl = `${url}recent-activity/all/`;
      console.log(`Navigating to recent activity: ${activityUrl}`);
      await this.page!.goto(activityUrl, { waitUntil: "domcontentloaded" });
      await this.page!.waitForTimeout(5000);

      const postsData = await scrapeRecentPostsData(this.page!);
      console.log("✅ Recent posts scraped successfully!");
      return postsData;
    } catch (error) {
      console.error("❌ Error during recent posts scraping:", error);
      return []; // Return empty array on failure instead of crashing the whole app
    }
  }

  /**
   * Clean up tool. Always run this when finished!
   */
  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
      this.page = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    console.log("Browser safely closed.");
  }
}
