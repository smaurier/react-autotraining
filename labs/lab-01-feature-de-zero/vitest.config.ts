// Oracle du lab : les tests importent `@lab`, résolu vers TON code (src/).
// `npm run lab:01` depuis 04-react/labs. RED tant que src/ ne satisfait pas l'énoncé.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@lab": fileURLToPath(new URL("./src/AjouterMembreForm.tsx", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.tsx"],
  },
});
