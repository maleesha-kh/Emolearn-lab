import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Set before the test workers start so every date is formatted the same way on any machine
process.env.TZ = "UTC";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
  },
});
