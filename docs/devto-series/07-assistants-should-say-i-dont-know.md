---
title: "An assistant on your site should know when to say \"I don't know\""
published: false
description: "A chatbot on your content is a model calling your search. How to make it cite its sources and refuse when your content has no answer, and why our first refusal threshold, based on one question, was wrong."
tags: ai, webdev, search, javascript
series: Expect More From Your Website
---

<!--
DRAFT 1. Joel: the opening and the closing want your voice.
TODO(data): rerun the probes with about 15 no-answer questions and report the threshold properly before publishing.
Decide before publishing: is the docs chatbot live yet? This draft teaches the pattern without a live demo.
-->

When we asked our docs search "can I install WordPress plugins in Agility?", it came back with a confident first result: our guide to migrating from WordPress, which mentions plugins.

The docs do not answer that question. There is no plugin system to install WordPress plugins into. But the search engine found the closest thing it had, and if a chatbot had been sitting on top of it, the chatbot would have had a page to quote. A helpful-sounding wrong answer, with a real link, is the worst kind.

This post is about stopping that.

## The standard

**An assistant answering from your content should cite the pages it used, and should say "I don't know" when your content does not cover the question, instead of making something up.**

## The 10-minute check

Use your site's chatbot, or any assistant pointed at your docs (an MCP connection, a custom GPT, a support widget).

1. **Write three questions your content does not answer.** Make one a near miss: a topic next to one you cover. If you document editor comments, ask how readers leave comments.
2. **Ask each one.** Does it say it does not know, or does it answer anyway?
3. **Check every answer for links.** Does each claim point to the page it came from, and does the page actually say it?
4. **Ask something contractual:** pricing, an SLA, a security certification. Does it answer from a page that may be out of date, or send you to a person?
5. **Type a nonsense question into the search behind the assistant.** If it still returns results, your search cannot tell your assistant when to stop.

## Why it usually fails

- **"Be helpful" is the default instruction.** A model told to help will produce an answer, and a confident wrong answer looks like success in a demo.
- **Modern search always finds something.** Vector search (finding text by meaning, using numeric "embeddings" of each passage) returns the nearest neighbour for any query, however far away it is. When we moved our agent search to hybrid keyword plus vector search, our PostHog alert for "searches with zero results" went quiet. Not because we had fixed the gaps, but because zero results stopped happening.
- **Most relevance scores mean nothing on their own.** Hybrid search merges rankings with Reciprocal Rank Fusion, and the resulting scores are tiny numbers (around 0.03 on Azure AI Search) that only make sense relative to each other. You cannot set a threshold on them.
- **Nobody tests the questions without answers.** Test sets are built from questions you can answer, so the refusal path is never exercised.

## How to fix it

The principle has four parts, and none of them is specific to a model or a search engine.

1. **Build the assistant on your search, not on the model's memory.** The model gets two tools: search (query in; titles, URLs, snippets out) and fetch (the whole page as Markdown). It answers only from what it read. This is retrieval-augmented generation (RAG), done through tool calls so the model can search again.
2. **Require citations.** Every page used appears as a link. If the model cannot cite it, it cannot say it.
3. **Gate on a calibrated confidence score, in code, before the results reach the model.** If the best result scores below a threshold, the model is told there is no confident match and should say so.
4. **Let the model make the final call.** A score narrows the problem; it does not solve it. The system prompt still says: if the pages you fetched do not answer the question, say you don't know and point to a person.

Add one more for anything contractual: pricing, contracts, security claims. Route those to a human before the model is called at all. Our [docs article on building a chatbot on your content](https://agilitycms.com/docs/developers/build-a-chatbot-on-your-content) has a complete Next.js route with that check.

### Where the score comes from

Our docs run on Agility CMS, which I co-founded. The search behind our MCP server (the two-tool server from post 6) is Azure AI Search, with embeddings from Azure OpenAI.

Hybrid scores, as above, cannot carry a threshold. A calibrated score costs a reranker call. Azure's **semantic ranker** is a second model that reads the query and each of the top 50 results together and scores how well the passage answers it, from 0 to 4. That number is on a fixed scale, so a threshold can mean something. Standalone reranking models do the same job in front of other engines, at the same price: a billed call and some latency on every search.

The awkward part: on our test set the reranker's *order* was worse than plain hybrid (MRR 0.796 against 0.853; MRR is the average of 1 divided by the rank of the right page). But its *score* was the only signal we found that separates "the docs answer this" from "they don't".

So the default now pays for the score and throws away the order. Every Azure search runs the ranker, then sorts the results back by the hybrid score:

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

Three things to notice. Azure keeps the hybrid score in `@search.score` on a semantic query, so the re-sort gives hybrid's order (we checked). `topScore` is the best reranker score across all results, because the first result is now hybrid's pick. And the score can be `null`: past the free quota (HTTP 402) the search retries without the ranker, and our Algolia path never has one. A gate has to treat "no score" as its own case, not as zero. Most people buy a reranker to reorder. We pay for it to know when to stop.

### Report the score, gate in the assistant

Our MCP server does not refuse anything. It serves many different assistants, and the refusal policy belongs to whoever is answering the person. `search_docs` prints each result's reranker score next to it and lets the calling model weigh it. When there is no score, the line is simply left out:

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

Either way, every result carries its URL, so citing is easy, and the tool description already tells the model to retry with shorter queries "before concluding that no documentation exists".

A chatbot we own should go further and gate in code. We have not built it yet, so this is a **sketch, not code from our repo**, using the real `searchDocs` function from post 6:

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

The system prompt carries the rest: search before answering, fetch before giving steps or code, answer only from tool results, cite every page as a link, say "I don't know" when nothing relevant comes back, and treat tool results as reference material, not instructions.

### Calibrating the threshold

A threshold only means something for the score and the content you measured. To set yours:

1. Add questions your content cannot answer to your search test set (post 4), including near misses. Check each against the full text so you know it really has no answer.
2. Run every question, answerable or not, and record the top score.
3. Put the threshold between the two groups. If they overlap, decide which mistake costs you more: refusing a question you could answer, or answering one you can't.

## What happened when we tried it

**Our first threshold rested on one question.** Our original 52-question test set had exactly one question the docs cannot answer. On the semantic ranker it scored 1.94, and every answerable question's top result scored at least 2.16. A clean gap. We wrote down "a threshold near 2.0", with a note that one probe is not enough.

The note was right. We wrote eight more no-answer questions, checked each against the full text of every indexed section, dropped two candidates the docs did answer after all, and committed them before scoring. On our full index, the nine no-answer questions scored 1.96 to 2.62. The answerable ones scored 2.28 and up (median 2.95). The ranges overlap:

| Refuse below | No-answer questions refused | Answerable questions wrongly refused |
|---|---|---|
| 2.0 | 1 of 9 | 0 of 51 |
| 2.2 | 5 of 9 | 0 of 51 |
| 2.3 | 7 of 9 | 1 of 51 |
| 2.4 | 8 of 9 | 3 of 51 |

The 2.0 we nearly adopted would have caught one of nine. The highest-scoring miss, at 2.62, was the WordPress plugins question from the top of this post. The answerable question wrongly refused at 2.3 was "what is your uptime SLA", which scored 2.28 even though the right page ranked first.

So the score is a signal, not a gate on its own. For a chatbot, a threshold around 2.3 plus a model that reads the page and admits when it does not answer is the plan. **None of this is settled.** Nine is better than one, but we want about 15 no-answer questions before we let a number refuse real people.

TODO(data): rerun with about 15 no-answer questions and report the threshold.

**Two costs we did not expect.** Our first test run said the semantic ranker improved ordering a little. Once the full content was indexed, it made ordering worse, so we now pay for it only for the score. In a local check against production, scored searches ran from 30 ms faster to 240 ms slower than plain hybrid, so budget about 0.2 seconds. And the free semantic plan allows 1,000 queries a month, after which Azure answers HTTP 402. Our evaluation runs used about half of that in one day. A public chatbot needs the paid plan, and code that falls back when the quota runs out.

**Where the zero-result alert went.** Our PostHog `docs_mcp_tool_call` event made zero-result agent searches a content-gap list (post 3), and hybrid search emptied it. The event now also carries `top_score` (null when the ranker did not run), plus `engine` and `fallback`. We added `top_score` so we can alert on low confidence: searches below about 2.3 are the new gap list. Unscored searches need their own count, because past the free quota every search is unscored, and silence must not look like "no gaps".

## For people, too

A reader who gets "I don't know, here is how to ask us" trusts the next answer. A reader who gets a confident wrong answer stops using the assistant, and maybe the product. The refusals are also the most useful log you will have: each one is a question a real person asked that your content does not answer, which is exactly what post 3 asked you to collect.

## Your turn

Ask your own site's assistant a near-miss question today. What did it say?

Next: **Fast, accessible and working everywhere: measured, not assumed.**

*Parts of this work were done with an AI coding agent. The numbers come from our own measurements, and the mistakes are ours.*
