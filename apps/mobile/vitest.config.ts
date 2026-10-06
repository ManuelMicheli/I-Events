import { defineConfig } from "vitest/config";

// Only the pure modules: screens and components need a device or the web export to run.
export default defineConfig({ test: { include: ["src/**/*.test.ts"] } });
