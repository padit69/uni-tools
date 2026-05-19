import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const SITE_URL = "https://tools.hihi.team";
const lastmod = new Date().toISOString().slice(0, 10);

const registry = readFileSync(join(root, "src/tools/registry.ts"), "utf8");
const toolSlugs = [...registry.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]);

const staticPages = [
  { loc: "/", changefreq: "daily", priority: "1.0" },
  { loc: "/info", changefreq: "monthly", priority: "0.6" },
  { loc: "/policy", changefreq: "yearly", priority: "0.4" },
  { loc: "/terms", changefreq: "yearly", priority: "0.4" },
];

const toolPages = toolSlugs.map((slug) => ({
  loc: `/tools/${slug}`,
  changefreq: "weekly",
  priority: "0.8",
}));

const urls = [...staticPages, ...toolPages];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    ({ loc, changefreq, priority }) => `  <url>
    <loc>${SITE_URL}${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;

writeFileSync(join(root, "public/sitemap.xml"), xml);
console.log(`Generated sitemap.xml with ${urls.length} URLs`);
