# What we learned building AI search on the Agility docs (2026-10-06)

Source material for the docs articles on search and AI assistants. Every number here was measured on the Agility docs site itself; see `README.md` in this folder for the method and raw results.

## The setup
- Content: the Agility docs, 387 articles, managed in Agility CMS.
- Engines compared: Algolia (index `doc_site`, one record per article, code blocks stripped, body capped at 5,000 characters) and Azure AI Search (index `agility-docs`, one record per heading-level section, 2,049 sections, code blocks kept).
- Azure vectors: `text-embedding-3-large` (3,072 dimensions) on Azure OpenAI, with an integrated vectorizer on the index so queries are embedded by the search service itself. Each section is embedded with its context prefix: `Title > Heading` followed by the section text.
- Azure ranking: keyword (BM25, `en.microsoft` analyzer) + vector, fused, then the semantic ranker (`queryType: semantic`).
- Test set: 52 questions (real customer searches, pages AI agents fetch, most-read pages, agent-style phrasing, one question the docs cannot answer). Expected answers were committed to git before any engine was scored.

## Results (51 answerable questions, run 2, 2026-10-06)
| Engine | Right page first | In top 3 | In top 5 | MRR@10 | Missed |
|---|---|---|---|---|---|
| Algolia, one record per article | 25 | 33 | 36 | 0.577 | 15 |
| Algolia, one record per section (same settings) | 25 | 32 | 35 | 0.573 | 14 |
| Azure, keyword only, per section | 27 | 40 | 42 | 0.668 | 6 |
| Azure, keyword + vector | 36 | 44 | 47 | 0.801 | 2 |
| Azure, keyword + vector + semantic ranker | 37 | 47 | 49 | 0.830 | 1 |

Run 1 had no Algolia section index and slightly different Azure numbers (keyword 0.691, hybrid 0.795, semantic 0.810) from an earlier splitter; run 2 is the one to quote.

## Lessons (these are the points the articles should teach)
1. **Splitting into sections did not change Algolia's ranking.** One record per section scored the same as one per article (MRR 0.573 vs 0.577). Run 1 suggested "half the gap is how content is split"; run 2 measured it directly and that was wrong. The gain came from how results are ranked: keyword ranking that weighs rare words (BM25 in Azure) beat Algolia's tie-breaking ranking on question-style queries (0.668 vs 0.577), vectors added the most (0.801), and the semantic ranker added a little more (0.830). Sections are still worth it for other reasons: the hit lands on the passage that answers the question (better snippets, and a chatbot can quote it), long articles are not cut off, and code stays in.
2. **Keep code blocks.** Developer questions are often answered by code. Stripping code makes snippets prettier but loses answers.
3. **Don't cap the body.** A 5,000-character cap silently drops the end of long articles. Sections remove the need for a cap.
3a. **Check that a full reindex sees everything.** The docs' full reindex read categories through GraphQL without `take`, and GraphQL lists default to 50, so three categories came back with exactly 50 articles and 89 of 437 articles were missing. Because the reindex replaces the whole index, it would have deleted them from live search. Pass an explicit `take`, and refuse to replace an index when a list comes back at the limit.
4. **Agents and chatbots ask in sentences.** With Algolia's defaults every word must match, so "can I schedule content to publish later" returned 0 results. Four query settings fixed zero-result questions for agent traffic: `queryLanguages: ["en"]`, `removeStopWords: true`, `ignorePlurals: true`, `removeWordsIfNoResults: "allOptional"`. Use them for agent and chatbot queries; they also help people.
5. **Vectors fix vocabulary mismatch; the semantic ranker fixes ordering.** "Does agility support multiple languages" found nothing by keyword (the docs say "locales"); vectors found it. The semantic ranker moved the right page into the top 3 more often (44 to 47 of 51).
6. **Some misses are content gaps, not engine problems.** "How do I let editors click on the page to edit it" ranked poorly everywhere because the docs never use that phrase. Search analytics (zero-result and low-click queries) tell you which words to add to your content.
7. **A confidence score can tell a chatbot when to say "I don't know".** On the semantic ranker (0 to 4), every answerable question's top result scored at least 2.16; the question with no answer scored 1.94. That suggests a refusal threshold around 2.0, but it was one probe: calibrate on your own content with several no-answer questions before relying on it.
8. **Evaluate before you choose.** Write the questions and their correct pages first and commit them, then score each engine on hit@1/3/5 and MRR. Call the engine directly when testing so test runs don't pollute production analytics.
9. **Costs and limits to plan for (Azure).** Basic tier is the practical start. The free semantic ranker plan allows 1,000 semantic queries a month, which a public chatbot will exceed; plan for the standard semantic plan. Embedding 387 articles took about 8 minutes and costs cents. Prefer the search service's managed identity over an API key for the vectorizer in production.
10. **The MCP pattern.** The Agility Knowledgebase MCP server exposes two tools: `search_docs` (short queries, returns pages with snippets and ids) and `fetch_doc` (full content by id). A chatbot is an LLM calling those two tools, citing URLs, and refusing when search confidence is low. Keeping the tool contract stable lets the search engine behind it change (the docs site now switches between Algolia and Azure with one setting).

## Corrections after the preview test (2026-10-11)

Measured on a CMS-built index of all 451 articles (4,877 sections), with the fixes below. Full story in `JOURNAL.md`, run 7 in `README.md`.

- **Lesson 1 needs a caveat.** The section splitter ignored headings in every article saved with CRLF line endings (271 of 451): `.` in a regex doesn't match `\r`, so `^#{2,3}\s+(.+)$` never matched. 211 articles were cut into 2,400-character chunks with no heading, and 284 of 451 live `doc_site` records had no `headings`. Re-measured with that fixed, splitting still doesn't change Algolia's ranking (8 questions better, 9 worse). The lesson stands; the evidence in run 2 didn't support it.
- **Lesson 5's semantic-ranker claim didn't hold.** On the full CMS corpus, hybrid + semantic scored 0.796 against hybrid's 0.853 (hit@1 34 vs 40; 7 questions better, 13 worse). Vectors are the real gain (+0.09 over keyword, statistically clear). Use the semantic ranker for its score, not its ordering, and test it on your own corpus.
- **Lesson 7, re-measured with 9 unanswerable questions instead of 1:** unanswerable questions scored 1.96–2.62, answerable 2.28 and up. Refusing below 2.3 catches 7 of 9 and wrongly refuses 1 of 51. A useful signal, not a gate.
- **Lesson 9, add:** on the free semantic plan, requests past the monthly allowance return HTTP 402. Code that always asks for semantic ranking needs a fallback, or the standard plan.
- **New: the search box is a different problem.** On 36 real search-box queries (short, typos, half-typed), Algolia's defaults tie Azure's best setup and are 5× faster per keystroke. Plain Azure keyword misses half-typed words; it needs Lucene fuzzy/prefix rewriting to compete. Keep Algolia for ⌘K; use Azure hybrid for agents.
- **New: publishing your results contaminates your test.** The docs articles about this work quote three test questions verbatim, and Algolia started ranking those articles first for them. Exclude such pages when scoring, or write fresh questions.
- **New: read your index, not just your metrics.** The CRLF bug only showed up when reading one page's stored sections; every aggregate number looked plausible.
