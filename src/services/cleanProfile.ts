import type { LinkedInProfile } from "../interfaces/profile.interface.js";

export class ProfileCleaner {
  clean(profile: any): LinkedInProfile {
    // Add cleaning logic here
    return {
      name: profile.name || "",
      headline: profile.headline || "",
      location: profile.location || "",
      about: profile.about || "",
      experience: profile.experience || [],
      education: profile.education || [],
      skills: profile.skills || [],
    };
  }
}
