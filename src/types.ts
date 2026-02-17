/**
 * Shared types for LinkedIn Persona Frontend
 */

export interface OceanTrait {
  score: number;
  description: string;
  evidence: string[];
}

export interface OceanAnalysis {
  title: string;
  openness: OceanTrait;
  conscientiousness: OceanTrait;
  extraversion: OceanTrait;
  agreeableness: OceanTrait;
  neuroticism: OceanTrait;
  overallPersonaSummary: string;
}

export interface ProfileData {
  name?: string;
  headline?: string;
  location?: string;
  about?: string;
  profilePictureUrl?: string;
  backgroundImageUrl?: string;
  connections?: string;
  followers?: string;
  experience?: Array<{
    title?: string;
    company?: string;
    duration?: string;
    location?: string;
    description?: string;
  }>;
  education?: Array<{
    school?: string;
    degree?: string;
    duration?: string;
  }>;
  skills?: string[];
}

export interface AnalysisResponse {
  profile: ProfileData;
  posts: unknown[];
  analysis: OceanAnalysis | null;
}
