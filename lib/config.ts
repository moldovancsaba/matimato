export type RuntimeConfig = {
  mongodbUri?: string;
  mongodbDb: string;
  appUrl: string;
  useMemoryStore: boolean;
  secureCookies: boolean;
  featureFlags: {
    profiles: boolean;
    history: boolean;
    leaderboards: boolean;
    gamification: boolean;
    challenges: boolean;
  };
};

export function getRuntimeConfig(): RuntimeConfig {
  return {
    mongodbUri: process.env.MONGODB_URI,
    mongodbDb: process.env.MONGODB_DB || "matimato",
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    useMemoryStore: process.env.MATIMATO_USE_MEMORY_STORE === "1" || !process.env.MONGODB_URI,
    secureCookies: process.env.MATIMATO_COOKIE_SECURE === "1" || process.env.NODE_ENV === "production",
    featureFlags: {
      profiles: process.env.MATIMATO_FEATURE_PROFILES !== "0",
      history: process.env.MATIMATO_FEATURE_HISTORY !== "0",
      leaderboards: process.env.MATIMATO_FEATURE_LEADERBOARDS !== "0",
      gamification: process.env.MATIMATO_FEATURE_GAMIFICATION !== "0",
      challenges: process.env.MATIMATO_FEATURE_CHALLENGES !== "0"
    }
  };
}
