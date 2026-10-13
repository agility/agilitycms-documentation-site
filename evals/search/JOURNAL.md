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

### Building the index on the preview

- `POST /docs/api/search/indexAllArticles?targets=azure` on the preview: without the bearer secret, **401**; with it, **128 s** to read 451 articles from the CMS, split them into 2,431 sections, embed every section and upload. Nothing skipped.
- Second run straight after: **2 s, 0 embedded, 2,431 unchanged**. The content-hash check works, so a rebuild only pays for what changed.
- Service usage after: 5 of 15 indexes, 291 MB of 16 GB storage, 80 MB of 5 GB vector quota (Basic tier, one partition). The preview index alone: 102 MB, 28 MB of it vectors.
- Gotcha: `/stats` reported 2,304 documents just after the build; `$count` said 2,431. Index statistics lag by minutes, so count with `$count`.

### A second test set for the search box (commit ca8a134)

- The agent questions are sentences, but people in ⌘K type 1–3 words. A separate set, `searchbox.json`: 28 queries copied as typed from 90 days of Algolia analytics (`web stu`, `worfklow`, `migrration`, `a/b`), plus 8 real queries cut off mid-word (`webho`, `multi-fac`, `dee`) standing in for someone still typing. Committed before scoring, same rule as the first set.
- **Finding while building it:** 90 days of `doc_site` analytics had 1,903 searches, and several of the "top searches" were the eval questions themselves ("can i schedule content to publish later", 10 times). The earlier eval runs had been polluting the analytics. That's why the scorer now sends `analytics: false`.
- New scorer options (`score.mjs`): `--set`, `--engines`; an `algolia search box` engine that sends exactly what the search modal sends (Algolia defaults, none of the MCP's sentence settings); `azure keyword + prefix`, which rewrites the query in Lucene syntax so each word may have one typo and the last word may be a prefix (`multi-fac` → `multi~1 (fac* OR fac~1)`); and p50/p95 latency per engine (measured from a laptop in Canada to Algolia's DSN and Azure East US, so it's relative, not absolute).

### Run 4 (2026-10-11): the CMS-built preview index, before the fix below

Agent set (51 answerable):

| Engine | hit@1 | hit@3 | hit@5 | MRR@10 | Missed | p50 ms |
|---|---|---|---|---|---|---|
| Algolia, search-box settings | 13 | 16 | 18 | 0.291 | 33 | 47 |
| Algolia `doc_site`, MCP settings | 24 | 34 | 37 | 0.573 | 13 | 50 |
| Algolia `doc_site_sections` | 25 | 30 | 33 | 0.564 | 13 | 47 |
| Azure keyword | 34 | 44 | 46 | 0.776 | 2 | 68 |
| Azure keyword + prefix/typo | 41 | 49 | 49 | 0.873 | 2 | 337 |
| Azure hybrid | 43 | 46 | 48 | 0.881 | 2 | 272 |
| Azure hybrid + semantic | 34 | 47 | 48 | 0.785 | 2 | 350 |

Search-box set (36):

| Engine | hit@1 | hit@3 | hit@5 | MRR@10 | Missed | p50 ms |
|---|---|---|---|---|---|---|
| Algolia, search-box settings | 30 | 34 | 34 | 0.886 | 0 | 48 |
| Algolia `doc_site`, MCP settings | 27 | 32 | 33 | 0.821 | 2 | 47 |
| Algolia `doc_site_sections` | 31 | 32 | 33 | 0.885 | 2 | 45 |
| Azure keyword | 25 | 27 | 27 | 0.722 | 9 | 60 |
| Azure keyword + prefix/typo | 30 | 35 | 36 | 0.910 | 0 | 234 |
| Azure hybrid | 29 | 33 | 34 | 0.867 | 1 | 198 |
| Azure hybrid + semantic | 27 | 35 | 36 | 0.863 | 0 | 268 |

What this run showed:
- **The live search box can't handle sentences.** With its default settings Algolia found the right page for only 18 of 51 agent questions in the top 5. People mostly type keywords, so this matters less for ⌘K than for agents, but it's why the MCP needed PR #71's settings.
- **Plain Azure keyword is bad at search-box typing**: 9 misses, all half-typed words or typos (`webho`, `worfklow`, `migrration`). Azure matches whole words unless the query asks for fuzzy or prefix matching. *(The "keyword + prefix/typo" rows in this run were mislabeled: that engine was also sending vectors, so they're really hybrid + prefix. See "After the fix" below.)*
- **The semantic ranker got worse than plain hybrid on the CMS-built index** (hit@1 34 vs 43), the reverse of run 2. Deterministic on repeat; legacy-framework pages were only 6 of the 156 top-3 slots, so they weren't the cause. Typical losses: "what is your uptime sla" → `security-review-pack` first; "can I schedule content to publish later" → `overview/concepts` first. The ranker favours pages that discuss a topic broadly over the page that answers the task.
- Hybrid on the CMS-built index (0.881) beat hybrid on the `.md`-twin index (0.801). The visible difference: the CMS build fills `description` and the real section name; the `.md`-twin build left both empty.

### The line-ending bug (found 2026-10-11)

Looking at why one page ranked oddly, both Azure indexes showed its sections with **empty headings**, and the second section starting mid-link (`/diagram-edge-fallback-v2.svg)`). The splitter hadn't split at headings at all; it had cut by length.

- Cause: the heading pattern is `/^#{2,3}\s+(.+)$/`. In JavaScript `.` doesn't match `\r`, so on a line `## Heading\r` the `(.+)$` can never reach the end of the string. **271 of 451 articles** store their Markdown with Windows (CRLF) line endings.
- Effect on section indexes (Algolia `doc_site_sections` and both Azure indexes): **211 articles had no section headings at all**, split into blind 2,400-character chunks.
- Effect on the **live** search box: `doc_site` records get a `headings` attribute from the same kind of pattern; **284 of 451 live records have empty headings**. `headings` is the second searchable attribute after `title`, so the ⌘K box has been ranking without headings for over half the docs.
- It also undercuts run 2's headline lesson: "splitting by section didn't change Algolia's ranking" was measured while the splitting was broken for nearly half the articles. It has to be re-measured.
- Fix (commit a231e02): normalize `\r\n` to `\n` where Markdown enters the indexer. Checked with a CRLF sample: before, one chunk with no heading; after, split at both headings with no `\r` left.
- Lesson for the post: **look at what's actually in your index.** Every aggregate number looked plausible; the bug only showed up when reading the stored records for one page.

### After the fix: re-embedding, and a bug in my own scorer

- Rebuilt on the fixed preview (`?targets=sections,azure`): **2,431 → 4,877 sections** once headings were recognized. 3,597 re-embedded, 1,280 unchanged (articles that were already LF), 97 s. Algolia `doc_site_sections` was rebuilt in the same call; production doesn't read that index, so it was safe to rebuild for a fair re-test.
- The right sections **didn't raise the scores**. Azure hybrid went 0.881 → 0.853 and Algolia sections 0.564 → 0.577; the semantic ranker stayed around 0.78. Chunking correctly is worth doing for the passages and headings it produces, but on this test set it doesn't move ranking.
- **My scorer change had a bug.** The new `azure keyword + prefix` engine also sent the vector query (the check was `mode !== "keyword"`), so in run 4 and the first run 5 that row was really hybrid + prefix. That's why it looked as good as hybrid and was as slow. I nearly wrote down "fuzzy keyword matching ties vectors", which was false. Fixed in 97f963e; `azure hybrid + prefix` is now the combined engine and `azure keyword + prefix` is keyword only. Run 4's "keyword + prefix" rows above are actually hybrid + prefix.

### Test-set contamination

Calling both preview MCPs side by side, Algolia answered "can I schedule content to publish later" with **"AI Search Explained: Keyword, Vector, Hybrid and Semantic Ranking"**, and "how do I verify webhook signatures" with a page titled **"Algolia"**. The docs articles written about this project quote the test questions as examples.

- Checked every test question of 3+ words against the full text of all 4,877 sections: agent questions 1, 6 and 7 appear verbatim in five pages about search (`developers/ai-search-explained`, `developers/algolia`, `developers/azure-ai-search`, `developers/indexing-content-for-search`, `developers/build-an-mcp-server-for-your-content`). Other matches ("personal access token", "custom 404 page") are just the natural phrasing of real pages.
- Scorer gained `--exclude`, which drops pages from every engine's results before ranking. With those five excluded, Algolia rose slightly (+0.014 to +0.017 MRR); Azure didn't change. Algolia's keyword ranking was being pulled toward the pages that quote the question; Azure's wasn't.
- Lesson for the post: **once you publish what you learned, your test questions are in your corpus.** Exclude those pages, or write a fresh test set.

### Run 7 (2026-10-11): the clean numbers

Preview index `agility-docs-preview` (CMS-built, CRLF fixed, 4,877 sections), Algolia `doc_site` (live) and `doc_site_sections` (CRLF fixed), the five contaminated pages excluded. Latency is p50 from a laptop, direct to each engine.

Agent set (51 answerable):

| Engine | hit@1 | hit@3 | hit@5 | MRR@10 | Missed | p50 ms |
|---|---|---|---|---|---|---|
| Algolia, search-box settings | 13 | 16 | 18 | 0.291 | 33 | 46 |
| Algolia `doc_site`, MCP settings (live MCP today) | 25 | 34 | 37 | 0.587 | 13 | 53 |
| Algolia `doc_site_sections` | 25 | 35 | 37 | 0.594 | 12 | 46 |
| Azure keyword | 32 | 45 | 46 | 0.762 | 3 | 67 |
| Azure keyword + typo/prefix | 30 | 46 | 47 | 0.741 | 2 | 117 |
| **Azure hybrid** | **40** | **47** | **48** | **0.853** | **2** | 266 |
| Azure hybrid + typo/prefix | 40 | 48 | 48 | 0.859 | 2 | 311 |
| Azure hybrid + semantic | 34 | 47 | 48 | 0.796 | 2 | 330 |

Search-box set (36):

| Engine | hit@1 | hit@3 | hit@5 | MRR@10 | Missed | p50 ms |
|---|---|---|---|---|---|---|
| **Algolia, search-box settings (live ⌘K today)** | **30** | **34** | **34** | **0.886** | **0** | **53** |
| Algolia `doc_site`, MCP settings | 27 | 32 | 33 | 0.821 | 2 | 53 |
| Algolia `doc_site_sections` | 30 | 32 | 33 | 0.872 | 2 | 45 |
| Azure keyword | 25 | 27 | 27 | 0.718 | 9 | 60 |
| Azure keyword + typo/prefix | 29 | 35 | 35 | 0.884 | 1 | 72 |
| Azure hybrid | 27 | 32 | 33 | 0.824 | 1 | 224 |
| Azure hybrid + typo/prefix | 31 | 34 | 36 | 0.911 | 0 | 263 |

**Which differences are real?** With 51 or 36 questions, one question moves MRR by about 0.02, so each comparison was checked per question (wins/losses) with a 5,000-sample bootstrap 95% interval on the MRR difference (run 5/6 data; run 7's exclusions don't change Azure and move Algolia by under 0.02):

| Comparison | MRR diff | 95% CI | Wins / losses | Verdict |
|---|---|---|---|---|
| Agents: Azure hybrid vs Algolia (MCP settings) | +0.280 | +0.161 to +0.403 | 23 / 5 | **Real** |
| Agents: Azure keyword vs Algolia | +0.189 | +0.064 to +0.318 | 22 / 9 | Real |
| Agents: hybrid vs keyword (what vectors add) | +0.091 | +0.029 to +0.155 | 13 / 1 | Real |
| Agents: semantic ranker vs hybrid | −0.070 | −0.158 to +0.016 | 7 / 13 | No gain; leans worse |
| Agents: Algolia sections vs articles | +0.004 | −0.078 to +0.090 | 8 / 9 | No difference |
| Agents: typo/prefix on hybrid | +0.007 | −0.023 to +0.036 | 4 / 1 | No difference |
| Box: Azure keyword + typo/prefix vs Algolia | −0.007 | −0.102 to +0.087 | 4 / 4 | Tie |
| Box: Azure hybrid + typo/prefix vs Algolia | +0.024 | −0.077 to +0.126 | 5 / 3 | Tie |
| Box: plain Azure keyword vs Algolia | −0.169 | −0.310 to −0.037 | 2 / 10 | **Real (Azure worse)** |

### Can a score tell a chatbot "the docs don't cover this"? (commit 97f963e)

- Run 2 had one unanswerable question. Wrote 8 more (`probes.json`), each checked against the full indexed text, and dropped two candidates the docs do answer (on-premises installs: "Agility CMS can't be installed on-premises"; Kubernetes: an AKS deployment guide). Two are deliberate near-misses: the docs cover *editor* comments and *billing* credit cards, not reader comments or taking payments.
- Semantic reranker top score (0–4): the 9 unanswerable questions scored **1.96–2.62**; the 51 answerable scored **2.28 and up** (median 2.95).

| Refuse below | Unanswerable refused | Answerable wrongly refused |
|---|---|---|
| 2.0 | 1 / 9 | 0 / 51 |
| 2.2 | 5 / 9 | 0 / 51 |
| 2.3 | 7 / 9 | 1 / 51 |
| 2.4 | 8 / 9 | 3 / 51 |

- The scores overlap, so they're a signal, not a gate. The miss at 2.62 was "can I install wordpress plugins": the top hit was the WordPress migration guide, which mentions plugins. The wrongly refused answerable question at 2.28 was "what is your uptime sla", whose right page did rank first. A chatbot should combine the score with the model reading the fetched page and saying when it doesn't answer.

### End to end through the MCP

Two previews of the same code: the first build (made before the env vars existed) runs Algolia, the second runs Azure. 8 queries × 3 reps each, from a laptop, after a warm-up call. Calls tagged `user-agent: agility-search-eval/1.0` because previews send PostHog events.

| | `search_docs` p50 | p90 | `fetch_doc` |
|---|---|---|---|
| Algolia preview | 185 ms | 206 ms | 360–730 ms |
| Azure preview | 433 ms | 531 ms | 190–450 ms |

- Azure adds about 250 ms per search. For an agent that spends seconds per model turn, that doesn't matter.
- The output now shows **"Best match in section: Two SLAs, two purposes"** and **"Relevance: 2.28 of 4"**: the heading comes from the CRLF fix, the score from the semantic ranker.
- `fetch_doc` returned the same full Markdown (code included) from both, so the tool contract held.
- Not tested on the preview: the publish webhook updating Azure. Webhooks go to production, not previews.

### Operations and cost

- Build from the CMS: 128 s for 451 articles (2,431 sections) first time; 97 s to re-embed 3,597 sections; 2 s when nothing changed. Vercel's function limit (`maxDuration` 300 s) has room, and an interrupted run resumes because sections upload as they're embedded.
- Every hybrid query also costs one embedding call: the index's vectorizer embeds the query with Azure OpenAI each time. Cheap per call, but it's per keystroke if used behind a search box.
- **The free semantic plan is a failure mode, not just a limit.** After the monthly allowance, `queryType=semantic` requests return **HTTP 402**, and `searchAzure` always asks for semantic and doesn't fall back. On the free plan the MCP's search would start failing partway through a busy month. (This service is on the free plan; the eval runs on 2026-10-11 alone used about 500 semantic queries, half the monthly allowance.)
- Sizing: 4,877 sections with 3,072-dimension vectors fit easily on Basic (15 GB storage, 5 GB vector quota per partition).

## Conclusions (2026-10-11)

**Agents and the MCP's `search_docs`: switch to Azure hybrid, without the semantic ranker.** It's the only large, statistically clear gain in the whole project: the right page first for 40 of 51 questions instead of 25 (MRR 0.853 vs 0.587). Vectors are a real part of that. The semantic ranker isn't: no ranking gain, ~60 ms slower, billed per query, and on the free plan a source of hard failures. Typo/prefix rewriting adds nothing for sentence-style questions.

**People in the ⌘K search box: stay on Algolia.** On real search-box queries it ties the best Azure setup on quality and is 5× faster than hybrid (53 ms vs 263 ms per keystroke), with typo tolerance, prefix matching and click analytics built in. Plain Azure keyword search is clearly worse at half-typed words and typos; Azure only catches up with Lucene fuzzy/prefix rewriting. The ⌘K box's real problem was the CRLF bug: 284 of 451 live records have no headings. Reindexing `doc_site` with the fix is the search-box improvement to make.

**A future docs chatbot: retrieve with Azure hybrid; consider the semantic ranker only for its confidence score.** The score separates unanswerable questions imperfectly (refuse below ~2.3: 7 of 9 caught, 1 of 51 wrongly refused). If it's used, move to the standard semantic billing plan, and let the model make the final "not covered" call after reading the page.

**What changed since run 2, plainly:**
1. The semantic ranker's small win in run 2 didn't hold on the full CMS corpus. On run 2's `.md`-twin index it still scores 0.830; on the CMS-built index it's 0.796 against hybrid's 0.853.
2. Run 2's "splitting doesn't help Algolia" was measured with splitting broken for 211 of 451 articles. Re-measured with it fixed, it still doesn't help ranking (8 wins, 9 losses).
3. The published articles `developers/ai-search-explained` and `developers/azure-ai-search` quote run 2's numbers ("387 articles became 2,049 sections", the semantic ranker "fixed ordering"). They need updating, and they're also why three test questions are now in the corpus.

## 2026-10-13: shipping the line-ending fix to live search

- PR #74 merged (`90e59da`). Vercel's GitHub integration never built the merge: no deployment, no commit status, while the commit before it deployed normally. Production was started from the project's deploy hook for `main` instead. Lesson: after merging, check that the deploy actually happened before running anything that depends on it.
- Reindexed from the production deployment (`?targets=algolia,sections`, called on the deployment URL rather than through the apex domain's proxy): **19 s**, 451 articles to `doc_site`, 4,890 sections to `doc_site_sections`, nothing skipped.
- Live `doc_site` records with empty `headings`: **285 → 14**. The SLA page now has "Two SLAs, two purposes" and its other headings indexed.
- Search quality before and after, same scorer, same exclusions:

| Engine | Search-box set MRR, before → after | Agent set MRR, before → after |
|---|---|---|
| Algolia, search-box settings (⌘K) | 0.886 → 0.886 (no question changed) | 0.310 → 0.310 (one better, one worse) |
| Algolia `doc_site`, MCP settings | 0.821 → 0.821 (no question changed) | 0.606 → 0.602 (two each down one rank) |

- **Honest result: restoring the headings didn't measurably change ranking on these test sets.** The fix was still right (the records were missing data, and headings now show in results and match heading-only phrasing), but if the post makes the case for the fix, the case is data quality, not a ranking gain. It's the same pattern as chunking in run 7: correct structure, no score change.
- A Firefox check of ⌘K on production after the deploy ("web studio": 47 results, the right pages first) showed nothing search-related in the console. The console did show marketing-tag noise (blocked trackers, rejected cookies) and 11 images plus 3 fonts preloaded on `/docs` but not used within a few seconds.

## Open items

- [x] Merge the CRLF fix and the scorer changes, then reindex the live `doc_site` (done 2026-10-13, above).
- [ ] Code: let `searchAzure` run hybrid without the semantic ranker (or fall back to hybrid on a 402) before switching the MCP.
- [ ] Production switch: Azure env vars in Production, build a production index from the CMS (`agility-docs-sections` was built from `.md` twins with the CRLF bug), then `DOCS_SEARCH_ENGINE=azure`.
- [ ] Test the publish webhook → Azure path once production has the env vars.
- [ ] Update the two published search articles with the corrected findings.
- [ ] Have someone other than the author review the expected answers in all three test sets.
- [ ] Clean up when done: index `agility-docs-preview`, and the 9 Preview env vars scoped to `test/azure-search-preview`.
