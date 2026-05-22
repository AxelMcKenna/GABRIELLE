import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Read .env / .env.local from the repo root so backend & frontend share one file.
const ENV_DIR = path.resolve(__dirname, "..");

export default defineConfig({
  plugins: [react()],
  envDir: ENV_DIR,
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
