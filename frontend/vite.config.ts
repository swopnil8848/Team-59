import { defineConfig } from "vite";
export default defineConfig({
  base: "/TEAM-59/",
  server: {
    proxy: {
      "/api": {
        target: "http://13.220.64.204",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {},
  },
});
