// Même oracle, pointé sur solution/ : `npm run solution:01` doit être GREEN.
// Sert à prouver que l'oracle est juste, pas à apprendre. Ne l'ouvre pas avant ton GREEN.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@lab": fileURLToPath(new URL("./solution/AjouterMembreForm.tsx", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.tsx"],
  },
});
