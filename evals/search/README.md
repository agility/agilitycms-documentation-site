# Docs search evaluation

Fixed test sets for comparing docs search engines, and later for checking the docs chatbot's answers. The dated story of how these results came about, dead ends included, is in `JOURNAL.md`.

- `questions.json`: 52 agent-style questions, each listing every docs page that counts as a correct answer. Committed (d3846da) before any engine was scored. Sources: real docs searches (staff excluded), pages AI agents fetch, the most-read pages, agent-style phrasing, and one gap probe with no correct page.
- `searchbox.json`: 36 search-box queries: 28 copied as typed from 90 days of Algolia analytics (typos and half-typed words included), 8 real queries cut off mid-word. Committed (ca8a134) before scoring.
- `probes.json`: 15 questions the docs don't answer (with question 52 in `questions.json`, 16 in all), checked against the full indexed text, for calibrating a chatbot's "not covered" threshold. The first 8 were committed (97f963e) before scoring, and 7 more (7d0d1b1) before the 2026-10-15 rerun. Refusing below 2.3 caught 11 of 16, and wrongly refused 1 of 51 answerable questions (JOURNAL.md, 2026-10-15).
- `score.mjs`: runs a set against each engine and reports hit@1/3/5 (the first correct page is in the top 1, 3 or 5 distinct pages), MRR@10 and p50/p95 latency. Read-only, and sends `analytics: false` so runs stay out of Algolia's search analytics.

```
ALGOLIA_APP_ID=… ALGOLIA_SEARCH_KEY=… AZURE_SEARCH_NAME=… AZURE_SEARCH_KEY=… AZURE_SEARCH_INDEX=… \
node evals/search/score.mjs [--set searchbox.json] [--engines "azure hybrid,algolia search box"] \
  [--exclude developers/ai-search-explained,…] [--json out.json]
```

Engines: `algolia search box` (exactly what the ⌘K modal sends), `algolia per article` / `algolia per section` (the MCP's sentence settings from #71), `azure keyword`, `azure keyword + prefix` (Lucene: one typo per word, prefix on the last), `azure hybrid` (keyword + vector), `azure hybrid + prefix`, `azure hybrid + semantic`.

**Exclude the pages written about this evaluation.** `developers/ai-search-explained`, `developers/algolia`, `developers/azure-ai-search`, `developers/indexing-content-for-search` and `developers/build-an-mcp-server-for-your-content` quote test questions verbatim; pass them to `--exclude`.

## Run 7 (2026-10-11, current)

Azure index `agility-docs-preview`: built from the CMS by the site's reindex route on a preview deploy, 451 articles in 4,877 sections, with the CRLF heading fix. The five pages above excluded.

| Engine | Agent set MRR@10 (51) | hit@1 | Missed | Search-box MRR@10 (36) | Missed | p50 ms |
|---|---|---|---|---|---|---|
| Algolia, search-box settings | 0.291 | 13 | 33 | **0.886** | 0 | 46–53 |
| Algolia `doc_site`, MCP settings | 0.587 | 25 | 13 | 0.821 | 2 | 53 |
| Algolia `doc_site_sections` | 0.594 | 25 | 12 | 0.872 | 2 | 45 |
| Azure keyword | 0.762 | 32 | 3 | 0.718 | 9 | 60–67 |
| Azure keyword + prefix | 0.741 | 30 | 2 | 0.884 | 1 | 72–117 |
| Azure hybrid | **0.853** | 40 | 2 | 0.824 | 1 | 224–266 |
| Azure hybrid + prefix | 0.859 | 40 | 2 | 0.911 | 0 | 263–311 |
| Azure hybrid + semantic | 0.796 | 34 | 2 | (not rerun) | | 330 |

Per-question bootstrap intervals: Azure hybrid beats Algolia for agents (+0.28 MRR, 95% CI +0.16 to +0.40). The semantic ranker gives no ranking gain over hybrid (−0.07, CI −0.16 to +0.02). On search-box queries, Algolia and Azure with prefix rewriting are tied; plain Azure keyword is clearly worse. Details, and the refusal-threshold results from `probes.json`, in `JOURNAL.md`.

## Run 2 (2026-10-06, superseded)

| Engine | hit@1 | hit@3 | hit@5 | MRR@10 | Missed |
|---|---|---|---|---|---|
| Algolia `doc_site`, one record per article | 25 | 33 | 36 | 0.577 | 15 |
| Algolia `doc_site_sections`, one record per section | 25 | 32 | 35 | 0.573 | 14 |
| Azure `agility-docs-sections`, keyword only | 27 | 40 | 42 | 0.668 | 6 |
| Azure, keyword + vector | 36 | 44 | 47 | 0.801 | 2 |
| Azure, keyword + vector + semantic ranker | 37 | 47 | 49 | 0.830 | 1 |

Note (2026-10-11): runs 1 and 2 were measured while 211 of 451 articles weren't split at their headings at all (a CRLF line-ending bug), and before the docs articles about this work put three test questions into the corpus. Run 7 re-measures both.

Splitting by section left Algolia's ranking unchanged, which disproves run 1's guess that half the gap came from splitting. The difference is the ranking method. The Algolia section index was built by the PR's own reindex route from the CMS (437 articles, 2,355 sections) after fixing a 50-article GraphQL cap that had dropped 89 articles.

## Run 1 (2026-10-06, superseded)

| Engine | hit@1 | hit@3 | hit@5 | MRR@10 | Missed |
|---|---|---|---|---|---|
| Algolia, `doc_site` with the MCP settings from #71 | 25 | 33 | 36 | 0.577 | 15 |
| Azure AI Search, keyword only | 30 | 40 | 42 | 0.691 | 7 |
| Azure, keyword + vector | 36 | 43 | 48 | 0.795 | 2 |
| Azure, keyword + vector + semantic ranker | 35 | 47 | 49 | 0.810 | 1 |

Out of 51 answerable questions. Azure index: `agility-docs` on `agility-ai-search-dev`, 387 articles in 2,049 heading-level sections, `text-embedding-3-large` vectors.

### Caveats

- **Not a pure engine comparison.** The Azure index splits articles at headings and keeps code blocks; Algolia indexed whole articles. (Run 2 measured Algolia per section too: no change, so the gap is the ranking method, not the splitting.)
- **Different sources.** Azure was filled from the live site's `.md` twins (what `llms.txt` lists). Algolia is filled from the CMS and can include pages `llms.txt` leaves out.
- **51 questions written by one person.** Have someone else review the expected answers, and grow the set from real agent queries.
- **One gap probe.** The semantic ranker gave it 1.94 out of 4, while every answerable question's top result scored 2.16 or more. That suggests a refusal threshold for a chatbot, but one probe is not enough to set one.
- Every engine missed question 19 ("what changed in the latest release"): the changelog page needs checking.
