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
  }
});
