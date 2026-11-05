---
title: "Measure your search before you change it"
published: false
description: "Write 30 real questions and their right answers, score your search, then change one thing at a time. We did it with 52 questions, and it overturned our own theory."
tags: search, ai, webdev, javascript
series: Expect More From Your Website
---

<!--
DRAFT 2 (voice pass). Sources: evals/search/README.md (run 2 and run 7), evals/search/FINDINGS.md, evals/search/JOURNAL.md, evals/search/score.mjs, evals/search/questions.json, lib/search/azure.ts.
Open: decide whether to link the question set in the repo as a template readers can copy.
-->

Every search change I've ever seen get approved got approved the same way. Somebody typed 4 or 5 queries into the new version, looked at the results, and said "yeah, that feels better". Hand it off to a manager or a few peers, and they do the same. Sometimes there's some more automated unit tests or integration tests, but search can be tricky to test and evaluate that way.

It's kinda hard to measure search performance if you aren't an expert in it (and I am NOT!)

It's wierd though - the person typing already knows the right words, picks queries they expect to work, and stops as soon as they're happy.

This post is about swapping that *feeling* for a *number(). It's the most obvious thing in this whole series, and it changed my mind on how we track stuff in our sites.

![MRR at 10 on 51 answerable questions, run 7. Algolia one record per article 0.587. Algolia one record per section 0.594, so splitting changed nothing. Azure keyword only 0.762. Azure hybrid 0.853, the best. Azure hybrid plus semantic reranker 0.796, so the reranker made ranking worse.](img/out/04-measure-search-before-changing-it.gif)

## The standard

**Before you change your search (a new engine, new settings, AI on top), you should have a fixed set of test questions and a score - so you actually KNOW whether the change helped.**

## The 10-minute check

You don't need any fancy tools for this one, just a spreadsheet and your own site search.

1. **Write 10 questions** your readers actually ask. Pull them from support tickets, sales calls or your search logs, and write them the way a newcomer would, as a full sentence.
2. Next to each one, write the URL of every page that correctly answers it. **Do this BEFORE you search.**
3. Type each question into your site search and jot down the position of the first correct page. If it isn't in the top 10, leave it blank.
4. Count 3 things: how many questions had the right page first, how many had it in the top 3, and how many had no right page at all.
5. **Save the sheet with today's date.** That's your baseline!

Stuck on step 2 because nobody knows which page answers the question? Well... then you've found a content problem before you've even gotten to search.

## Why nobody measures search

<!-- JOEL: A specific memory: a search (or any feature) you approved on vibes, at Agility or for a client, and how it turned out. -->

Developers aren't being lazy here - it's really about the way search work gets scheduled and judged.

For starters, there's usually no test set at all. Search ships with the site and gets tuned later, under a deadline, by whoever's free.

Then the people testing it know too much. Whoever wrote the docs types the words the docs use, of course, while a newcomer types "multiple languages" when your pages say "locales" (more on that one later).

The answers drift, too. If you decide what counts as "correct" *after* you've seen the results, you'll quietly accept whatever came back, and you won't even notice you're doing it.

And vendors demo with their own queries. A demo shows that an engine CAN work... it doesn't show that it works on *your* content.

## Building a test you can't fudge

The recipe is pretty simple - it's the same idea as the 10-minute check, just bigger:

1. Write 30 to 50 questions from real sources (support tickets, site search logs, the pages AI agents fetch most), plus 1 or 2 that your content can't answer.
2. Write down every correct page for each question, and **commit the file before you score anything.** Version control is your witness that you didn't nudge the answers to fit the results (even a little bit).
3. Score every option on the same questions, with the same few numbers.
4. Change ONE thing at a time, then score again.
5. Keep test runs out of your analytics, or your own testing shows up as "real" searches.

### hit@1 and MRR, without the math class

The numbers here sound scarier than they are, I promise.

hit@1, hit@3 and hit@5 count the questions where the first correct page shows up in the top 1, 3 or 5 results. hit@1 is basically "found it on the first try".

MRR (mean reciprocal rank) is one number between 0 and 1 that rewards putting the right page near the top. For each question you score 1 if the right page is first, 1/2 if it's second, 1/3 if it's third... and 0 if it's not in the top 10 at all. Then you take the average.

You can totally work out both in a spreadsheet. A script just means you can rerun them every single time you change something, and trust me, you're gonna wanna change things.

### What we pointed it at

Our docs run on Agility CMS, with a Next.js front end on Vercel. (BTW, I've been at Agility for 21 years, so I'm not exactly a neutral party.) Search was Algolia. What we wanted to know was whether Azure AI Search, with Azure OpenAI embeddings, would answer questions better - especially the questions coming from AI agents, which are usually full sentences.

The test set is just a JSON file, nothing fancy. Each question lists every page that counts as correct, plus where the question came from:

```json
{ "id": 1, "source": "agent-style", "q": "can I schedule content to publish later", "expect": ["editors/scheduling", "editors/schedule-content-changes"] },
```

There are 52 questions, and 51 of them have a correct page. The odd one out is a gap probe: a question nothing in the docs answers, there to see whether an engine will admit it's got nothing. We committed the file before we scored a single engine.

The scoring script runs every question against every engine and records the rank of the first correct page. Here's a trimmed version:

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

Each engine is a little function that takes a question and hands back a list of page paths. The script calls the engines directly, without going through the live site, and tells Algolia not to record the query (that's step 5 from the recipe):

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

The 3 Azure setups only differ by a line or two of the request body, which made them really easy to compare:

```js
const body = { search: fuzzy ? typeAhead(q) : q, select: "url", top: 50 };
// ...
if (mode !== "keyword" && mode !== "prefix") body.vectorQueries = [{ kind: "text", text: q, fields: env("AZURE_VECTOR_FIELD") || "bodyVector", k: 50 }];
if (mode === "semantic") Object.assign(body, { queryType: "semantic", semanticConfiguration: "docs-semantic" });
```

So... what do those modes actually do?

- **Keyword (BM25).** BM25 is the classic keyword ranking formula. Rare words count for more than common ones, and it adjusts for how long a page is, so a match on "webhook" counts for more than a match on "content".
- **Hybrid.** This is keyword search plus vector search, with the two result lists merged. Vector search uses **embeddings** - a model turns each chunk of text into a long list of numbers, so text with a similar meaning ends up close together. We used Azure OpenAI's `text-embedding-3-large`, which spits out 3,072 numbers per section (yes, per section!). The question gets embedded the same way, and the search finds the sections closest to it in meaning, even when they don't share a single word.
- **Hybrid + semantic reranker.** After the hybrid search, a language model rereads the top 50 results against the question, reorders them, and gives each one a score from 0 to 4.

You don't need Azure for any of this. Elasticsearch and OpenSearch rank keywords with BM25, and Typesense, Meilisearch and OpenSearch all do vector or hybrid search - heck, the scoring script doesn't care what engine sits behind the function, and that's kinda the whole point of it.

## What the scores said

So, did it work? Here's the run we quoted first (run 2), out of 51 answerable questions:

| Setup | hit@1 | hit@3 | hit@5 | MRR@10 |
|---|---|---|---|---|
| Algolia, one record per article | 25 | 33 | 36 | 0.577 |
| Algolia, one record per section | 25 | 32 | 35 | 0.573 |
| Azure, keyword only (BM25) | 27 | 40 | 42 | 0.668 |
| Azure hybrid (keyword + vector) | 36 | 44 | 47 | 0.801 |
| Azure hybrid + semantic reranker | 37 | 47 | 49 | 0.830 |

At the time, the right page first went from 25 questions to 37, and that's the number that justified all the work. (Spoiler: this table needed a correction later... keep reading.)

### The theory that didn't survive

<!-- JOEL: How sure were you about the splitting theory before you measured it? Did it end up in a doc, a Slack message, a customer conversation? -->

After our first run, the Azure index split articles at their headings, and Algolia stored whole articles. Azure won, and I wrote down a theory: "about half the gap is how content is split". It sounded right to me, and it's exactly the kind of thing that ends up in a blog post (like, say, this one).

So we tested it. We built a second Algolia index, split into sections exactly like Azure's, and scored it - that's the second row of the table. Splitting changed NOTHING: 0.577 against 0.573.

The gain came from how results were ranked. BM25 beat Algolia's ranking on question-style queries, vectors added the most, and the reranker added a little (or so we thought at the time). If we hadn't scored my theory, I'd have published advice that was flat-out wrong. We fixed our notes, and the docs articles that repeated it.

### Then the table needed fixing too

5 days later, while we were looking at one page's stored records, we found that the splitter ignored the headings in every article saved with Windows line endings (post 5 has that story). So run 2 had been measured while 211 of our 451 articles weren't split at their headings AT ALL. Not great...

We fixed it, rebuilt the index from the CMS, excluded 5 pages that now quoted our test questions word for word, and scored again. Splitting still made no difference to Algolia, so that finding held up. One claim didn't, though - on the full corpus, hybrid with the semantic reranker scored 0.796, and plain hybrid scored 0.853. The reranker had made the ranking WORSE.

We still run it, but just for the score. The agent search re-sorts its results back into hybrid order and keeps the 0 to 4 score, which is really handy for deciding when an assistant should say "I don't know" (that's post 7). The comment in `lib/search/azure.ts` now records why, so the next person doesn't have to figure it out all over again.

And along the way, I found a bug in our own scorer - one engine was quietly sending the vector query, so a "keyword" row was really hybrid. Test your test harness too!

### The questions found content problems

The test set also pointed at problems in our *content*, which no amount of engine tuning was gonna fix:

- "Does Agility support multiple languages" found nothing by keyword, because the docs say "locales". Vectors found it.
- "How do I let editors click on the page to edit it" ranked poorly on every engine. The docs never use those words, so that's a gap in the content, and no engine setting is going to fill it.
- Every engine missed "what changed in the latest release". No engine can fix a page that doesn't answer the question!

### Where Algolia won

<!-- JOEL: Your honest opinion of Algolia after all this. You've used it for years, so readers will want to know if you'd still pick it. -->

The agent questions are full sentences, but people in a search box type 2 words and a typo (we all do it). So we built a second test set: 36 real search-box queries, copied exactly as typed from our Algolia analytics. On that set, Algolia's defaults tied Azure's best setup, and answered about 5 times faster!

So the search box stayed on Algolia, and Azure hybrid serves the agents. If we'd only had the one test set, we'd have switched everything - and made the search box slower for the humans using it, for no gain in ranking.

### What it cost us

Here's what all of this cost, for anybody wondering:

- Azure AI Search on the **Basic** tier.
- Embedding the whole docs set took about **8 minutes** the first time, and cost **cents**.
- Once we stored a hash of each section and skipped unchanged ones, a full rebuild took a little over **2 minutes**, and a rebuild with no changes took **2 seconds**.
- The free semantic reranker plan allows **1,000 queries a month**. Each full test run uses one per question (52, or 60 once we added 8 more no-answer probes), and that allowance is shared with production searches. Go past it and the service returns HTTP 402, so if your code always asks for reranking, it needs a fallback.

## What your readers get out of it

Your test set is really a list of what your readers need, in their words, with the page that should answer each one. That makes it worth writing even if you never change engines! Ours turned up a missing changelog answer, a feature the docs describe in words nobody searches for, and a search box that was fine the way it was. Every one of those helps the person typing, as well as the agent.

<!-- JOEL: Would you do this for things other than search now? Where else at Agility are you deciding on vibes? -->

## Make a guess first

If you scored your site search tomorrow on 10 real questions, how many do you think would have the right page first? Drop your guess in the comments before you run the check, then come back and tell me the real number. Let's see how close you get!

Next in the series: **Your build should not be able to quietly delete content**

*One more thing - an AI coding agent did a LOT of the heavy lifting on this one, and it helped me draft the post too. The measurements are ours, and so are the mistakes. :)*
