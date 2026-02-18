import type { Page, Locator } from "playwright";
import type {
  LinkedInProfile,
  Experience,
  Education,
  Certification,
  Project,
  Language,
  Honor,
  Recommendation,
} from "../../interfaces/profile.interface.js";

/**
 * Scrapes comprehensive profile data from a LinkedIn profile page
 * using Playwright locators.
 *
 * Expects the page to already be navigated to a LinkedIn profile URL.
 *
 * @param page - Playwright Page instance
 * @returns Full profile data object
 */
export async function scrapeProfileData(page: Page): Promise<LinkedInProfile> {
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

  /** Safely extract an attribute from a locator. */
  const safeAttr = async (
    locator: Locator,
    attr: string,
  ): Promise<string | undefined> => {
    try {
      const count = await locator.count();
      if (count === 0) return undefined;
      const v = await locator.first().getAttribute(attr, { timeout: 2000 });
      return v?.trim() || undefined;
    } catch {
      return undefined;
    }
  };

  /**
   * Get the parent <section> for a profile anchor element.
   * LinkedIn uses `<div id="experience" class="pv-profile-card__anchor">`
   * inside a `<section>`.
   */
  const getSection = (anchorId: string): Locator => {
    return page
      .locator(`#${anchorId}.pv-profile-card__anchor`)
      .locator("xpath=ancestor::section[1]");
  };

  /**
   * Get all list items from a profile section.
   * Each item uses `data-view-name="profile-component-entity"`.
   */
  const getSectionItems = (anchorId: string): Locator => {
    const section = getSection(anchorId);
    return section.locator(
      'li.artdeco-list__item [data-view-name="profile-component-entity"]',
    );
  };

  /**
   * Extract text lines from the standard profile entity layout.
   * LinkedIn entities follow this pattern:
   *   Line 1 (.t-bold span[aria-hidden])           → title / name
   *   Line 2 (.t-normal:not(.t-black--light) span) → subtitle
   *   Line 3 (.t-normal.t-black--light span)       → duration/date
   *   Line 4 (second .t-black--light)              → location / extra
   */
  const extractEntityTexts = async (
    entity: Locator,
  ): Promise<{
    line1?: string | undefined;
    line2?: string | undefined;
    line3?: string | undefined;
    line4?: string | undefined;
  }> => {
    const contentCol = entity.locator(
      ".display-flex.flex-column.align-self-center.flex-grow-1",
    );

    // Line 1: bold title
    const line1 = await safeText(
      contentCol.locator('.t-bold span[aria-hidden="true"]').first(),
    );

    // Subsequent lines: all .t-normal spans
    const normalSpans = contentCol.locator(
      '.t-normal span[aria-hidden="true"]',
    );
    const spanCount = await normalSpans.count();

    let line2: string | undefined;
    let line3: string | undefined;
    let line4: string | undefined;

    if (spanCount >= 1)
      line2 = (await normalSpans.nth(0).textContent())?.trim() || undefined;
    if (spanCount >= 2)
      line3 = (await normalSpans.nth(1).textContent())?.trim() || undefined;
    if (spanCount >= 3)
      line4 = (await normalSpans.nth(2).textContent())?.trim() || undefined;

    return { line1, line2, line3, line4 };
  };

  // ───────────────────────────────────────────────
  //  Top Card (basic info)
  // ───────────────────────────────────────────────

  const topCard = page.locator("main section").first();

  const name = (await safeText(topCard.locator("h1"))) ?? "LinkedIn User";

  const headline =
    (await safeText(topCard.locator(".text-body-medium.break-words"))) ?? "";

  const location =
    (await safeText(
      topCard.locator(".text-body-small.inline.t-black--light.break-words"),
    )) ?? "";

  const profilePictureUrl = await safeAttr(
    topCard.locator('img[class*="pv-top-card-profile-picture__image"]'),
    "src",
  );

  const backgroundImageUrl = await safeAttr(
    topCard.locator("img.profile-background-image__image"),
    "src",
  );

  // --- Followers & Connections ---
  // These are typically in the top-card area or nearby.
  // Format example: "175,342 followers" · "500+ connections"
  const followerConnectionText =
    (await safeText(
      topCard.locator(".pv-top-card--list-bullet li span.t-bold"),
    )) ?? undefined;

  // Try a more targeted approach: look for the specific text patterns
  let followers: string | undefined;
  let connections: string | undefined;

  const bulletItems = topCard.locator("ul.pv-top-card--list-bullet li");
  const bulletCount = await bulletItems.count();
  for (let i = 0; i < bulletCount; i++) {
    const txt = (await bulletItems.nth(i).textContent())?.trim() ?? "";
    const lower = txt.toLowerCase();
    if (lower.includes("follower")) {
      followers = txt.replace(/followers?/i, "").trim();
    } else if (lower.includes("connection")) {
      connections = txt.replace(/connections?/i, "").trim();
    }
  }

  // Fallback: try the top-card spans with bold text
  if (!followers && !connections) {
    const topBoldSpans = page.locator(".pv-top-card--list .t-bold");
    const bCount = await topBoldSpans.count();
    for (let i = 0; i < bCount; i++) {
      const txt = (await topBoldSpans.nth(i).textContent())?.trim() ?? "";
      if (txt.includes("follower")) {
        followers = txt.replace(/followers?/i, "").trim();
      } else if (txt.includes("connection")) {
        connections = txt.replace(/connections?/i, "").trim();
      }
    }
  }

  // ───────────────────────────────────────────────
  //  About Section
  // ───────────────────────────────────────────────

  const aboutSection = getSection("about");
  const about = await safeText(
    aboutSection.locator('.inline-show-more-text span[aria-hidden="true"]'),
  );

  // ───────────────────────────────────────────────
  //  Experience Section
  // ───────────────────────────────────────────────

  const experience: Experience[] = [];
  const expItems = getSectionItems("experience");
  const expCount = await expItems.count();
  console.log(`  → Experience items found: ${expCount}`);

  for (let i = 0; i < expCount; i++) {
    try {
      const item = expItems.nth(i);
      const { line1, line2, line3, line4 } = await extractEntityTexts(item);

      // Company logo
      const companyLogoUrl = await safeAttr(item.locator("img").first(), "src");

      // Company link
      const companyUrl = await safeAttr(
        item.locator('a[data-field="experience_company_logo"]'),
        "href",
      );

      // Description (if there's an inline-show-more-text in this item)
      const description = await safeText(
        item.locator('.inline-show-more-text span[aria-hidden="true"]'),
      );

      // Determine if line2 contains employment type info
      let title = line1;
      let company = line2;
      let employmentType: string | undefined;
      let duration = line3;
      let loc = line4;

      // Try to split "Company · Full-time" patterns
      if (company?.includes(" · ")) {
        const parts = company.split(" · ");
        company = parts[0]?.trim();
        employmentType = parts[1]?.trim();
      }
      // Also check title for "Title · Employment type"
      if (title?.includes(" · ")) {
        const parts = title.split(" · ");
        title = parts[0]?.trim();
        if (!employmentType) employmentType = parts[1]?.trim();
      }

      experience.push({
        title,
        company,
        companyUrl: companyUrl
          ? companyUrl.startsWith("/")
            ? `https://www.linkedin.com${companyUrl}`
            : companyUrl
          : undefined,
        companyLogoUrl,
        employmentType,
        duration,
        location: loc,
        description,
      });
    } catch (err) {
      console.warn(`  ⚠ Skipping experience item ${i}:`, err);
    }
  }

  // ───────────────────────────────────────────────
  //  Education Section
  // ───────────────────────────────────────────────

  const education: Education[] = [];
  const eduItems = getSectionItems("education");
  const eduCount = await eduItems.count();
  console.log(`  → Education items found: ${eduCount}`);

  for (let i = 0; i < eduCount; i++) {
    try {
      const item = eduItems.nth(i);
      const { line1, line2, line3, line4 } = await extractEntityTexts(item);

      const schoolLogoUrl = await safeAttr(item.locator("img").first(), "src");

      const schoolUrlRaw = await safeAttr(
        item.locator("a.optional-action-target-wrapper").first(),
        "href",
      );
      const schoolUrl = schoolUrlRaw
        ? schoolUrlRaw.startsWith("/")
          ? `https://www.linkedin.com${schoolUrlRaw}`
          : schoolUrlRaw
        : undefined;

      const description = await safeText(
        item.locator('.inline-show-more-text span[aria-hidden="true"]'),
      );

      // line2 could be "Degree, Field of Study" or just "Degree"
      let degree: string | undefined;
      let fieldOfStudy: string | undefined;
      if (line2?.includes(",")) {
        const parts = line2.split(",");
        degree = parts[0]?.trim();
        fieldOfStudy = parts.slice(1).join(",").trim();
      } else {
        degree = line2;
      }

      education.push({
        school: line1,
        schoolUrl,
        schoolLogoUrl,
        degree,
        fieldOfStudy,
        duration: line3,
        description,
      });
    } catch (err) {
      console.warn(`  ⚠ Skipping education item ${i}:`, err);
    }
  }

  // ───────────────────────────────────────────────
  //  Skills Section
  // ───────────────────────────────────────────────

  const skills: string[] = [];
  const skillSection = getSection("skills");
  const skillItems = skillSection.locator(
    'li.artdeco-list__item [data-view-name="profile-component-entity"] .t-bold span[aria-hidden="true"]',
  );
  const skillCount = await skillItems.count();
  console.log(`  → Skills found: ${skillCount}`);

  for (let i = 0; i < skillCount; i++) {
    try {
      const text = (await skillItems.nth(i).textContent())?.trim();
      if (text) skills.push(text);
    } catch {
      // skip
    }
  }

  // ───────────────────────────────────────────────
  //  Licenses & Certifications
  // ───────────────────────────────────────────────

  const certifications: Certification[] = [];
  const certItems = getSectionItems("licenses_and_certifications");
  const certCount = await certItems.count();
  console.log(`  → Certifications found: ${certCount}`);

  for (let i = 0; i < certCount; i++) {
    try {
      const item = certItems.nth(i);
      const { line1, line2, line3 } = await extractEntityTexts(item);

      const credentialUrl = await safeAttr(
        item.locator('a[href*="credential"]'),
        "href",
      );

      certifications.push({
        name: line1,
        issuingOrganization: line2,
        issueDate: line3,
        credentialUrl,
      });
    } catch (err) {
      console.warn(`  ⚠ Skipping certification ${i}:`, err);
    }
  }

  // ───────────────────────────────────────────────
  //  Projects
  // ───────────────────────────────────────────────

  const projects: Project[] = [];
  const projItems = getSectionItems("projects");
  const projCount = await projItems.count();
  console.log(`  → Projects found: ${projCount}`);

  for (let i = 0; i < projCount; i++) {
    try {
      const item = projItems.nth(i);
      const { line1, line2 } = await extractEntityTexts(item);

      const description = await safeText(
        item.locator('.inline-show-more-text span[aria-hidden="true"]'),
      );

      const url = await safeAttr(
        item.locator('a[href*="http"]').first(),
        "href",
      );

      projects.push({
        name: line1,
        duration: line2,
        description,
        url,
      });
    } catch (err) {
      console.warn(`  ⚠ Skipping project ${i}:`, err);
    }
  }

  // ───────────────────────────────────────────────
  //  Languages
  // ───────────────────────────────────────────────

  const languages: Language[] = [];
  const langItems = getSectionItems("languages");
  const langCount = await langItems.count();
  console.log(`  → Languages found: ${langCount}`);

  for (let i = 0; i < langCount; i++) {
    try {
      const item = langItems.nth(i);
      const { line1, line2 } = await extractEntityTexts(item);

      languages.push({
        name: line1,
        proficiency: line2,
      });
    } catch (err) {
      console.warn(`  ⚠ Skipping language ${i}:`, err);
    }
  }

  // ───────────────────────────────────────────────
  //  Honors & Awards
  // ───────────────────────────────────────────────

  const honors: Honor[] = [];
  const honorItems = getSectionItems("honors_and_awards");
  const honorCount = await honorItems.count();
  console.log(`  → Honors found: ${honorCount}`);

  for (let i = 0; i < honorCount; i++) {
    try {
      const item = honorItems.nth(i);
      const { line1, line2, line3 } = await extractEntityTexts(item);

      const description = await safeText(
        item.locator('.inline-show-more-text span[aria-hidden="true"]'),
      );

      honors.push({
        title: line1,
        issuer: line2,
        issueDate: line3,
        description,
      });
    } catch (err) {
      console.warn(`  ⚠ Skipping honor ${i}:`, err);
    }
  }

  // ───────────────────────────────────────────────
  //  Recommendations (Received tab)
  // ───────────────────────────────────────────────

  const recommendations: Recommendation[] = [];
  const recsSection = getSection("recommendations");
  // The "Received" tab is active by default
  const recItems = recsSection.locator(
    '.artdeco-tabpanel.active li.artdeco-list__item [data-view-name="profile-component-entity"]',
  );
  const recCount = await recItems.count();
  console.log(`  → Recommendations found: ${recCount}`);

  for (let i = 0; i < recCount; i++) {
    try {
      const item = recItems.nth(i);
      const { line1, line2, line3 } = await extractEntityTexts(item);

      const text = await safeText(
        item.locator('.inline-show-more-text span[aria-hidden="true"]'),
      );

      recommendations.push({
        recommenderName: line1,
        recommenderHeadline: line2,
        relationship: line3,
        text,
      });
    } catch (err) {
      console.warn(`  ⚠ Skipping recommendation ${i}:`, err);
    }
  }

  // ───────────────────────────────────────────────
  //  Interests (Top Voices / Companies / Groups)
  // ───────────────────────────────────────────────

  const interests: string[] = [];
  const interestsSection = getSection("interests");
  // Get items from the active tab
  const interestItems = interestsSection.locator(
    '.artdeco-tabpanel.active li.artdeco-list__item .t-bold span[aria-hidden="true"]',
  );
  const intCount = await interestItems.count();
  console.log(`  → Interests found: ${intCount}`);

  for (let i = 0; i < intCount; i++) {
    try {
      const text = (await interestItems.nth(i).textContent())?.trim();
      if (text) interests.push(text);
    } catch {
      // skip
    }
  }

  // ───────────────────────────────────────────────
  //  Assemble the profile object
  // ───────────────────────────────────────────────

  const profile: LinkedInProfile = {
    name,
    headline,
    location,
    profilePictureUrl,
    backgroundImageUrl,
    followers,
    connections,
    about,
    experience: experience.length > 0 ? experience : undefined,
    education: education.length > 0 ? education : undefined,
    skills: skills.length > 0 ? skills : undefined,
    certifications: certifications.length > 0 ? certifications : undefined,
    projects: projects.length > 0 ? projects : undefined,
    languages: languages.length > 0 ? languages : undefined,
    honors: honors.length > 0 ? honors : undefined,
    recommendations: recommendations.length > 0 ? recommendations : undefined,
    interests: interests.length > 0 ? interests : undefined,
  };

  return profile;
}
