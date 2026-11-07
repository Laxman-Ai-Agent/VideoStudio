// Remotion engine entry. Contract (docs/ARCHITECTURE.md): scene JSON + template in, one MP4 out.
//   node render.mjs <build_dir> <out.mp4> <preview|final> <chrome.exe>
// build_dir holds scene.json + Composition.jsx (the template). Bundles are cached in .bundles/<hash>.
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [buildDir, out, quality, chrome] = process.argv.slice(2);
const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "src");
const h = createHash("sha256").update(readFileSync(join(buildDir, "Composition.jsx")));
for (const f of ["index.jsx", "Root.jsx", "studio.jsx"]) h.update(readFileSync(join(src, f)));
h.update(readFileSync(join(here, "package-lock.json")));
const dir = join(here, ".bundles", h.digest("hex").slice(0, 16));

if (!existsSync(join(dir, "bundle", "index.html"))) {
  const tmp = `${dir}.tmp-${process.pid}`;  // parallel workers build apart; the first rename wins
  mkdirSync(join(tmp, "src"), { recursive: true });
  cpSync(src, join(tmp, "src"), { recursive: true });
  cpSync(join(buildDir, "Composition.jsx"), join(tmp, "src", "Template.jsx"));
  await bundle({ entryPoint: join(tmp, "src", "index.jsx"), outDir: join(tmp, "bundle") });
  try { renameSync(tmp, dir); } catch { rmSync(tmp, { recursive: true, force: true }); }
}

const serveUrl = join(dir, "bundle");
const inputProps = JSON.parse(readFileSync(join(buildDir, "scene.json"), "utf-8"));
const browser = { browserExecutable: chrome, chromeMode: "chrome-for-testing" };
const composition = await selectComposition({ serveUrl, id: "Scene", inputProps, ...browser });
await renderMedia({ composition, serveUrl, codec: "h264", outputLocation: out, inputProps, ...browser,
                    concurrency: 1, crf: quality === "final" ? 18 : 23, imageFormat: "jpeg", jpegQuality: 92,
                    logLevel: "error" });
