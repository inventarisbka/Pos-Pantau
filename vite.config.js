import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: './' makes the build use relative asset paths, so it works
// whether GitHub Pages serves it from a user site (username.github.io)
// or a project site (username.github.io/repo-name) without extra config.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
