import { build } from "esbuild";
import { mkdir, copyFile, cp } from "node:fs/promises";
await mkdir("dist", { recursive: true });
await build({
  entryPoints: ["src/demo.ts"],
  bundle: true,
  format: "esm",
  outfile: "dist/demo.js",
  minify: true,
  sourcemap: true,
});
await copyFile("index.html", "dist/index.html");
await cp("licenses", "dist/licenses", { recursive: true });
