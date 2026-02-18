import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright";
import { scrapeProfileData } from "./components/profile.js";
import { scrapeRecentPosts as scrapeRecentPostsData } from "./components/posts.js";
import type { LinkedInPost } from "../interfaces/post.interface.js";
import * as fs from "fs";

const AUTH_FILE = "auth.json";

export class LinkedInScraper {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  //----> Ensure browser is ready (try saved auth first, then fresh login) ------

  async ensureLoggedIn(): Promise<void> {
    // 1. Try Cookie Auth first (Best for Cloud/Headless)
    if (process.env.LINKEDIN_SESSION_COOKIE) {
      console.log(
        "Found LINKEDIN_SESSION_COOKIE in environment. Using cookie auth...",
      );
      try {
        await this.launchWithCookie();
        const isValid = await this.validateSession();
        if (isValid) {
          console.log("✅ Session validated with Cookie!");
          return;
        }
        console.log("⚠️ Cookie session invalid or expired.");
        await this.close();
      } catch (error) {
        console.log(
          "⚠️ Failed to login with cookie:",
          (error as Error).message,
        );
        await this.close();
      }
    }

    // 2. Try to restore session from saved auth file
    if (fs.existsSync(AUTH_FILE)) {
      console.log("Found saved auth state. Trying to restore session...");
      try {
        await this.launchWithSavedAuth();
        const isValid = await this.validateSession();

        if (isValid) {
          console.log("✅ Session restored successfully from saved auth!");
          return;
        }

        console.log(
          "⚠️ Saved session is expired or invalid. Falling back to fresh login...",
        );
        await this.close();
      } catch (error) {
        console.log("⚠️ Failed to restore session:", (error as Error).message);
        await this.close();
      }
    } else {
      console.log("No saved auth state found. Proceeding with fresh login...");
    }

    // 3. Fallback: fresh login
    await this.freshLogin();
  }

  //----> Launch browser with Session Cookie (li_at) ------
  private async launchWithCookie(): Promise<void> {
    console.log("Launching browser with session cookie...");
    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext();

    // Add the li_at cookie
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

  //----> Launch browser with saved auth state (persistent context) ------

  private async launchWithSavedAuth(): Promise<void> {
    console.log("Launching browser with saved auth state...");

    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext({
      storageState: AUTH_FILE,
    });

    this.page = await this.context.newPage();
  }

  //----> Validate that the restored session is still active ------

  private async validateSession(): Promise<boolean> {
    try {
      console.log("Validating session by navigating to LinkedIn feed...");
      await this.page!.goto("https://www.linkedin.com/feed/", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      // Wait a moment for any redirects
      await this.page!.waitForTimeout(3000);

      const currentUrl = this.page!.url();
      console.log(`Current URL after navigation: ${currentUrl}`);

      // If we're still on the feed or a profile page, session is valid
      if (
        currentUrl.includes("/feed") ||
        currentUrl.includes("/in/") ||
        currentUrl.includes("/mynetwork")
      ) {
        return true;
      }

      // If redirected to login page, session is invalid
      if (
        currentUrl.includes("/login") ||
        currentUrl.includes("/authwall") ||
        currentUrl.includes("/uas/login") ||
        currentUrl.includes("/checkpoint")
      ) {
        return false;
      }

      return false;
    } catch {
      return false;
    }
  }

  //----> Fresh login with credentials ------

  private async freshLogin(): Promise<void> {
    const phone = process.env.LINKEDIN_PHONE;
    const password = process.env.LINKEDIN_PASSWORD;

    if (!phone || !password) {
      throw new Error(
        "Missing LINKEDIN_PHONE or LINKEDIN_PASSWORD in .env file",
      );
    }

    console.log("Launching browser for fresh login...");
    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();

    // Navigate to LinkedIn sign-in page
    console.log("Navigating to LinkedIn sign-in page...");
    await this.page!.goto("https://www.linkedin.com/login", {
      waitUntil: "domcontentloaded",
    });

    // Fill in the phone number
    console.log("Entering phone number...");
    await this.page!.waitForSelector("input#username", { state: "visible" });
    await this.page!.fill("input#username", phone);

    // Fill in the password
    console.log("Entering password...");
    await this.page!.waitForSelector("input#password", { state: "visible" });
    await this.page!.fill("input#password", password);

    // Click the Sign in button
    console.log("Clicking Sign in...");
    await this.page!.click('button[type="submit"]');

    console.log("Waiting for feed to load...");
    await this.page!.waitForURL(
      (url) => url.pathname.includes("/feed") || url.pathname.includes("/in/"),
      { timeout: 120000 },
    );

    console.log("✅ Successfully signed into LinkedIn!");

    // Save auth state for future sessions
    await this.context!.storageState({ path: AUTH_FILE });
    console.log("💾 Auth state saved for next session!");
  }

  //----> Legacy login method (calls ensureLoggedIn) ------

  async login(): Promise<void> {
    await this.ensureLoggedIn();
  }

  //----> Scrape Profile ---------------------

  async scrapeProfile(url: string) {
    if (!this.page || !this.context) {
      await this.ensureLoggedIn();
    }

    try {
      console.log(`Navigating to profile: ${url}`);
      await this.page!.goto(url, { waitUntil: "domcontentloaded" });

      // Waiting for profile to load
      await this.page!.waitForTimeout(5000);

      // Scrape basic profile data using Playwright locators

      const profileData = await scrapeProfileData(this.page!);

      console.log("Profile scraped successfully!");
      return profileData;
    } catch (error) {
      console.error("Error during profile scraping:", error);
      throw error;
    }
  }

  //----> Scrape Recent Activity Posts ---------------------

  async scrapeRecentPosts(url: string): Promise<LinkedInPost[]> {
    if (!this.page || !this.context) {
      await this.ensureLoggedIn();
    }

    try {
      const activityUrl = `${url}recent-activity/all/`;
      console.log(`Navigating to recent activity: ${activityUrl}`);
      await this.page!.goto(activityUrl, { waitUntil: "domcontentloaded" });

      // Waiting for activity feed to load
      await this.page!.waitForTimeout(5000);

      // Scrape recent posts using Playwright locators
      const postsData = await scrapeRecentPostsData(this.page!);

      console.log("Recent posts scraped successfully!");
      return postsData;
    } catch (error) {
      console.error("Error during recent posts scraping:", error);
      return [];
    }
  }

  //----> Close Browser ---------------------

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
    console.log("Browser closed.");
  }
}
