---
title: "Your site search should understand a question, not just keywords"
published: false
description: "People and AI agents both type whole questions into search boxes now. Four settings, and one ranking change, that stop your search from returning nothing."
tags: search, webdev, ai, javascript
series: Expect More From Your Website
---

<!--
DRAFT 1. Joel: the opening and "Your turn" should sound like you. Sources: evals/search/FINDINGS.md, evals/search/JOURNAL.md, lib/search/docsSearch.ts, lib/search/azure.ts, app/api/mcp/route.ts.
-->

Type this into the search box on your own site: "can I schedule content to publish later".

Not "scheduling". The whole sentence, the way a new customer would ask it, or the way an AI assistant would pass it along on their behalf.

When we did that on our docs, the answer was zero results. The page that answers it exists. It is called "Scheduling Overview". Search simply could not see it behind all the extra words.

## The standard

**When someone types a full question into your site search, they should get an answer, not an empty page.**

A blank result for a plain question is a bug, not a user error.

## The 10-minute check

You need a browser and a few real questions. No accounts, no tools.

1. **Collect five questions** from support tickets, sales calls or a chat log. Keep the customer's wording.
2. **Type each one into your site search as a full sentence.** Do not shorten it into keywords. That is the point.
3. **Count the blank results.** Then count the ones where the right page is not on the first screen.
4. **Ask one question in your customer's words and again in your product's words.** We say "locales", customers say "multiple languages". Does the customer's wording find anything?
5. **If you have an AI assistant or an API that searches your content,** send it the same five sentences. It may use different settings from your search box.

If more than one of the five comes back empty, your search is tuned for keywords only. Almost every site's is, by default.

## Why it usually fails

Nobody chose this. It is what the defaults do.

**Every word must match.** Most keyword engines, Algolia included, default to returning only records that contain every word in the query (allowing for typos and prefixes). For a two-word query like "webhook signature", that is exactly what you want. For "can I schedule content to publish later", it means the page must contain "can", "I" and "later" as well. A page about scheduling may use none of them, so it is filtered out before ranking even starts.

**Keywords match words, not meaning.** If your docs say "locales" and the reader says "languages", nothing connects them. No amount of tuning fixes a word that is not on the page.

**The search box was tested by people who know the product.** The team types "scheduling" because they know what the feature is called. Newcomers type what they want to do. And AI agents, which read your site on behalf of those newcomers, nearly always send whole sentences.

## How to fix it

There are two layers. The first is cheap and takes an afternoon. The second takes longer and fixes the problem the first cannot touch.

### Layer 1: make keyword search tolerant of sentences

You want four behaviours. Most engines have all of them; the names differ.

1. **Tell the engine the query language,** so it knows which words are filler.
2. **Ignore filler words** ("can", "I", "to", "the").
3. **Treat plurals as the same word,** so "locale" matches "locales".
4. **When every word finds nothing, make words optional** and try again, rather than returning an empty page.

The fourth is the big one. It turns "zero results" into "the best partial matches", which is almost always better.

Our docs run on Agility CMS, which I co-founded, with a Next.js and React front end. Content is written by people in our CMS, and every article is indexed into Algolia when it is published. Agents reach the docs through an MCP server (Model Context Protocol, a standard way to give AI assistants tools; ours has a search tool and a fetch tool). Here are the four settings in the function that tool calls:

```ts
// lib/search/docsSearch.ts
async function searchAlgolia(query: string, page: number): Promise<DocsSearchResult> {
	const res: any = await algolia().searchSingleIndex({
		indexName: algoliaIndex(),
		searchParams: {
			query,
			page,
			hitsPerPage: PAGE_SIZE,
			// Agents ask in sentences ("how do I schedule content to publish
			// later"), and by default every word must match, so most such
			// questions returned 0 hits. Drop filler words, fold plurals, and
			// when the full query still matches nothing, let Algolia relax
			// words instead of returning an empty result.
			queryLanguages: ["en"],
			removeStopWords: true,
			ignorePlurals: true,
			removeWordsIfNoResults: "allOptional",
			// ...
		},
	});
	// ...
}
```

Those are query parameters, so you can set them per request without touching the index. Other engines have their own versions of the fourth setting: Meilisearch has `matchingStrategy`, Typesense has `drop_tokens_threshold`, and Elasticsearch has `minimum_should_match` on a match query.

We applied these to the agent search only. The ⌘K search box on the site still uses Algolia's defaults, on purpose. People in a search box type one to three words, often half a word at a time. When we tested the box separately on queries copied from our search logs, the defaults did well, tying the best Azure setup on quality while Azure hybrid was about 5 times slower per keystroke (53 ms against 263 ms). Different readers, different settings. Test both.

### Layer 2: add meaning, not just more keywords

Layer 1 cannot fix vocabulary. If the reader's word is not on the page, relaxing the rules just finds other pages.

That is what vector search is for. An embedding model turns a piece of text into a long list of numbers (a vector) that represents its meaning. Texts that mean similar things end up close together, even when they share no words. "Multiple languages" lands near "locales".

Hybrid search runs keyword search and vector search on the same query and merges the two ranked lists. You keep exact matches for product names and error codes, and you gain matches on meaning.

For agent search we moved to Azure AI Search, with Azure OpenAI's `text-embedding-3-large` model making the vectors. Each article is split into sections at its headings, and each section is embedded with its title and heading in front, so a section called "Configuration" under "Deploy to Azure" does not look like every other "Configuration":

```ts
// lib/search/azure.ts
const embeddingInput = (r: SectionRecord) => `${r.title}${r.heading ? ` > ${r.heading}` : ""}\n\n${r.body}`.slice(0, 24000);
// ...
const hybrid = {
	search: query,
	vectorQueries: [{ kind: "text", text: query, fields: "bodyVector", k: 50 }],
	select: "articleId,title,heading,description,body,section,category,url",
	top: 50,
	// ...
};
// ...
res ??= await azure(path, { method: "POST", body: hybrid });
```

`search` is the keyword half and `vectorQueries` is the vector half. The index has a vectorizer configured, so Azure embeds the query itself and the site never handles query vectors. If you are elsewhere: Algolia has its own vector option (NeuralSearch), and Elasticsearch, OpenSearch, Typesense, Meilisearch and Postgres with pgvector all support some form of vector or hybrid search.

One design choice I would repeat: the agent tool does not know which engine is behind it. A single environment variable picks the engine, and if Azure fails, Algolia answers:

```ts
// lib/search/docsSearch.ts
export const docsSearchEngine = (): "algolia" | "azure" =>
	process.env.DOCS_SEARCH_ENGINE === "azure" && azureSearchConfigured() ? "azure" : "algolia";

export async function searchDocs(query: string, page = 0): Promise<DocsSearchResult> {
	if (docsSearchEngine() !== "azure") return searchAlgolia(query, page);
	try {
		return await searchAzure(query, page, PAGE_SIZE);
	} catch (err) {
		console.error("Azure docs search failed; answering from Algolia", err);
		return { ...(await searchAlgolia(query, page)), fallback: message(err) };
	}
}
```

That let us switch engines without changing the tools agents call, and it means an Azure outage degrades search instead of breaking it.

## What happened when we tried it

**The four settings ended the empty pages.** We ran the same questions against the live index before and after:

- "can I schedule content to publish later": 0 results before, 9 after, with Scheduling Overview first.
- "what happens to nested content when I delete the parent item": 0 before, 368 after, with the right page first.
- "how do I set up preview mode with the Next.js app router": 0 before, 15 after, but with the wrong page first.

That third one matters. The settings fixed zero results. They did not fix ranking.

**Vectors fixed ranking, and vocabulary.** We wrote 52 test questions with their correct pages (51 answerable, one deliberately not) and scored each setup on how often the right page came first. Our Algolia setup, with the four settings, put the right page first for 25 of 51. Azure hybrid, keyword plus vectors, put it first for 36. The summary score we tracked, MRR (mean reciprocal rank: 1 point if the right page is first, half if second, a third if third, and so on, averaged over all questions), went from 0.577 to 0.801. "Does Agility support multiple languages" found nothing by keyword, because the docs say "locales". Vectors found it. Post 4 covers how we measured all of this.

**Splitting content did not help keyword search.** We also built a second Algolia index with one record per section instead of one per article, collapsed back to one hit per page:

```ts
// lib/search/algoliaSections.ts
indexSettings: {
	searchableAttributes: ["title", "heading", "unordered(body)", "description"],
	attributeForDistinct: "articleId",
	distinct: true,
	// ...
},
```

I expected it to close half the gap. It scored 0.573 against 0.577 for one record per article: no difference. The gain came from ranking, not from how we cut up the content. Sections still earn their place in Azure, because a hit lands on the passage that answers the question, but they were not the fix I thought they were.

**What we got wrong: a guard that refused questions.** Earlier, we had added a guard to the agent tool that rejected queries over 12 words, because some agents sent long bundles of keywords that keyword search handled badly. After moving to Azure, we scored the full production-sized index twice: once by calling the engine directly (MRR 0.853), and once end to end through the real MCP endpoint (0.813). The cause was two questions that got no results at all: "what happens when two people edit the same item at the same time" and "where is my data stored and can I keep it in the EU". Both are 13 words. The engine ranked both correctly. Our own guard never let them through.

Our first fix was to raise the limit to 20 words. That also let through the guard's own example of what to block. The second fix asks a better question: does this read like a sentence or a keyword list?

```ts
// app/api/mcp/route.ts
// Words that make a query read as a sentence rather than a keyword list.
const FUNCTION_WORDS = new Set(
  "a an the is are am was do does did can could should would will i me my we our you your it its this that these those to in on at of for with and or if when where what which who whom why how".split(" ")
);
// ...
const functionWords = words.filter((w) => FUNCTION_WORDS.has(w.toLowerCase())).length;
const readsAsQuestion = docsSearchEngine() === "azure" && wordCount <= 20 && functionWords >= 3;
const MAX_QUERY_WORDS = 12;
if (wordCount > MAX_QUERY_WORDS && !readsAsQuestion) {
  // ... return a "use shorter queries" hint instead of searching
}
```

Questions have several of those words. Keyword bundles have almost none. With that change, the full MCP scored 0.853 again, the same as the engine on its own. The lesson: test through the interface your readers actually use. The engine was fine. The code in front of it was quietly dropping 4% of our questions.

One more thing we got wrong, which leads into the next post. We ran some of our early tests through the live search endpoint. The first zero-result alert we set up fired on our own test queries.

## For people, too

All of this started with agents, but the people it helps most are new readers. Someone evaluating your product, or on their first week with it, does not know your vocabulary yet. They type what they want to do, in their own words, as a question. Those are the readers you most want to keep, and they are exactly the ones a keyword-only search turns away with an empty page.

The search-box test was a useful reminder in the other direction: experienced people type short keywords, and for them the defaults were already good. You do not have to choose one reader. You can tune each path for the reader using it.

## Your turn

Run the check with five real questions from your support inbox. How many came back empty? And if you fixed it, which engine and which setting did it? I would like to collect the equivalents for other engines in the comments.

Next in the series: **"No results" is feedback, so collect it.**

*Parts of this work were done with an AI coding agent. The numbers are from our own measurements, and the mistakes are ours.*
