import { chromium, type Browser, type Page } from "playwright";

export class LinkedInScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  //----> Login with Phone Number and Password  ---------------------

  async login(): Promise<void> {
    const phone = process.env.LINKEDIN_PHONE;
    const password = process.env.LINKEDIN_PASSWORD;

    if (!phone || !password) {
      throw new Error(
        "Missing LINKEDIN_PHONE or LINKEDIN_PASSWORD in .env file",
      );
    }

    console.log("Launching browser...");
    this.browser = await chromium.launch({ headless: false });
    this.page = await this.browser.newPage();

    // Navigate to LinkedIn sign-in page
    console.log("Navigating to LinkedIn sign-in page...");
    await this.page.goto("https://www.linkedin.com/login", {
      waitUntil: "domcontentloaded",
    });

    // Fill in the phone number / email field
    console.log("Entering phone number...");
    await this.page.waitForSelector("input#username", { state: "visible" });
    await this.page.fill("input#username", phone);

    // Fill in the password field
    console.log("Entering password...");
    await this.page.waitForSelector("input#password", { state: "visible" });
    await this.page.fill("input#password", password);

    // Click the Sign in button
    console.log("Clicking Sign in...");
    await this.page.click('button[type="submit"]');

    console.log("Waiting for feed to load...");
    await this.page.waitForURL(
      (url) => url.pathname.includes("/feed") || url.pathname.includes("/in/"),
      { timeout: 120000 },
    );

    console.log("Successfully signed into LinkedIn!");

    // Save auth state for future sessions
    await this.page.context().storageState({ path: "auth.json" });
    console.log("Auth state saved !");
  }

  //----> Scrape Profile  ---------------------

  async scrapeProfile(url: string) {
    if (!this.page || !this.browser) {
      await this.login();
    }

    try {
      console.log(`Navigating to profile: ${url}`);
      await this.page!.goto(url, { waitUntil: "domcontentloaded" });

      // Give the page some time to render dynamic content
      await this.page!.waitForTimeout(5000);

      // Take a screenshot for debugging
      await this.page!.screenshot({
        path: "debug-profile.png",
        fullPage: false,
      });
      console.log("📸 Debug screenshot saved to debug-profile.png");

      // Log the current URL to see if we were redirected
      console.log(`Current URL: ${this.page!.url()}`);

      // Scrape basic profile data
      // Note: Using a string expression because tsx injects __name helpers
      // into arrow functions, which don't exist in the browser context
      const profileData = await this.page!.evaluate(`
        (() => {
          const getText = (selector) => {
            const el = document.querySelector(selector);
            return el?.textContent?.trim() ?? "";
          };
          return {
            name: getText("h1"),
            headline: getText(".text-body-medium.break-words"),
            location: getText(".text-body-small.inline.t-black--light.break-words"),
            about: getText("#about ~ div .inline-show-more-text"),
            connections: getText(".t-bold"),
          };
        })()
      `);

      console.log("✅ Profile scraped successfully!");
      return profileData;
    } catch (error) {
      console.error("❌ Error during profile scraping:");
    }
  }

  //----> Close Browser  ---------------------

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      console.log("Browser closed.");
    }
  }
}
