type EnvConfig = Record<string, string | undefined>;

const requiredKeys = [
  "DATABASE_URL",
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
  "FRONTEND_ORIGIN"
] as const;

export function validateEnv(config: EnvConfig): EnvConfig {
  for (const key of requiredKeys) {
    if (!config[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return config;
}
