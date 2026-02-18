import type { LinkedInProfile } from "../interfaces/profile.interface.js";

export class ProfileCleaner {
  clean(profile: any): LinkedInProfile {
    return {
      name: profile.name || "",
      headline: profile.headline || "",
      location: profile.location || "",
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
