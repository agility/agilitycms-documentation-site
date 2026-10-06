// Score docs search engines against evals/search/questions.json.
//
//   ALGOLIA_APP_ID=… ALGOLIA_SEARCH_KEY=… \
//   AZURE_SEARCH_NAME=… AZURE_SEARCH_KEY=… \
//   node evals/search/score.mjs [--json results.json]
//
// Algolia is queried directly with the same parameters as the docs MCP
// search_docs tool (app/api/mcp/route.ts), not through the MCP endpoint, so
// a run never shows up in production analytics or fires the zero-result alerts.
// Azure is scored three ways to show what each layer adds: keyword only,
// keyword + vector (hybrid), and hybrid + semantic ranker. Azure returns
// sections, so results are collapsed to distinct pages before scoring.
// Read-only: it never writes to either index.

import { readFileSync, writeFileSync } from "node:fs";

const { questions } = JSON.parse(readFileSync(new URL("./questions.json", import.meta.url), "utf8"));
const env = (k) => process.env[k] || "";
const K = 10;

// "/docs/editors/scheduling", "https://agilitycms.com/docs/editors/scheduling" → "editors/scheduling"
const toPath = (u) =>
	String(u || "")
		.replace(/^https?:\/\/[^/]+/, "")
		.replace(/^\/?docs\//, "")
		.replace(/^\//, "")
		.replace(/\.md$/, "")
		.replace(/[?#].*$/, "")
		.replace(/\/$/, "");

const distinct = (paths) => [...new Set(paths)].slice(0, K);

const algolia = (index) => async (q) => {
	const res = await fetch(`https://${env("ALGOLIA_APP_ID")}-dsn.algolia.net/1/indexes/${index}/query`, {
		method: "POST",
		headers: {
			"X-Algolia-Application-Id": env("ALGOLIA_APP_ID"),
			"X-Algolia-API-Key": env("ALGOLIA_SEARCH_KEY"),
			"content-type": "application/json",
		},
		body: JSON.stringify({
			query: q,
			hitsPerPage: K,
			attributesToRetrieve: ["url"],
			attributesToHighlight: [],
			queryLanguages: ["en"],
			removeStopWords: true,
			ignorePlurals: true,
			removeWordsIfNoResults: "allOptional",
		}),
	});
	const j = await res.json();
	if (!j.hits) throw new Error(`algolia: ${JSON.stringify(j).slice(0, 200)}`);
	return { pages: distinct(j.hits.map((h) => toPath(h.url))), top: null };
};

function azure(mode) {
	return async (q) => {
		const body = { search: q, select: "url", top: 50 };
		if (mode !== "keyword") body.vectorQueries = [{ kind: "text", text: q, fields: env("AZURE_VECTOR_FIELD") || "bodyVector", k: 50 }];
		if (mode === "semantic") Object.assign(body, { queryType: "semantic", semanticConfiguration: "docs-semantic" });
		const res = await fetch(
			`https://${env("AZURE_SEARCH_NAME")}.search.windows.net/indexes/${env("AZURE_SEARCH_INDEX") || "agility-docs-sections"}/docs/search?api-version=2024-07-01`,
			{ method: "POST", headers: { "api-key": env("AZURE_SEARCH_KEY"), "content-type": "application/json" }, body: JSON.stringify(body) }
		);
		const j = await res.json();
		if (!j.value) throw new Error(`azure ${mode}: ${JSON.stringify(j).slice(0, 200)}`);
		return {
			pages: distinct(j.value.map((d) => toPath(d.url))),
			top: mode === "semantic" ? j.value[0]?.["@search.rerankerScore"] ?? null : null,
		};
	};
}

const engines = {
	"algolia per article": algolia("doc_site"),
	"algolia per section": algolia("doc_site_sections"),
	"azure keyword": azure("keyword"),
	"azure hybrid": azure("hybrid"),
	"azure hybrid + semantic": azure("semantic"),
};

const rankOf = (pages, expect) => {
	const i = pages.findIndex((p) => expect.includes(p));
	return i === -1 ? null : i + 1;
};

const rows = [];
for (const q of questions) {
	const row = { id: q.id, q: q.q, source: q.source, expect: q.expect, engines: {} };
	for (const [name, run] of Object.entries(engines)) {
		const r = await run(q.q);
		row.engines[name] = { rank: rankOf(r.pages, q.expect), top3: r.pages.slice(0, 3), topScore: r.top };
	}
	rows.push(row);
}

const answerable = rows.filter((r) => r.expect.length);
console.log(`\n${answerable.length} answerable questions (${rows.length - answerable.length} gap probe)\n`);
console.log("engine                     hit@1  hit@3  hit@5  MRR@10  missed");
for (const name of Object.keys(engines)) {
	const ranks = answerable.map((r) => r.engines[name].rank);
	const at = (n) => ranks.filter((x) => x && x <= n).length;
	const mrr = ranks.reduce((s, x) => s + (x ? 1 / x : 0), 0) / ranks.length;
	console.log(
		`${name.padEnd(26)} ${String(at(1)).padStart(5)}  ${String(at(3)).padStart(5)}  ${String(at(5)).padStart(5)}  ${mrr.toFixed(3).padStart(6)}  ${ranks.filter((x) => !x).length}`
	);
}

console.log("\nPer question (rank of the first correct page; - = not in top 10):");
for (const r of rows) {
	const cells = Object.keys(engines).map((n) => String(r.engines[n].rank ?? "-").padStart(3));
	console.log(`${String(r.id).padStart(2)} ${cells.join(" ")}  ${r.q}`);
}

for (const r of rows.filter((r) => !r.expect.length)) {
	console.log(`\nGap probe ${r.id}: "${r.q}"`);
	for (const [n, e] of Object.entries(r.engines))
		console.log(`  ${n}: ${e.top3.join(" | ") || "(nothing)"}${e.topScore != null ? `  (reranker ${e.topScore.toFixed(2)} of 4)` : ""}`);
}

const out = process.argv.indexOf("--json");
if (out !== -1) writeFileSync(process.argv[out + 1], JSON.stringify(rows, null, 2));
