---
title: "Measure your search before you change it"
published: false
description: "Write 30 real questions and their right answers, score your search, then change one thing at a time. We did it with 52 questions, and it overturned our own theory."
tags: search, ai, webdev, javascript
series: Expect More From Your Website
---

<!-- OUTLINE. Sources: evals/search/README.md, evals/search/FINDINGS.md, evals/search/score.mjs, evals/search/questions.json. -->

## The standard

Before you change your search (new engine, new settings, AI on top), you should have a fixed test set and a score, so you know whether the change helped.

## The 10-minute check

- Do you have a written list of questions with the page that correctly answers each one?
- Could you say, with a number, whether your search got better or worse last quarter?

## Why it usually fails

- Search changes get judged by trying a few queries and deciding it "feels better".
- The people testing already know the right words, so they never type what a newcomer would.

## How to fix it

1. **Write 30 to 50 questions** from real sources: support tickets, site search logs, the pages agents fetch most, plus a couple of questions your content cannot answer.
2. **Write down every correct page for each question, and commit it before you score anything,** so you cannot quietly adjust the answers to fit the results.
3. **Score each engine on the same questions:**
   - How often the right page comes first.
   - How often it is in the top 3 and top 5.
   - Mean reciprocal rank (MRR): one number that rewards putting the right page near the top.
4. **Change one thing at a time** and rescore.
5. Code example: a short version of our scoring script, about 40 lines.

## What happened when we tried it

52 questions, 51 with a correct page:

| Setup | Right page first | In top 3 | MRR |
|---|---|---|---|
| Keyword search, one record per article | 25 | 33 | 0.577 |
| Keyword search, one record per section | 25 | 32 | 0.573 |
| Better keyword ranking (BM25), per section | 27 | 40 | 0.668 |
| Keyword + vector (hybrid) | 36 | 44 | 0.801 |
| Hybrid + semantic reranker | 37 | 47 | 0.830 |

- What we got wrong: after the first run we wrote "about half the gap comes from splitting pages into sections". The second run measured that directly: splitting changed nothing. The gain came from how results were ranked. We corrected our notes and the articles that repeated the claim.
- Another lesson: every engine missed "what changed in the latest release". That was a content and indexing problem, not an engine problem.

## Human angle

The test set is just a list of what your readers need. Writing it is useful even if you never change engines.

## Open

- Decide whether to publish the question set itself (it is in the repo) as a template readers can copy.
- Keep cost notes short: basic search tier, embeddings cost cents for a few hundred pages, and a semantic reranker's free tier runs out quickly with real traffic.
