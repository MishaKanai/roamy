import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import svgr from "vite-plugin-svgr";
import { viteSingleFile } from "vite-plugin-singlefile";
import { viteStaticCopy } from "vite-plugin-static-copy";
import path from "path";

export default defineConfig(() => {
  const isSingleFile = process.env["VITE_APP_SINGLEFILE"];
  const plugins = [react(), svgr(), nodePolyfills()];
  if (isSingleFile) {
    plugins.push(viteSingleFile());
  }

  plugins.push(
    viteStaticCopy({
      targets: [
        {
          src: path.join(
            __dirname,
            "node_modules",
            "mediainfo.js",
            "dist",
            "MediaInfoModule.wasm"
          ),
          dest: "",
        },
      ],
    })
  );
  const outDir = isSingleFile ? "build-single-file" : "build";
  return {
    esbuild: isSingleFile
      ? {
          charset: "ascii",
        }
      : undefined,
    build: {
      outDir,
    },
    plugins,
    optimizeDeps: {
      exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
    },
  };
});
