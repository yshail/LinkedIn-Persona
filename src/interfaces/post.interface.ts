// ========================
// LinkedIn Post Interface
// (Recent Activity / All Posts)
// ========================

export interface LinkedInPost {
  /** Activity URN — unique identifier for the post */
  urn?: string | undefined;

  /** Author name */
  authorName?: string | undefined;

  /** How many days ago the post was published */
  postedDaysAgo?: number | undefined;

  /** Full post text content */
  content?: string | undefined;

  /** Engagement stats */
  reactions?: number | undefined;
  comments?: number | undefined;
  reposts?: number | undefined;
}
