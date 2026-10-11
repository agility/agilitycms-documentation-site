# Docs search: the working journal

A dated record of how the Agility docs search moved from Algolia toward Azure AI Search: what was tried, what was measured, what turned out wrong, and why each decision was made. It is raw material for a blog post, so it keeps the dead ends. `FINDINGS.md` holds the distilled lessons and `README.md` the method and result tables; this file is the story in order.

Conventions: every number comes from a run against the real docs content; each entry names the commit, PR or command that produced it. "Run N" refers to a full pass of `score.mjs` over the 52-question set.

---

## Background: why search came up at all

- The docs site exposes a **Knowledgebase MCP server** (`/docs/api/mcp`) with two tools, `search_docs` and `fetch_doc`. AI agents (Claude, Copilot, Cursor) call it to answer questions about Agility.
- PR #69 (merged 2026-10-06) added analytics on agent traffic, including a PostHog tile and alert for "Docs MCP: searches with zero results".
- That data showed the problem: **agents ask in sentences**, and Algolia's defaults require every word to match. "can I schedule content to publish later" returned **0 results**, although `editors/scheduling` answers it directly.

## 2026-10-06: step 1, stop the zero-result answers (PR #71)

- Four Algolia query settings on `search_docs` only: `queryLanguages: ["en"]`, `removeStopWords: true`, `ignorePlurals: true`, `removeWordsIfNoResults: "allOptional"`.
- Before/after on the live `doc_site` index:

| Query | Before | After (top hit) |
|---|---|---|
| can I schedule content to publish later | 0 | 9 (Scheduling Overview) |
| what happens to nested content when I delete the parent item | 0 | 368 (Nest, Link or Share?) |
| how do I set up preview mode with the Next.js app router | 0 | 15 (wrong page first) |
| webhook signature verification | 12 (integration pages first) | unchanged |

- **Takeaway at the time:** that fixed zero results, not ranking. Two of the four still put the wrong page first. Ranking was the next question, and the candidates were Algolia NeuralSearch and Azure AI Search hybrid.

## 2026-10-06: step 2, write the exam before grading anyone (commit d3846da)

- 52 questions in `questions.json`, each listing every page that counts as correct. Sources: real docs searches (staff excluded), pages AI agents fetch, the most-read pages, agent-style phrasing, and **one gap probe** (a question the docs can't answer: user-generated content).
- Committed **before any engine was scored**, so the answers couldn't drift toward whatever an engine returned. This is the integrity point of the whole exercise.
- Scoring (`score.mjs`): hit@1/3/5 (is a correct page in the top 1/3/5 distinct pages) and MRR@10 (mean of 1/rank, 0 if not in the top 10). Section-level engines are collapsed to distinct pages first so they aren't credited twice for one article.

## 2026-10-06: run 1, Algolia vs Azure from the `.md` twins (commit dd1a595)

- Azure index `agility-docs` on the `agility-ai-search-dev` service (Basic tier, East US), filled from the live site's `.md` twins (what `llms.txt` lists): 387 articles split at headings into 2,049 sections, code kept, `text-embedding-3-large` vectors (3,072 dims), each section embedded as `Title > Heading` + text.

| Engine | hit@1 | hit@3 | hit@5 | MRR@10 | Missed |
|---|---|---|---|---|---|
| Algolia `doc_site` (PR #71 settings) | 25 | 33 | 36 | 0.577 | 15 |
| Azure keyword only | 30 | 40 | 42 | 0.691 | 7 |
| Azure keyword + vector | 36 | 43 | 48 | 0.795 | 2 |
| Azure keyword + vector + semantic ranker | 35 | 47 | 49 | 0.810 | 1 |

- **Hypothesis written down after run 1:** "roughly half the gap is how content is indexed" (sections + code vs whole articles, code stripped), "the other half is vectors plus the semantic ranker".

## 2026-10-06: run 2, testing that hypothesis, and finding a bug (PR #72)

- To test it, built an Algolia index split the same way (`doc_site_sections`, one record per section, `distinct` per article), and rebuilt Azure from the CMS through the site's own code (`lib/search/azure.ts`), so both engines indexed the same content the same way.

| Engine | hit@1 | hit@3 | hit@5 | MRR@10 | Missed |
|---|---|---|---|---|---|
| Algolia, one record per article | 25 | 33 | 36 | 0.577 | 15 |
| Algolia, one record per section | 25 | 32 | 35 | 0.573 | 14 |
| Azure keyword only | 27 | 40 | 42 | 0.668 | 6 |
| Azure keyword + vector | 36 | 44 | 47 | 0.801 | 2 |
| Azure keyword + vector + semantic | 37 | 47 | 49 | 0.830 | 1 |

- **The hypothesis was wrong.** Splitting changed nothing for Algolia (0.577 → 0.573). The gap is the *ranking method*: BM25 keyword ranking that weighs rare words (0.668), then vectors (the biggest jump, to 0.801), then the semantic ranker (0.830).
- Sections stayed in anyway, for other reasons: hits land on the passage that answers, long articles aren't truncated at 5,000 characters, and code stays searchable.
- **Bug found along the way:** the full reindex route read each category's articles through GraphQL without `take`, and GraphQL lists default to 50. Overview, Editors and Developers came back with exactly 50, so **89 of 437 articles** were missing. The reindex does a full replace, so running it would have *deleted* them from live search. They had survived only because the publish webhook adds articles one at a time. Fixed with `take: 250`, and the route now refuses to run if any category hits the limit.
- PR #72 also made the MCP's engine switchable with one env var (`DOCS_SEARCH_ENGINE=algolia|azure`; Azure falls back to Algolia if unconfigured), keeping the tool contract identical. Nothing live changed on merge.

## 2026-10-11: run 3, reproducing on `main` before a preview test

- Rerun of `score.mjs` against the live indexes, read-only, from a laptop:

| Engine | hit@1 | hit@3 | hit@5 | MRR@10 | Missed |
|---|---|---|---|---|---|
| Algolia `doc_site` | 24 | 34 | 37 | 0.573 | 13 |
| Algolia `doc_site_sections` | 25 | 30 | 33 | 0.564 | 13 |
| Azure `agility-docs-sections` keyword | 27 | 40 | 42 | 0.668 | 6 |
| Azure hybrid | 36 | 44 | 47 | 0.801 | 2 |
| Azure hybrid + semantic | 37 | 47 | 49 | 0.830 | 1 |

- Azure reproduced exactly. Algolia moved slightly (15 → 13 misses on `doc_site`), most likely because `doc_site` was rebuilt after the 50-article fix restored the 89 missing articles. The ranking conclusion is unchanged.
- **Small methodology fix:** `score.mjs` called Algolia with analytics on, so each run added ~104 test queries to the Algolia search analytics that the content-gap reports read. Now sends `analytics: false, clickAnalytics: false`. (The earlier claim that runs "never reach production analytics" was true for PostHog, not for Algolia's own analytics.)
- The semantic ranker on this service is on the **free plan (1,000 semantic queries/month)**. Each full eval run uses 52 of them.

## 2026-10-11: the preview test (in progress)

Goal: run the switchable engine end to end on a real deployment, then decide which engine fits which use case, not just which one scores higher on the exam.

Setup:
- Branch `test/azure-search-preview`; Vercel env vars set for **Preview, that branch only**: `DOCS_SEARCH_ENGINE=azure`, Azure Search endpoint and keys, Azure OpenAI endpoint/key (resource `agility-dev-ai`, deployment `text-embedding-3-large`), `SEARCH_REINDEX_SECRET`.
- The preview writes to its **own index, `agility-docs-preview`**, so testing the reindex route can't disturb `agility-docs-sections`.

Use cases to judge separately:
1. **Agents via MCP `search_docs`:** sentence-style questions; quality (the 52-question set) plus latency end to end through the MCP.
2. **People in the ⌘K search box:** short keywords and partial words typed letter by letter; prefix matching, latency per keystroke.
3. **A future docs chatbot:** passage quality, and whether a confidence score can reliably say "the docs don't cover this".
4. **Operations:** time and cost to build the index, keeping it fresh on publish, failure modes, and monthly cost.

Results: _to be filled in as each test runs._
