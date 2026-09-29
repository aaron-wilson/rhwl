import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: "es2022",
    sourcemap: true,
    manifest: true,
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "eslint/**/*.test.ts", "scripts/**/*.test.ts"],
    setupFiles: ["src/test/setup.ts"],
    css: false,
    coverage: {
      provider: "v8",
      include: ["src/domain/**", "src/lib/**"],
      exclude: ["**/*.test.{ts,tsx}", "**/index.ts"],
      reporter: ["text-summary", "json-summary"],
      thresholds: { lines: 90, branches: 85, functions: 90 },
    },
  },
});
