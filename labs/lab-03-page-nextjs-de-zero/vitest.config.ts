// Oracle du lab : les tests importent `@lab/page` et `@lab/route`, résolus vers TON code
// (src/). `npm run lab:03` depuis 04-react/labs. RED tant que src/ ne satisfait pas l'énoncé.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@lab/page": fileURLToPath(new URL("./src/page.tsx", import.meta.url)),
      "@lab/route": fileURLToPath(new URL("./src/route.ts", import.meta.url)),
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
