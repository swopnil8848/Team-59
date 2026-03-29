export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: Number(process.env.PORT ?? 3001),
    apiPrefix: process.env.API_PREFIX ?? "api",
    frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173"
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d"
  },
  integrations: {
    aiBackendUrl: process.env.AI_BACKEND_URL ?? "http://13.220.64.204"
  },
  redis: {
    host: process.env.REDIS_HOST ?? "127.0.0.1",
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD ?? undefined,
    prefetchLockTtlSeconds: Number(process.env.REDIS_PREFETCH_LOCK_TTL_SECONDS ?? 120),
    prefetchBackfillIntervalMs: Number(
      process.env.REDIS_PREFETCH_BACKFILL_INTERVAL_MS ?? 60_000
    )
  }
});
