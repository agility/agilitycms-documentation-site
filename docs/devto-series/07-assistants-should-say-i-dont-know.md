---
title: "An assistant on your site should know when to say \"I don't know\""
published: false
description: "A chatbot on your content is a model calling your search. How to make it cite its sources and refuse when your content has no answer, and why our first refusal threshold, based on one question, was wrong."
tags: ai, webdev, search, javascript
series: Expect More From Your Website
---

<!--
DRAFT 2 (voice pass). Sources: evals/search (run 7 and the no-answer probes), lib/search/azure.ts, app/api/mcp/route.ts.
TODO(data): rerun the probes with about 15 no-answer questions and report the threshold properly before publishing.
Decide before publishing: is the docs chatbot live yet? This draft teaches the pattern without a live demo.
-->

We asked our docs search "can I install WordPress plugins in Agility?", and it came back with a confident first result: our guide to migrating from WordPress. Which mentions plugins.

Our docs don't answer that question. There's no plugin system to install WordPress plugins into! But the search engine found the closest thing it had, and if a chatbot had been sitting on top of it, that chatbot would've had a page to quote.

A helpful-sounding wrong answer with a real link attached is the worst kind.

So how do you get an assistant to admit it doesn't know?

![Semantic ranker top scores from 0 to 4. The 9 questions our docs cannot answer scored 1.96 to 2.62. The 51 they can answer scored 2.28 and up, median 2.95. Refusing below 2.0 catches 1 of 9 and wrongly refuses 0 of 51. Below 2.2: 5 of 9 and 0 of 51. Below 2.4: 8 of 9 and 3 of 51. Below 2.3, the current plan: 7 of 9 and 1 of 51.](img/out/07-assistants-should-say-i-dont-know.gif)

## The standard

**An assistant answering from your content should cite the pages it used, and should say "I don't know" when your content doesn't cover the question, instead of making something up.**

## The 10-minute check

Grab your site's chatbot, or any assistant pointed at your docs (an MCP connection, a custom GPT, a support widget).

1. **Write 3 questions your content doesn't answer.** Make one a near miss: a topic right next to one you cover. If you document editor comments, ask how readers leave comments.
2. **Ask each one.** Does it say it doesn't know, or does it answer anyway?
3. **Check every answer for links.** Does each claim point to the page it came from, and does that page actually say it?
4. **Ask something contractual,** like pricing, an SLA or a security certification. Does it answer from a page that might be out of date, or send you to a person?
5. **Type a nonsense question into the search behind the assistant.** If it still gets results, your search can't tell the assistant when to stop.

## Why assistants make stuff up

Nobody sets out to build a bot that bluffs. The defaults just push it that way.

- "Be helpful" is the default instruction. A model told to help will produce an answer, and a confident wrong answer looks like success in a demo.
- Modern search always finds something. Vector search (finding text by meaning, using numeric "embeddings" of each passage) returns the nearest neighbour for any query, however far away it is. When we moved our agent search to hybrid keyword plus vector search, our PostHog alert for "searches with zero results" went quiet. Did we fix the gaps? Nope. Zero results just stopped happening.
- Most relevance scores mean nothing on their own. Hybrid search merges rankings with Reciprocal Rank Fusion, and the resulting scores are tiny numbers (around 0.03 on Azure AI Search) that only make sense next to each other. You can't hang a threshold on them.
- Nobody tests the questions that don't have answers. Test sets are built from questions you CAN answer, so the refusal path never runs.

## Teaching it to stop

There are 4 parts, and none of them is tied to a particular model or search engine.

1. **Build the assistant on top of your own search,** so it's never working from the model's memory. The model gets 2 tools: search (query in; titles, URLs and snippets out) and fetch (the whole page as Markdown). It answers only from what it read. This is retrieval-augmented generation (RAG), done through tool calls so the model can search again.
2. **Require citations.** Every page it used shows up as a link. If the model can't cite it, it doesn't get to say it.
3. **Gate on a calibrated confidence score, in code, before the results ever reach the model.** If the best result scores below a threshold, the model is told there's no confident match and to say so.
4. **Let the model make the final call.** A score narrows the problem; it doesn't solve it. The system prompt still says: if the pages you fetched don't answer the question, say you don't know and point to a person.

Add one more for anything contractual (pricing, contracts, security claims): send those to a human before the model is even called. Our [docs article on building a chatbot on your content](https://agilitycms.com/docs/developers/build-a-chatbot-on-your-content) has a complete Next.js route with that check built in.

### Paying for a score we don't sort by

Our docs run on Agility CMS, which I co-founded. The search behind our MCP server (the 2-tool server from post 6) is Azure AI Search, with embeddings from Azure OpenAI.

As I said, hybrid scores can't carry a threshold. A calibrated score costs you a reranker call. Azure's **semantic ranker** is a second model that reads the query and each of the top 50 results together, and scores how well each passage answers it, from 0 to 4. That number is on a fixed scale, so a threshold can actually mean something. Standalone reranking models do the same job in front of other engines, for the same price: a billed call and some latency on every search.

The awkward part? On our test set, the reranker's *order* was worse than plain hybrid (MRR 0.796 against 0.853; MRR is the average of 1 divided by the rank of the right page). But its *score* was the only signal we found that separates "the docs answer this" from "they don't".

So now the default pays for the score and throws the order away. Every Azure search runs the ranker, then sorts the results back by the hybrid score:

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

There's some pretty subtle stuff in there. Azure keeps the hybrid score in `@search.score` on a semantic query, so sorting by it gets you hybrid's order back (we checked). `topScore` is the best reranker score across all results, because the first result is now hybrid's pick. And the score can be `null`: once you're past the free quota (HTTP 402), the search retries without the ranker, and our Algolia path never has a score at all. Your gate has to treat "no score" as its own case. It isn't zero!

Most people buy a reranker to reorder results. We pay for ours to know when to stop.

### The MCP server just reports the number

Our MCP server doesn't refuse anything. It serves lots of different assistants, and the refusal policy belongs to whoever's answering the person. So `search_docs` prints each result's reranker score next to it and lets the calling model weigh it. When there's no score, that line just gets left out:

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

A chatbot of our own should gate in code. We haven't built it yet, so this is a **sketch, not code from our repo**, using the real `searchDocs` function from post 6:

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

A threshold only means something for the score and the content you measured. To set yours:

1. Add questions your content can't answer to your search test set (post 4), including near misses. Check each one against the full text so you know it really has no answer.
2. Run every question, answerable or not, and write down the top score.
3. Put the threshold between the 2 groups. If they overlap, decide which mistake costs you more: refusing a question you could've answered, or answering one you can't.

## My first threshold rested on 1 question

Our original 52-question test set had exactly 1 question the docs can't answer. On the semantic ranker it scored 1.94, and every answerable question's top result scored at least 2.16. A nice clean gap! We wrote down "a threshold near 2.0", along with a note that 1 probe isn't enough.

That note was right.

We wrote 8 more no-answer questions and checked each one against the full text of every indexed section. We dropped 2 candidates the docs did answer after all, and committed the questions before scoring. On our full index, the 9 no-answer questions scored 1.96 to 2.62. The answerable ones scored 2.28 and up (median 2.95). The ranges overlap:

| Refuse below | No-answer questions refused | Answerable questions wrongly refused |
|---|---|---|
| 2.0 | 1 of 9 | 0 of 51 |
| 2.2 | 5 of 9 | 0 of 51 |
| 2.3 | 7 of 9 | 1 of 51 |
| 2.4 | 8 of 9 | 3 of 51 |

The 2.0 we nearly went with would've caught 1 of 9.

Oops.

The highest-scoring miss, at 2.62, was the WordPress plugins question from the top of this post. The answerable question wrongly refused at 2.3 was "what is your uptime SLA", which scored 2.28 even though the right page ranked first.

So the score is a useful signal, but it can't be the whole gate. For a chatbot, the plan is a threshold around 2.3, plus a model that reads the page and admits when it doesn't answer. NONE of this is settled. 9 questions beats 1, but we want about 15 no-answer questions before we let a number refuse real people.

TODO(data): rerun with about 15 no-answer questions and report the threshold.

### 2 costs we didn't see coming

Our first test run said the semantic ranker improved ordering a little. Once the full content was indexed, it made ordering worse, so now we only pay for it for the score. It also costs time. In a local check against production, scored searches ran from 30 ms faster to 240 ms slower than plain hybrid, so budget about 0.2 seconds.

Then there's the quota. The free semantic plan allows 1,000 queries a month, then Azure answers HTTP 402. Our evaluation runs used about half of that in one day! A public chatbot needs the paid plan, and code that falls back when the quota runs out.

### So where did the gap list go?

Our PostHog `docs_mcp_tool_call` event had turned zero-result agent searches into a content-gap list (post 3), and then hybrid search emptied it. The event now also carries `top_score` (null when the ranker didn't run), plus `engine` and `fallback`. We added `top_score` so we can alert on low confidence: searches below about 2.3 are the new gap list. Unscored searches need their own count, because past the free quota every search is unscored, and you really don't want that silence to look like "no gaps".

## What a good "I don't know" does for people

A reader who gets "I don't know, here's how to ask us" trusts the next answer. A reader who gets a confident wrong answer stops using the assistant, and maybe the product.

The refusals are also the most useful log you'll have. Each one is a question a real person asked that your content doesn't answer, which is exactly what post 3 asked you to collect.

## Go ask it something it can't answer

Ask your own site's assistant a near-miss question today. Did it own up, or did it bluff? Tell me what it said in the comments.

Next in the series: **Fast, accessible and working everywhere: measured, not assumed.**

*How this got built: an AI coding agent did a lot of the heavy lifting. The numbers come from our own measurements, and anything wrong in here is on me.*
