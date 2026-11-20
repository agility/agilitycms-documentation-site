// Sends the series to dev.to as unpublished drafts, for review in the dev.to editor.
//
//   node docs/devto-series/post-drafts.mjs            create drafts for posts not sent yet
//   node docs/devto-series/post-drafts.mjs 03 04      only these posts
//   node docs/devto-series/post-drafts.mjs --update   also overwrite drafts already sent
//                                                     (replaces any edits made on dev.to)
//   node docs/devto-series/post-drafts.mjs --dry-run  print what would be sent
//
// Needs DEVTO_API_KEY (dev.to > Settings > Extensions > DEV Community API Keys) in
// .env.local or the environment. Every request sends published: false, whatever the
// front matter says: publishing is done by hand in the dev.to editor.
//
// Images: posts reference img/out/... relatively, so they render in the repo. Here those
// paths become jsDelivr URLs pinned to the current commit, which must be pushed first.
// dev.to's image proxy breaks SVG, so posts use the GIF renders (see img/build.mjs).
// Before the final publish, consider re-uploading the images through the dev.to editor
// so they no longer depend on this branch's commit.

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const idsFile = join(here, "devto-ids.json");
const args = process.argv.slice(2);
const update = args.includes("--update");
const dryRun = args.includes("--dry-run");
const only = args.filter((a) => !a.startsWith("--"));

function apiKey() {
	if (process.env.DEVTO_API_KEY) return process.env.DEVTO_API_KEY;
	for (const f of [".env.local", ".env"]) {
		const p = join(root, f);
		if (!existsSync(p)) continue;
		const m = readFileSync(p, "utf8").match(/^DEVTO_API_KEY=(.+)$/m);
		if (m) return m[1].trim().replace(/^["']|["']$/g, "");
	}
	return null;
}

const git = (...a) => execFileSync("git", a, { cwd: root, encoding: "utf8" }).trim();

function pinnedBase() {
	const sha = git("rev-parse", "HEAD");
	const dirty = git("status", "--porcelain", "--", "docs/devto-series/img/out");
	if (dirty) throw new Error("Commit the rendered images first (docs/devto-series/img/out has changes).");
	const onRemote = git("branch", "-r", "--contains", sha);
	if (!onRemote) throw new Error(`Push first: commit ${sha.slice(0, 7)} is not on GitHub, so jsDelivr cannot serve its images.`);
	return `https://cdn.jsdelivr.net/gh/agility/agilitycms-documentation-site@${sha}/docs/devto-series/`;
}

function prepare(file, base) {
	const n = file.slice(0, 2);
	let md = readFileSync(join(here, file), "utf8");
	const fm = md.match(/^---\n([\s\S]*?)\n---\n/);
	if (!fm) throw new Error(`${file}: no front matter`);
	let front = fm[1].replace(/^published:.*$/m, "published: false").replace(/^cover_image:.*\n?/m, "");
	front += `\ncover_image: ${base}img/out/cover-${n}.png`;
	const body = md.slice(fm[0].length).replace(/\]\((img\/out\/[^)]+)\)/g, (_, p) => `](${base}${p})`);
	const title = front.match(/^title:\s*"?(.*?)"?$/m)?.[1];
	return { n, title, body_markdown: `---\n${front}\n---\n${body}` };
}

async function send(key, article, id) {
	const res = await fetch(id ? `https://dev.to/api/articles/${id}` : "https://dev.to/api/articles", {
		method: id ? "PUT" : "POST",
		headers: { "api-key": key, "content-type": "application/json", accept: "application/vnd.forem.api-v1+json" },
		body: JSON.stringify({ article: { body_markdown: article.body_markdown, published: false } }),
	});
	const text = await res.text();
	if (!res.ok) throw new Error(`${article.n}: HTTP ${res.status} ${text.slice(0, 300)}`);
	return JSON.parse(text);
}

const key = apiKey();
if (!key && !dryRun) throw new Error("Set DEVTO_API_KEY in .env.local (dev.to > Settings > Extensions).");
const base = dryRun ? "https://cdn.jsdelivr.net/gh/agility/agilitycms-documentation-site@<sha>/docs/devto-series/" : pinnedBase();
const ids = existsSync(idsFile) ? JSON.parse(readFileSync(idsFile, "utf8")) : {};
const posts = readdirSync(here).filter((f) => /^\d\d-.*\.md$/.test(f)).sort();

for (const file of posts) {
	const article = prepare(file, base);
	if (only.length && !only.includes(article.n)) continue;
	const existing = ids[article.n]?.id;
	if (existing && !update) {
		console.log(`${article.n}: already a draft (id ${existing}), skipped. Use --update to overwrite it.`);
		continue;
	}
	if (dryRun) {
		console.log(`--- ${article.n} ${existing ? `PUT ${existing}` : "POST"}: ${article.title}\n${article.body_markdown.slice(0, 600)}\n`);
		continue;
	}
	const saved = await send(key, article, existing);
	if (saved.published) throw new Error(`${article.n}: dev.to reports this as published. Stopping.`);
	ids[article.n] = { id: saved.id, title: article.title, edit: `https://dev.to/${saved.path?.split("/")[1] ?? ""}/${saved.slug}/edit`, url: saved.url };
	writeFileSync(idsFile, JSON.stringify(ids, null, "\t") + "\n");
	console.log(`${article.n}: ${existing ? "updated" : "created"} draft ${saved.id}  ${ids[article.n].edit}`);
	await new Promise((r) => setTimeout(r, 3500)); // dev.to allows about 10 article writes per 30 s
}
