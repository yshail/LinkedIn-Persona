// This file imports the "shape" (Interface) of what we expect a LinkedIn profile to look like
import type { LinkedInProfile } from "../interfaces/profile.interface.js";

/**
 * Normalizing/Cleaning Data Class
 *
 * ❓ Why do we need this?
 * When you scrape the web, data is messy. Sometimes a profile doesn't have an "about" section,
 * or it's missing "skills". If we don't clean the data, our app might crash later when it tries
 * to read a property that doesn't exist.
 *
 * 💡 Beginner Mistake:
 * Assuming scraped data will always be perfect. Always assume web scraping can fail or return missing data.
 */
export class ProfileCleaner {
  /**
   * Takes raw, messy scraped data and returns a clean object that perfectly matches
   * our LinkedInProfile interface.
   */
  clean(profile: any): LinkedInProfile {
    return {
      // If profile.name exists, use it. Otherwise (||), fall back to an empty string "".
      name: profile.name || "",
      headline: profile.headline || "",
      location: profile.location || "",

      // For arrays or optional fields, we fall back to `undefined` (which means "nothing is here")
      profilePictureUrl: profile.profilePictureUrl || undefined,
      backgroundImageUrl: profile.backgroundImageUrl || undefined,
      profileUrl: profile.profileUrl || undefined,
      followers: profile.followers || undefined,
      connections: profile.connections || undefined,
      about: profile.about || undefined,
      experience: profile.experience || undefined,
      education: profile.education || undefined,
      skills: profile.skills || undefined,
      certifications: profile.certifications || undefined,
      projects: profile.projects || undefined,
      languages: profile.languages || undefined,
      honors: profile.honors || undefined,
      recommendations: profile.recommendations || undefined,
      interests: profile.interests || undefined,
    };
  }
}
