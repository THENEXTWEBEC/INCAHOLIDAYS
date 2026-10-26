import { access, readdir, readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const failures = [];

async function walk(dir) {
  const items = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const item of items) {
    const path = join(dir, item.name);
    if (item.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

try { await access(join(dist, "index.html")); }
catch { failures.push("dist/index.html is missing; run npm run build first."); }

const files = failures.length ? [] : await walk(dist);
const htmlFiles = files.filter(file => file.endsWith(".html"));
const fileSet = new Set(files);

if (htmlFiles.length < 10) failures.push(`Expected at least 10 HTML pages, found ${htmlFiles.length}.`);

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const label = file.slice(dist.length + 1);
  if (!/<title>[^<]+<\/title>/.test(html)) failures.push(`${label}: missing title.`);
  if (!/<meta name="description" content="[^"]+">/.test(html)) failures.push(`${label}: missing meta description.`);
  if (!/<link rel="canonical" href="https:\/\//.test(html)) failures.push(`${label}: missing canonical URL.`);
  if (!/<h1[\s>]/.test(html)) failures.push(`${label}: missing H1.`);
  if (/<a[^>]+href="#"/.test(html)) failures.push(`${label}: dead # link found.`);
  if (/[\u{1F000}-\u{1FAFF}]/u.test(html)) failures.push(`${label}: emoji code point found.`);

  const assetRefs = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(match => match[1]);
  for (const ref of assetRefs) {
    const target = join(dist, ref.split("?")[0]);
    if (!fileSet.has(target)) failures.push(`${label}: missing asset ${ref}.`);
  }

  const internalLinks = [...html.matchAll(/href="(\/(?!assets\/)[^"?#]*)[^"]*"/g)].map(match => match[1]);
  for (const href of internalLinks) {
    const target = href === "/"
      ? join(dist, "index.html")
      : href.endsWith(".html")
        ? join(dist, href)
        : join(dist, href, "index.html");
    if (!fileSet.has(target)) failures.push(`${label}: broken internal link ${href}.`);
  }

  const imageTags = [...html.matchAll(/<img\s[^>]*>/g)].map(match => match[0]);
  for (const tag of imageTags) {
    if (!/alt="[^"]*"/.test(tag)) failures.push(`${label}: image without alt attribute.`);
  }
}

for (const required of ["sitemap.xml", "robots.txt", "404.html", ".openai/hosting.json"]) {
  if (!fileSet.has(join(dist, required))) failures.push(`Missing ${required}.`);
}

const largeAssets = [];
for (const file of files.filter(file => /\.(webp|png|jpe?g)$/i.test(file))) {
  const info = await stat(file);
  if (info.size > 1_200_000) largeAssets.push(`${file.slice(dist.length + 1)} (${Math.round(info.size / 1024)} KB)`);
}
if (largeAssets.length) failures.push(`Oversized image assets: ${largeAssets.join(", ")}`);

if (failures.length) {
  console.error(failures.map(item => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log(`Checks passed: ${htmlFiles.length} HTML pages, ${files.length} output files, no missing local assets or emoji code points.`);
