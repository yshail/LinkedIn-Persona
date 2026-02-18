// ========================
// LinkedIn Profile Interface
// ========================

export interface LinkedInProfile {
  // --- Basic Info (Top Card) ---
  name: string;
  headline: string;
  location: string;
  profilePictureUrl?: string | undefined;
  backgroundImageUrl?: string | undefined;
  profileUrl?: string | undefined;

  // --- Network Stats ---
  followers?: string | undefined;
  connections?: string | undefined;

  // --- About ---
  about?: string | undefined;

  // --- Experience ---
  experience?: Experience[] | undefined;

  // --- Education ---
  education?: Education[] | undefined;

  // --- Skills ---
  skills?: string[] | undefined;

  // --- Licenses & Certifications ---
  certifications?: Certification[] | undefined;

  // --- Projects ---
  projects?: Project[] | undefined;

  // --- Languages ---
  languages?: Language[] | undefined;

  // --- Honors & Awards ---
  honors?: Honor[] | undefined;

  // --- Recommendations ---
  recommendations?: Recommendation[] | undefined;

  // --- Interests ---
  interests?: string[] | undefined;
}

// --- Experience ---
export interface Experience {
  title?: string | undefined;
  company?: string | undefined;
  companyUrl?: string | undefined;
  companyLogoUrl?: string | undefined;
  duration?: string | undefined;
  location?: string | undefined;
  description?: string | undefined;
  employmentType?: string | undefined; // e.g. "Full-time", "Internship", "Part-time"
}

// --- Education ---
export interface Education {
  school?: string | undefined;
  schoolUrl?: string | undefined;
  schoolLogoUrl?: string | undefined;
  degree?: string | undefined;
  fieldOfStudy?: string | undefined;
  duration?: string | undefined;
  grade?: string | undefined;
  activities?: string | undefined;
  description?: string | undefined;
}

// --- Certification ---
export interface Certification {
  name?: string | undefined;
  issuingOrganization?: string | undefined;
  issueDate?: string | undefined;
  credentialUrl?: string | undefined;
}

// --- Project ---
export interface Project {
  name?: string | undefined;
  description?: string | undefined;
  duration?: string | undefined;
  url?: string | undefined;
}

// --- Language ---
export interface Language {
  name?: string | undefined;
  proficiency?: string | undefined;
}

// --- Honor ---
export interface Honor {
  title?: string | undefined;
  issuer?: string | undefined;
  issueDate?: string | undefined;
  description?: string | undefined;
}

// --- Recommendation ---
export interface Recommendation {
  recommenderName?: string | undefined;
  recommenderHeadline?: string | undefined;
  relationship?: string | undefined;
  text?: string | undefined;
}
