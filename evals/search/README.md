# Docs search evaluation

A fixed test set for comparing docs search engines, and later for checking the docs chatbot's answers.

- `questions.json`: 52 questions, each listing every docs page that counts as a correct answer. Committed (d3846da) before any engine was scored. Sources: real docs searches (staff excluded), pages AI agents fetch, the most-read pages, agent-style phrasing, and one gap probe with no correct page.
- `score.mjs`: runs every question against each engine and reports hit@1/3/5 (the first correct page appears in the top 1, 3 or 5 distinct pages) and MRR@10. Read-only. Algolia is called directly with the docs MCP's settings, so runs never reach production analytics or alerts.

## Run 1 (2026-10-06)

| Engine | hit@1 | hit@3 | hit@5 | MRR@10 | Missed |
|---|---|---|---|---|---|
| Algolia, `doc_site` with the MCP settings from #71 | 25 | 33 | 36 | 0.577 | 15 |
| Azure AI Search, keyword only | 30 | 40 | 42 | 0.691 | 7 |
| Azure, keyword + vector | 36 | 43 | 48 | 0.795 | 2 |
| Azure, keyword + vector + semantic ranker | 35 | 47 | 49 | 0.810 | 1 |

Out of 51 answerable questions. Azure index: `agility-docs` on `agility-ai-search-dev`, 387 articles in 2,049 heading-level sections, `text-embedding-3-large` vectors.

### Caveats

- **Not a pure engine comparison.** The Azure index splits articles at headings and keeps code blocks. Algolia indexes whole articles from the CMS and strips code. Azure keyword-only already beats Algolia (0.691 vs 0.577), so roughly half the gap is how content is indexed, and the other half is vectors plus the semantic ranker (0.691 to 0.810).
- **Different sources.** Azure was filled from the live site's `.md` twins (what `llms.txt` lists). Algolia is filled from the CMS and can include pages `llms.txt` leaves out.
- **51 questions written by one person.** Have someone else review the expected answers, and grow the set from real agent queries.
- **One gap probe.** The semantic ranker gave it 1.94 out of 4, while every answerable question's top result scored 2.16 or more. That suggests a refusal threshold for a chatbot, but one probe is not enough to set one.
- Every engine missed question 19 ("what changed in the latest release"): the changelog page needs checking.
