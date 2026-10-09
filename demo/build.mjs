/** Bundles the demo: the real engine plus a plain DOM interface, inlined into one HTML file. */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

execFileSync("npx", ["esbuild", "demo/main.ts", "--bundle", "--format=iife", "--minify", "--target=es2020", "--outfile=/tmp/nxone-demo.js"], { stdio: "inherit" });
const js = readFileSync("/tmp/nxone-demo.js", "utf8");
const html = readFileSync("demo/template.html", "utf8").replace("__BUNDLE__", () => js);
const out = process.argv[2] || "/tmp/nxone-demo.html";
writeFileSync(out, html);
console.log(`Demo written to ${out}, ${(html.length / 1e6).toFixed(2)} MB`);
