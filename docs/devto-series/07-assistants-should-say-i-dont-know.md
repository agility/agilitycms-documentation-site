---
title: "An assistant on your site should know when to say \"I don't know\""
published: false
description: "A chatbot on your content is a model calling your search. How to make it cite its sources and refuse when your content has no answer, and why our first refusal threshold, based on one question, was wrong."
tags: ai, webdev, search, javascript
series: Expect More From Your Website
---

<!--
DRAFT 2 (voice pass). Sources: evals/search (run 7 and the no-answer probes), lib/search/azure.ts, app/api/mcp/route.ts.
Threshold rerun 2026-10-15 with 16 no-answer questions (evals/search/JOURNAL.md, commits 7d0d1b1 and 9f1313d): 2.3 holds, 11/16 refused, 1/51 wrongly refused. Answerable median is 3.04 on today's index (run 7 said 2.95).
Decide before publishing: is the docs chatbot live yet? This draft teaches the pattern without a live demo.
-->

Once you put a model on top of your search (a chatbot, or an agent calling an MCP server like the one from post 6), your search results turn into *answers*. Great when your content has the answer... but what about when it doesn't?

We asked our docs search "can I install WordPress plugins in Agility?", and it came back with a confident first result - our guide to migrating from WordPress (which, to be fair, does mention plugins).

Our docs don't answer that question, though. There's no plugin system to install WordPress plugins into! But the search engine found the closest thing it had, and if a chatbot had been sitting on top of it, that chatbot would've had a page to quote and a link to back it up.

That was a helpful-sounding wrong answer with a real link attached to it.  I think that's actually WORSE than no answer at all!

<!-- JOEL: Have you seen a chatbot on someone's site (or about Agility) be confidently wrong? A real example makes this hit harder. -->

So... how do you get an assistant to admit it doesn't know? We took a swing at it, and our first answer was wrong (more on that further down).

![Semantic ranker top scores from 0 to 4. The 16 questions our docs cannot answer scored 1.92 to 2.62. The 51 they can answer scored 2.28 to 3.53, median 3.04. Refusing below 2.0 catches 2 of 16 and wrongly refuses 0 of 51. Below 2.2: 9 of 16 and 0 of 51. Below 2.4: 14 of 16 and 3 of 51. Below 2.3, the current plan: 11 of 16 and 1 of 51.](img/out/07-assistants-should-say-i-dont-know.gif)

## The standard

**An assistant answering from your content should cite the pages it used, and should say "I don't know" when your content doesn't cover the question, instead of making something up.**

## The 10-minute check

Grab your site's chatbot, or any assistant pointed at your docs (an MCP connection, a custom GPT, a support widget - whatever you've got).

1. Write 3 questions your content doesn't answer. Make one a near miss - a topic right next to one you DO cover. If you document editor comments, ask how readers leave comments.
2. Ask each one. Does it say it doesn't know, or does it just answer anyway?
3. Check every answer for links. Does each claim point to the page it came from, and does that page *actually* say it?
4. Ask something contractual, like pricing, an SLA or a security certification. Does it answer from a page that might be out of date, or does it send you to a person?
5. Type a nonsense question into the search behind the assistant. If it still gets results, your search can't tell the assistant when to stop.

## Why assistants make stuff up

<!-- JOEL: Your opinion on chatbots on vendor sites in general: helpful, annoying, risky? What would make you trust one? -->

Nobody sets out to build a bot that bluffs. The defaults just kinda push it that way:

- "Be helpful" is the default instruction. A model told to help is gonna produce an answer, and a confident wrong answer looks like success in a demo.
- Modern search ALWAYS finds something. Vector search (finding text by meaning, using numeric "embeddings" of each passage) returns the nearest neighbour for any query, no matter how far away it is. When we moved our agent search to hybrid keyword plus vector search, our PostHog alert for "searches with zero results" went quiet. Did we fix the gaps? Nope... zero results just stopped happening.
- Most relevance scores don't mean anything on their own. Hybrid search merges rankings with Reciprocal Rank Fusion, and the scores that come out are tiny numbers (around 0.03 on Azure AI Search) that only make sense next to each other - you can't hang a threshold on them.
- And nobody tests the questions that don't have answers! Test sets get built from questions you CAN answer, so the refusal path never runs (ours had exactly 1).

## Teaching it to stop

There are 4 parts, and none of them is tied to a particular model or search engine.

1. Build the assistant on top of your own search, so it's never working from the model's memory. The model gets 2 tools: search (query in; titles, URLs and snippets out) and fetch (the whole page as Markdown), and it answers only from what it read. This is retrieval-augmented generation (RAG), done through tool calls so the model can search again.
2. Require citations. Every page it used shows up as a link, and if the model can't cite it, it doesn't get to say it.
3. Gate on a calibrated confidence score, in code, *before* the results ever reach the model. If the best result scores below a threshold, the model gets told there's no confident match and to say so.
4. Let the model make the final call. A score narrows the problem down, but it can't solve it on its own, so the system prompt still says: if the pages you fetched don't answer the question, say you don't know and point to a person.

Then add one more for anything contractual (pricing, contracts, security claims) - send those to a human before the model is even called. You really don't want a bot making promises about your SLA! Our [docs article on building a chatbot on your content](https://agilitycms.com/docs/developers/build-a-chatbot-on-your-content) has a complete Next.js route with that check built in.

### Paying for a score we don't sort by

Our docs run on Agility CMS, where I've spent the last 21 years. The search behind our MCP server (the 2-tool server from post 6) is Azure AI Search, with embeddings from Azure OpenAI.

Like I said above, hybrid scores can't carry a threshold, so if you want a calibrated score, it's gonna cost you a reranker call. Azure's **semantic ranker** is a second model that reads the query and each of the top 50 results together, and scores how well each passage answers it, from 0 to 4. That number is on a fixed scale, so a threshold can actually *mean* something. Standalone reranking models do the same job in front of other engines, for the same price - a billed call and some latency on every search.

But... on our test set, the reranker's *order* was actually WORSE than plain hybrid (MRR 0.796 against 0.853; MRR is the average of 1 divided by the rank of the right page). Its *score*, on the other hand, was the only signal we found that separates "the docs answer this" from "they don't".

So now our default pays for the score and throws the order away. Every Azure search runs the ranker, then sorts the results back by the hybrid score:

```ts
// lib/search/azure.ts
/*
  The semantic ranker re-orders the top 50 and scores each 0 to 4. As an
  order it ranked no better than plain hybrid (evals/search, run 7: MRR 0.796
  vs 0.853), but its score is the one signal we found that the docs don't
  answer a query (below 2.3 caught 7 of 9 unanswerable test questions and 1 of
  51 answerable ones). AZURE_SEMANTIC_RANKER:
  - unset or "score": run it for the score, keep the hybrid order
  - "on": use its order too
  - "off": don't run it
  It adds ~0.2 s, is billed per query, and on the free plan answers 402 once
  the monthly allowance is used; a 402 falls back to hybrid with no score.
*/
const semanticRanker = (): "off" | "score" | "on" => {
	const mode = env("AZURE_SEMANTIC_RANKER");
	return mode === "on" || mode === "off" ? mode : "score";
};
// ...
	let sections = res.value || [];
	const scores = sections.map((h) => h["@search.rerankerScore"]).filter((s): s is number => typeof s === "number");
	// @search.score is still the hybrid score, so sorting by it restores the
	// hybrid order (checked: identical to a hybrid-only query).
	if (ranker === "score") sections = [...sections].sort((a, b) => b["@search.score"] - a["@search.score"]);
	// ...
	return {
		engine: "azure",
		topScore: scores.length ? Math.max(...scores) : null,
		// ...
```

There's some pretty subtle stuff in there. Azure keeps the hybrid score in `@search.score` on a semantic query, so sorting by it gets you hybrid's order back (we checked). `topScore` is the best reranker score across ALL the results, because the first result is now hybrid's pick. And the score can be `null` - once you're past the free quota (HTTP 402), the search retries without the ranker, and our Algolia path never has a score at all. So your gate has to treat "no score" as its own case... it isn't zero!

It's kinda funny when you think about it - most people buy a reranker to reorder their results, and we're paying for ours so it can tell us when to stop.

### The MCP server just reports the number

Our MCP server doesn't refuse anything, though. It serves lots of different assistants, and the refusal policy really belongs to whoever's answering the person. So `search_docs` prints each result's reranker score next to it and lets the calling model weigh it (and when there's no score, that line just gets left out):

```ts
// app/api/mcp/route.ts
results.hits.forEach((hit, i) => {
  const url = fullUrl(hit.url);
  lines.push(`## ${i + 1}. ${hit.title}`);
  if (url) lines.push(`**URL:** ${url}`);
  // ...
  if (hit.score !== null) lines.push(`\n*Relevance: ${hit.score.toFixed(2)} of 4*`);
  // ...
});
```

Every result carries its URL, so citing is easy, and the tool description already tells the model to retry with shorter queries "before concluding that no documentation exists".

A chatbot of our own is a different story - that one SHOULD gate in code. We haven't built it yet, so this is a **sketch, not code from our repo**, using the real `searchDocs` function from post 6:

```ts
// SKETCH ONLY. Not in our repository; our chatbot is not built yet.
const MIN_SCORE = Number(process.env.SEARCH_MIN_SCORE); // calibrate first, see below

async function searchForModel(query: string) {
  const { hits, topScore } = await searchDocs(query); // lib/search/docsSearch.ts
  const top = topScore ?? null;

  if (top === null) {
    // No calibrated score (quota used up, ranker off, or Algolia): the model must judge from the pages.
    return { hits, note: "No relevance score. Answer only if a fetched page answers the question." };
  }
  if (top < MIN_SCORE) {
    return { hits: [], note: "No confident match. Tell the user the docs don't cover this and link to support." };
  }
  return { hits, note: null };
}
```

The system prompt carries the rest: search before answering, fetch before giving steps or code, answer only from tool results, cite every page as a link, say "I don't know" when nothing relevant comes back, and treat tool results as reference material, so it never follows an instruction that turns up inside one.

### Picking your own threshold

A threshold only means something for the score and the content you measured, so you can't just borrow ours. To set yours:

1. Add questions your content can't answer to your search test set (post 4), including near misses. Check each one against the full text so you KNOW it really has no answer.
2. Run every question, answerable or not, and write down the top score.
3. Put the threshold between the 2 groups. If they overlap, you've gotta decide which mistake costs you more: refusing a question you could've answered, or answering one you can't.

## My first threshold rested on 1 question

<!-- JOEL: Your reaction when more questions blew up the 2.0 threshold (it went from catching 1 of 1 to 2 of 16). Relief that you measured it before shipping? -->

Our original 52-question test set had exactly 1 question the docs can't answer. On the semantic ranker it scored 1.94, and every answerable question's top result scored at least 2.16. A nice clean gap! We wrote down "a threshold near 2.0", along with a note that 1 probe isn't enough (and that note was right).

We wrote 8 more no-answer questions and checked each one against the full text of every indexed section. We dropped 2 candidates the docs did answer after all, and committed the questions before scoring. On our full index, those 9 no-answer questions scored 1.96 to 2.62, and the answerable ones scored 2.28 and up. The ranges overlap... so 9 still wasn't enough to trust. We went to 16.

The 7 new ones were mostly *near misses*, which are the sneaky ones: "is agility hipaa compliant" (the docs cover SOC 2, but never HIPAA), "can I add a watermark to my images" (image transformations, yes - watermarks, no), "can I set content to publish automatically on a recurring schedule" (one-off scheduling, yes - repeating, no). Same drill: check every one against the full text, throw out anything the docs actually answer (4 more got dropped that way), commit them, THEN score. Here's where all 16 landed, against the same 51 answerable questions:

| Refuse below | No-answer questions refused | Answerable questions wrongly refused |
|---|---|---|
| 2.0 | 2 of 16 | 0 of 51 |
| 2.2 | 9 of 16 | 0 of 51 |
| 2.3 | 11 of 16 | 1 of 51 |
| 2.4 | 14 of 16 | 3 of 51 |

The 2.0 we nearly went with would've caught 2 of 16... oops! The no-answer questions scored 1.92 to 2.62 (median 2.16), and the answerable ones 2.28 to 3.53 (median 3.04). The highest-scoring miss, at 2.62, is still the WordPress plugins question from the top of this post. And the answerable question wrongly refused at 2.3 is "what is your uptime SLA", which scored 2.28 even though the right page ranked first.

Notice which questions sneak over the line, too: HIPAA (2.32), email on your own domain (2.37), recurring publishing (2.50). Every one of them is a near miss - the docs talk about something *right next to* the question. That's EXACTLY where a bot is most tempted to bluff.

A quick word on that nice clean gap from the first probe, because it applies WAY beyond search: when a number looks tidy, check how many data points are holding it up. Ours was resting on exactly 1! More test cases are cheap - a LOT cheaper than a bot refusing real people (or bluffing at them).

So the score is a useful signal, but it can't be the whole gate. With 16 questions, 2.3 still holds up: it refuses about 2 out of 3 questions we can't answer, and wrongly refuses 1 in 51 we can. There's a spot at 2.35 that scores a hair better on this data, but picking a line by staring at the answers is just overfitting with extra steps, so I'm not doing that! For a chatbot, the plan is a threshold around 2.3, plus a model that reads the page and admits when it doesn't answer. Still not settled forever, but now it's resting on 16 questions instead of 1.

### 2 costs we didn't see coming

Our first test run said the semantic ranker improved ordering a little, but once the full content was indexed it made ordering worse - so now we only pay for it for the score. It also costs time. In a local check against production, scored searches ran from 30 ms faster to 240 ms slower than plain hybrid, so budget about 0.2 seconds.

Then there's the quota. The free semantic plan allows 1,000 queries a month, and after that Azure answers with HTTP 402. Our evaluation runs used about half of that in one day! So a public chatbot needs the paid plan, and code that falls back when the quota runs out.

### So where did the gap list go?

Our PostHog `docs_mcp_tool_call` event had turned zero-result agent searches into a content-gap list (post 3), and then hybrid search emptied it. The event now also carries `top_score` (null when the ranker didn't run), plus `engine` and `fallback`. We added `top_score` so we can alert on low confidence - searches below about 2.3 are the new gap list. Unscored searches need their own count, though, because past the free quota EVERY search is unscored, and you really don't want that silence to look like "no gaps".

## What a good "I don't know" does for people

<!-- JOEL: The support team's view: what does a wrong bot answer cost them? A line from your own experience running a support-heavy business. -->

From the reader's side: if somebody asks your assistant a question and gets "I don't know, here's how to ask us", they're gonna trust the next answer it gives them. If they get a confident wrong answer instead, they stop using the assistant... and maybe the product.

The refusals also end up being the most useful log you'll have! Each one is a question a real person asked that your content doesn't answer, which is exactly what post 3 asked you to collect.

## Go ask it something it can't answer

So go try it - ask your own site's assistant a near-miss question today. Did it own up, or did it bluff? Tell me what it said in the comments! Getting this right is a big part of making the assistants on our sites something people can actually trust.

Next in the series: **Fast, accessible and working everywhere: measured, not assumed.**

*Heads up: an AI coding agent did a lot of the heavy lifting here, from the test runs to the first draft of this post. The numbers come from our own measurements, and anything wrong in here is on me.*
