import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";
import react from "@vitejs/plugin-react-swc";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import svgr from "vite-plugin-svgr";

export default defineConfig(() => {
  return {
    build: {
      outDir: "build",
    },
    plugins: [react(), svgr(), nodePolyfills()],
  };
});
