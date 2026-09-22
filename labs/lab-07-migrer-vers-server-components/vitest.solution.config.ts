// Même oracle, pointé sur solution/ : `npm run solution:07` doit être GREEN.
// Sert à prouver que l'oracle est juste, pas à apprendre. Ne l'ouvre pas avant ton GREEN.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const SOURCE = fileURLToPath(new URL("./solution/FamilySummaryPage.tsx", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@lab": SOURCE } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.tsx"],
    env: { NEXT_PUBLIC_NESTJS_API_URL: "http://nestjs.test", LAB_SOURCE_PATH: SOURCE },
  },
});
