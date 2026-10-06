# What we learned building AI search on the Agility docs (2026-10-06)

Source material for the docs articles on search and AI assistants. Every number here was measured on the Agility docs site itself; see `README.md` in this folder for the method and raw results.

## The setup
- Content: the Agility docs, 387 articles, managed in Agility CMS.
- Engines compared: Algolia (index `doc_site`, one record per article, code blocks stripped, body capped at 5,000 characters) and Azure AI Search (index `agility-docs`, one record per heading-level section, 2,049 sections, code blocks kept).
- Azure vectors: `text-embedding-3-large` (3,072 dimensions) on Azure OpenAI, with an integrated vectorizer on the index so queries are embedded by the search service itself. Each section is embedded with its context prefix: `Title > Heading` followed by the section text.
- Azure ranking: keyword (BM25, `en.microsoft` analyzer) + vector, fused, then the semantic ranker (`queryType: semantic`).
- Test set: 52 questions (real customer searches, pages AI agents fetch, most-read pages, agent-style phrasing, one question the docs cannot answer). Expected answers were committed to git before any engine was scored.

## Results (51 answerable questions)
| Engine | Right page first | In top 3 | In top 5 | MRR@10 | Missed |
|---|---|---|---|---|---|
| Algolia, one record per article | 25 | 33 | 36 | 0.577 | 15 |
| Azure, keyword only, per section | 30 | 40 | 42 | 0.691 | 7 |
| Azure, keyword + vector | 36 | 43 | 48 | 0.795 | 2 |
| Azure, keyword + vector + semantic ranker | 35 | 47 | 49 | 0.810 | 1 |

## Lessons (these are the points the articles should teach)
1. **How you split content matters as much as the engine.** Keyword search alone over heading-level sections beat Algolia over whole articles (MRR 0.691 vs 0.577). About half the improvement came from indexing sections instead of whole articles; the other half came from vectors plus the semantic ranker. Index one record per section (split at H2/H3), keep a parent id, and collapse results to one per page when showing them.
2. **Keep code blocks.** Developer questions are often answered by code. Stripping code makes snippets prettier but loses answers.
3. **Don't cap the body.** A 5,000-character cap silently drops the end of long articles. Sections remove the need for a cap.
4. **Agents and chatbots ask in sentences.** With Algolia's defaults every word must match, so "can I schedule content to publish later" returned 0 results. Four query settings fixed zero-result questions for agent traffic: `queryLanguages: ["en"]`, `removeStopWords: true`, `ignorePlurals: true`, `removeWordsIfNoResults: "allOptional"`. Use them for agent and chatbot queries; they also help people.
5. **Vectors fix vocabulary mismatch; the semantic ranker fixes ordering.** "Does agility support multiple languages" found nothing by keyword (the docs say "locales"); vectors found it. The semantic ranker moved the right page into the top 3 more often (43 to 47 of 51).
6. **Some misses are content gaps, not engine problems.** "How do I let editors click on the page to edit it" ranked poorly everywhere because the docs never use that phrase. Search analytics (zero-result and low-click queries) tell you which words to add to your content.
7. **A confidence score can tell a chatbot when to say "I don't know".** On the semantic ranker (0 to 4), every answerable question's top result scored at least 2.16; the question with no answer scored 1.94. That suggests a refusal threshold around 2.0, but it was one probe: calibrate on your own content with several no-answer questions before relying on it.
8. **Evaluate before you choose.** Write the questions and their correct pages first and commit them, then score each engine on hit@1/3/5 and MRR. Call the engine directly when testing so test runs don't pollute production analytics.
9. **Costs and limits to plan for (Azure).** Basic tier is the practical start. The free semantic ranker plan allows 1,000 semantic queries a month, which a public chatbot will exceed; plan for the standard semantic plan. Embedding 387 articles took about 8 minutes and costs cents. Prefer the search service's managed identity over an API key for the vectorizer in production.
10. **The MCP pattern.** The Agility Knowledgebase MCP server exposes two tools: `search_docs` (short queries, returns pages with snippets and ids) and `fetch_doc` (full content by id). A chatbot is an LLM calling those two tools, citing URLs, and refusing when search confidence is low. Keeping the tool contract stable lets the search engine behind it change (the docs site now switches between Algolia and Azure with one setting).
