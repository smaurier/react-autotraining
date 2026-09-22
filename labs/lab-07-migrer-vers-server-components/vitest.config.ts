// Oracle du lab : les tests importent `@lab`, résolu vers TON code (src/). `LAB_SOURCE_PATH`
// pointe le même fichier pour la relecture statique.
// `npm run lab:07` depuis 04-react/labs. RED tant que src/ ne satisfait pas l'énoncé.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const SOURCE = fileURLToPath(new URL("./src/FamilySummaryPage.tsx", import.meta.url));

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
