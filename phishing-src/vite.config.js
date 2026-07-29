import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// This is the SOURCE project only — not served directly. It builds into
// ../phishing/ (a sibling folder in the repo, matching kb/'s pattern:
// GitHub Pages serves that as https://.../cbm-knowledge-base/phishing/,
// linked from the root landing page as href="phishing/"). Keeping
// source/build output separate avoids checking node_modules etc. into the
// served path and keeps the URL clean (no /dist/ in it).
export default defineConfig({
  plugins: [react()],
  base: "/cbm-knowledge-base/phishing/",
  build: {
    outDir: "../phishing",
    emptyOutDir: true,
  },
});
