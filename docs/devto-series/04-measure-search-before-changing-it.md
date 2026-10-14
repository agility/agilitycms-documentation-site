---
title: "Measure your search before you change it"
published: false
description: "Write 30 real questions and their right answers, score your search, then change one thing at a time. We did it with 52 questions, and it overturned our own theory."
tags: search, ai, webdev, javascript
series: Expect More From Your Website
---

<!--
DRAFT 1. Joel: rewrite the opening and the closing in your own voice.
Sources: evals/search/README.md (run 2 and run 7), evals/search/FINDINGS.md, evals/search/JOURNAL.md, evals/search/score.mjs, evals/search/questions.json, lib/search/azure.ts.
Open: decide whether to link the question set in the repo as a template readers can copy.
-->

Every search change I have ever seen approved was approved the same way. Someone typed four or five queries into the new version, looked at the results, and said "that feels better".

I have done it myself. It is not a measurement. The person typing already knows the right words, picks queries they expect to work, and stops when they are happy.

This post is about replacing that feeling with a number. It is the cheapest thing in this series, and it changed my mind more than anything else we did.

## The standard

**Before you change your search (a new engine, new settings, AI on top), you should have a fixed set of test questions and a score, so you know whether the change helped.**

## The 10-minute check

You need a spreadsheet and your own site search. Nothing else.

1. **Write 10 questions** your readers actually ask. Take them from support tickets, sales calls or your search logs. Write them the way a newcomer would, as a full sentence.
2. **Next to each question, write the URL of every page that correctly answers it.** Do this before you search, not after.
3. **Type each question into your site search.** Record the position of the first correct page in the results. Leave it blank if it is not in the top 10.
4. **Count three things:** how many questions had the right page first, how many had it in the top 3, and how many had no right page at all.
5. **Save the sheet with today's date.** That is your baseline.

If you cannot do step 2 because nobody knows which page answers the question, you have found a content problem before you have even reached search.

## Why it usually fails

Not because developers are careless. Because of how search work gets scheduled and judged:

- **There is no test set to start with.** Search ships with a site and gets tuned later, under deadline, by whoever is free.
- **The testers know too much.** People who wrote the docs type the words the docs use. A newcomer types "multiple languages" when your pages say "locales".
- **Answers drift to fit results.** If you decide what counts as correct after you see the results, you will quietly accept whatever came back.
- **Vendors demo with their own queries.** A demo shows that an engine can work, not that it works on your content.

## How to fix it

### The principle

1. **Write 30 to 50 questions** from real sources: support tickets, site search logs, the pages AI agents fetch most, plus one or two your content cannot answer.
2. **Write down every correct page for each question, and commit the file before you score anything.** Version control is your witness that you did not adjust the answers to fit the results.
3. **Score every option on the same questions,** with the same few numbers.
4. **Change one thing at a time** and score again.
5. **Keep test runs out of your analytics,** or your own testing shows up as "real" searches.

### The numbers, in plain English

- **hit@1, hit@3, hit@5:** for how many questions the first correct page appears in the top 1, 3 or 5 results. hit@1 is "found it on the first try".
- **MRR (mean reciprocal rank):** for each question, score 1 if the right page is first, 1/2 if it is second, 1/3 if third, and 0 if it is missing from the top 10. Then take the average. One number between 0 and 1 that rewards putting the right page near the top.

You can compute both in a spreadsheet. A script just lets you run it every time you change something.

### What we used

Our docs run on Agility CMS, which I co-founded, with a Next.js front end on Vercel. Search was Algolia. We wanted to know whether Azure AI Search, with Azure OpenAI embeddings, would answer questions better, especially questions from AI agents.

The test set is a JSON file. Each question lists every page that counts as correct, and where the question came from:

```json
{ "id": 1, "source": "agent-style", "q": "can I schedule content to publish later", "expect": ["editors/scheduling", "editors/schedule-content-changes"] },
```

52 questions, 51 with a correct page. The one without is a gap probe: a question nothing in the docs answers, to see whether an engine admits it has nothing. The file was committed before any engine was scored.

The scoring script runs each question against each engine and records the rank of the first correct page. Trimmed:

```js
const K = 10;
// ...
const rankOf = (pages, expect) => {
	const i = pages.findIndex((p) => expect.includes(p));
	return i === -1 ? null : i + 1;
};

const rows = [];
for (const q of questions) {
	const row = { id: q.id, q: q.q, source: q.source, expect: q.expect, engines: {} };
	for (const [name, run] of Object.entries(engines)) {
		const t0 = performance.now();
		const r = await run(q.q);
		const ms = performance.now() - t0;
		row.engines[name] = { rank: rankOf(r.pages, q.expect), top3: r.pages.slice(0, 3), topScore: r.top, ms };
	}
	rows.push(row);
}

const answerable = rows.filter((r) => r.expect.length);
// ...
for (const name of Object.keys(engines)) {
	const ranks = answerable.map((r) => r.engines[name].rank);
	const at = (n) => ranks.filter((x) => x && x <= n).length;
	const mrr = ranks.reduce((s, x) => s + (x ? 1 / x : 0), 0) / ranks.length;
	// ...
}
```

Each engine is a small function that takes a question and returns a list of page paths. The script calls the engines directly, not through the live site, and tells Algolia not to record the query:

```js
body: JSON.stringify({
	query: q,
	hitsPerPage: K + excluded.size, // room for excluded pages
	attributesToRetrieve: ["url"],
	// ...
	analytics: false,
	clickAnalytics: false,
}),
```

The three Azure setups differ by a line or two of the request body:

```js
const body = { search: fuzzy ? typeAhead(q) : q, select: "url", top: 50 };
// ...
if (mode !== "keyword" && mode !== "prefix") body.vectorQueries = [{ kind: "text", text: q, fields: env("AZURE_VECTOR_FIELD") || "bodyVector", k: 50 }];
if (mode === "semantic") Object.assign(body, { queryType: "semantic", semanticConfiguration: "docs-semantic" });
```

What those three modes mean:

- **Keyword (BM25).** BM25 is the classic keyword ranking formula. It gives more weight to rare words than common ones, and adjusts for how long a page is. A match on "webhook" counts for more than a match on "content".
- **Hybrid.** Keyword search plus vector search, with the two result lists merged. Vector search uses **embeddings**: a model turns each piece of text into a long list of numbers, so that texts with similar meaning end up close together. We used Azure OpenAI's `text-embedding-3-large`, which produces 3,072 numbers per section. A question is embedded the same way, and the search finds the sections nearest to it in meaning, even when they share no words.
- **Hybrid + semantic reranker.** After hybrid search, a language model rereads the top 50 results against the question, reorders them, and gives each a score from 0 to 4.

None of this is Azure-specific. Elasticsearch and OpenSearch rank keywords with BM25, and Typesense, Meilisearch and OpenSearch all offer vector or hybrid search. The scoring script does not care which engine sits behind the function.

## What happened when we tried it

Here is the run we quoted first (run 2), out of 51 answerable questions:

| Setup | hit@1 | hit@3 | hit@5 | MRR@10 |
|---|---|---|---|---|
| Algolia, one record per article | 25 | 33 | 36 | 0.577 |
| Algolia, one record per section | 25 | 32 | 35 | 0.573 |
| Azure, keyword only (BM25) | 27 | 40 | 42 | 0.668 |
| Azure hybrid (keyword + vector) | 36 | 44 | 47 | 0.801 |
| Azure hybrid + semantic reranker | 37 | 47 | 49 | 0.830 |

The right page first for 25 questions became 37. That is the number that justified the work.

### What we got wrong

After our first run, the Azure index split articles at their headings and Algolia stored whole articles. Azure won, and I wrote down a theory: "about half the gap is how content is split". It sounded right. It is the kind of thing that ends up in a blog post.

So we tested it. We built a second Algolia index split into sections exactly like Azure's, and scored it. That is the second row of the table. Splitting changed nothing: 0.577 against 0.573. The gain came from how results were ranked. BM25 beat Algolia's ranking on question-style queries, vectors added the most, and the reranker added a little. If we had not scored the theory, I would have published advice that was simply wrong. We corrected our notes and the docs articles that repeated it.

### And then the table itself needed a correction

Measuring once is not the end. Five days later, while looking at one page's stored records, we found that the splitter ignored headings in every article saved with Windows line endings (post 5 has that story). Run 2 had been measured while 211 of our 451 articles were not split at their headings at all.

We fixed it, rebuilt the index from the CMS, excluded five pages that now quoted our test questions word for word, and scored again. Splitting still made no difference to Algolia, so the lesson survived. But one claim did not: on the full corpus, hybrid with the semantic reranker scored 0.796 against plain hybrid's 0.853. The reranker had made ranking worse. We still run it, but for its score, not its order: the agent search re-sorts its results back into hybrid order and keeps the 0 to 4 score, which is useful for deciding when an assistant should say "I don't know" (post 7). The comment in `lib/search/azure.ts` now records why.

Along the way I also found a bug in our own scorer: one engine was quietly sending the vector query, so a "keyword" row was really hybrid. Test your test harness too.

### What the questions taught us about content

- "Does Agility support multiple languages" found nothing by keyword, because the docs say "locales". Vectors found it.
- "How do I let editors click on the page to edit it" ranked poorly on every engine. The docs never use those words. That is a content gap, not an engine problem.
- Every engine missed "what changed in the latest release". No engine fixes a page that does not answer the question.

### What Algolia did well

The agent questions are sentences. People in a search box type two words and a typo. We built a second test set of 36 real search-box queries, copied as typed from our Algolia analytics, and Algolia's defaults tied Azure's best setup on it while answering about five times faster. So the search box stayed on Algolia, and Azure hybrid serves agents. One test set would have told us to switch everything.

### Costs

- Azure AI Search on the **Basic** tier.
- Embedding the whole docs set took about **8 minutes** the first time and cost **cents**.
- After storing a hash of each section and skipping unchanged ones, a full rebuild took a little over **two minutes**, and a rebuild with no changes took **2 seconds**.
- The free semantic reranker plan allows **1,000 queries a month**. Each full test run uses one per question (52, or 60 once we added eight more no-answer probes), the allowance is shared with production searches, and past the allowance the service returns HTTP 402, so code that always asks for reranking needs a fallback.

## For people, too

The test set is a list of what your readers need, in their words, with the page that should answer each one. Writing it is worth doing even if you never change engines. Ours turned up a missing changelog answer, a feature the docs describe in words nobody searches for, and a search box that was fine as it was. All three help the person typing, not just the agent.

## Your turn

If you scored your site search tomorrow on 10 real questions, how many do you think would have the right page first? Write your guess in the comments before you run the check, then tell me the real number.

Next in the series: **Your build should not be able to quietly delete content**

*Parts of this work were done with an AI coding agent. The numbers are from our own measurements, and the mistakes are ours.*
