// Même oracle, pointé sur solution/ : `npm run solution:03` doit être GREEN.
// Sert à prouver que l'oracle est juste, pas à apprendre. Ne l'ouvre pas avant ton GREEN.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@lab/page": fileURLToPath(new URL("./solution/page.tsx", import.meta.url)),
      "@lab/route": fileURLToPath(new URL("./solution/route.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.tsx"],
    env: { NESTJS_API_URL: "http://nestjs.test" },
  },
});
