---
title: "\"No results\" is feedback, so collect it"
published: false
description: "Every search that finds nothing is a reader telling you what is missing. How to capture those searches, alert on them, and turn them into a content plan."
tags: webdev, search, analytics, cms
series: Expect More From Your Website
---

<!--
DRAFT 1. Joel: the opening and "Your turn" should sound like you. PostHog numbers were read on 2026-10-14 (docs project, read-only). Sources: components/common/SearchModal.tsx, lib/analytics/agentTraffic.ts, app/api/mcp/route.ts, evals/search/JOURNAL.md.
-->

Every search box on the internet has a little message for when it finds nothing. "No results for 'ugc'." The reader sees it, sighs, and leaves.

That message is the most honest thing your site will ever be told. A real person wanted something, described it in their own words, and you did not have it, or had it under a different name. Most sites throw that away.

## The standard

**You should be able to list last week's searches that returned nothing, and someone should read that list every week.**

## The 10-minute check

1. **Ask yourself, or your content lead: "What did people search for on our site last week that found nothing?"** Can you answer without asking a developer to dig through logs?
2. **If you have an AI assistant, a chatbot, an API or an MCP server on your content,** can you answer the same question for the searches it ran?
3. **Search your own site for something you know you do not cover** (a competitor's feature name, or nonsense). Then go and find that search in your analytics. Is it there? Does it record that it found nothing?
4. **Think of the last time someone wrote or edited a page because of a failed search.** If you cannot remember one, the list is not being read, even if it exists.

Most teams fail step 1 or step 3. We failed step 2 for a long time without knowing it.

## Why it usually fails

Not because anyone decided it does not matter. It is defaults and ownership again.

- **Search analytics is off, or lives somewhere nobody opens.** Your search provider may keep a "no results" report, but it sits in a dashboard only the developer who set it up can log into. The content team never sees it.
- **The search is logged, but the result count is not.** Many setups record "a search happened" with the query, and nothing else. Without the count, "found nothing" is invisible.
- **Agent searches are not logged at all.** When an AI assistant searches your docs through an API or an MCP server, that request often never touches your front-end analytics. Those searches are some of the most precise questions you will ever get, and they vanish.
- **Typing noise drowns the signal.** If you record a search on every keystroke, "webhook" arrives as "we", "web", "webh"… and the real failures are buried under half-words.

## How to fix it

### The principle

1. **Log every search with its result count,** from the search box and from any agent tool. One event, two properties: the query, and the number of results.
2. **Log the search the reader settled on,** not every keystroke.
3. **Build one view:** zero-result queries, most frequent first, for the last 7 days.
4. **Alert on it.** A daily alert when zero-result searches appear is enough to build the habit of looking.
5. **Sort each query into one of three buckets:**
   - **A content gap.** The answer is not on your site. Write the page, or decide on purpose not to.
   - **A vocabulary gap.** The page exists but uses different words. Add the reader's words to it: a sentence, a heading, a synonym.
   - **A search problem.** The page exists and uses the words, and search still missed it. Fix the search (post 2 has the usual suspects).

The buckets matter because each one goes to a different person. Content gaps go to writers. Vocabulary gaps are often a five-minute edit. Search problems go to a developer. A single undifferentiated list goes to nobody.

### Our implementation

Our docs run on Agility CMS, which I co-founded, with a Next.js and React front end. Content is written in our CMS and indexed into Algolia for the ⌘K search box, and into Azure AI Search for agents. We use PostHog for analytics, so both paths send PostHog events.

**The search box.** Results appear 150 ms after a keystroke, but the analytics event waits until the query has stood still for a second. Closing the box sends the last query immediately, so "searched, found nothing, gave up" is not lost:

```tsx
// components/common/SearchModal.tsx
const flushSearch = useCallback(() => {
	if (searchTrackTimer.current) clearTimeout(searchTrackTimer.current);
	searchTrackTimer.current = null;
	if (pendingSearch.current) track("docs_search", pendingSearch.current);
	pendingSearch.current = null;
}, []);
// Closing the palette or navigating away still reports the last query, so
// "searched and gave up" isn't lost to the settle delay.
useEffect(() => flushSearch, [flushSearch]);
// ...
if (query.trim().length >= 2) {
	pendingSearch.current = { query, results: result.nbHits };
	if (searchTrackTimer.current) clearTimeout(searchTrackTimer.current);
	searchTrackTimer.current = setTimeout(flushSearch, 1000);
}
```

`results` is the number of hits Algolia reported, so "found nothing" is simply `results = 0`. A click on a result sends `docs_search_result_click` with the query and the position clicked, which tells you about the other failure: searches that found something, but not the right thing.

**The agent tool.** Our MCP server (Model Context Protocol, a standard way to give AI assistants tools) has a `search_docs` tool. After each search it records the query and the hit count:

```ts
// app/api/mcp/route.ts
trackMcpToolCall(
  "search_docs",
  { query, page: page || 0, hits: results.total, engine: results.engine, fallback: results.fallback },
  Date.now() - startTime,
  true
);
```

That becomes a server-side PostHog event, sent after the response so it never slows the agent down, and only from production:

```ts
// lib/analytics/agentTraffic.ts
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
if (!key || !isProduction()) return;

const { query, objectID, hits, blocked, engine, fallback, topScore } = input.args as Record<string, unknown>;
await fetch(`${posthogHost()}/i/v0/e/`, {
	method: "POST",
	headers: { "content-type": "application/json" },
	body: JSON.stringify({
		api_key: key,
		event: "docs_mcp_tool_call",
		distinct_id: "agent:mcp",
		properties: {
			tool: input.tool,
			query: typeof query === "string" ? query.slice(0, 200) : null,
			hits: typeof hits === "number" ? hits : null,
			zero_results: hits === 0,
			// ...
			top_score: typeof topScore === "number" ? Math.round(topScore * 100) / 100 : null,
			// ...
		},
	}),
	signal: AbortSignal.timeout(2000),
});
```

Three details worth copying. The query is capped at 200 characters. Every agent shares one anonymous `distinct_id`, so no person profile is created. And `zero_results` is a boolean, which makes the PostHog insight a plain filter rather than a numeric comparison. The whole thing is wrapped in a `try` that swallows errors, because analytics must never break search.

**The view and the alert.** In PostHog, that is one trends insight per event (`docs_search` where `results = 0`, and `docs_mcp_tool_call` where `zero_results` is true), broken down by `query`, plus an alert on the agent tile. Any analytics tool that stores event properties can do the same: Plausible and Umami with custom event properties, GA4 with a custom dimension, or a plain database table.

If you use Algolia, its own analytics also has a "searches without results" report, and you can read it through the Analytics API. Turn on click analytics (`clickAnalytics: true` on the query) and it can tell you about searches that returned results nobody clicked, too.

## What happened when we tried it

The volume is small, and I want to be honest about that. Our PostHog search events start on 17 September 2026. From then to 14 October, the docs search box logged 79 searches from 15 people (by PostHog's count, our own team included), with between 6 and 32 searches a week. Agent searches through the MCP server started being logged on 6 October; in that first week there were 76.

**The search box: five zero-result searches, three buckets.** Only five searches in that period found nothing:

- "ugc". A **content gap**. User-generated content is not something our docs cover. We already knew that: it is the one question in our 52-question test set that is deliberately unanswerable. A real reader asking it is a reason to write a short page that says so and points somewhere useful.
- "push pullcli". A **search problem**. Two words typed together with no space. If the reader meant the CLI's push and pull commands, the engine could not split "pullcli" to find them, and a typo is not the reader's fault.
- "ckl", "cklui" and "imn". **Noise.** "ckl" and "cklui" were logged on the same day, one the start of the other: fragments of someone typing, from before we added the one-second settle delay. That delay exists because fragments like these were swamping the report.

Five is not a content plan. But one real content gap and one fixable search problem out of five is a better hit rate than most planning meetings.

**The agent tool: the first alert was us.** Agents logged 9 zero-result searches in their first week. All 9 were on 6 October, and all 9 were one of three questions: "can I schedule content to publish later" (5 times), "what happens to nested content when I delete the parent item" (twice) and "how do I set up preview mode with the Next.js app router" (twice). Those are the exact questions we were using that day to test the fix in post 2, run through the live endpoint. Our new zero-result alert fired, and the "readers" it was warning us about were our own team.

Two fixes came out of it. Our test script now calls the search engine directly with analytics switched off (`analytics: false, clickAnalytics: false` for Algolia), so a test run never lands in the reports. And the habit: test the engine, not production. If you must test production, tag the traffic so you can filter it out.

**What we got wrong: we were about to break our own signal.** Since 7 October, 0 of 61 agent searches have returned nothing. Part of that is the four settings from post 2 working. But on 13 October the agent tool moved to Azure AI Search hybrid search, which combines keywords with vectors (lists of numbers that represent meaning). Vector search always finds a nearest neighbour, so it almost never returns zero results. Our zero-result tile for agents will stay at zero even when the docs have no answer.

We noticed this in our notes before the switch, not after, and replaced the signal a day later. Two obvious candidates failed against the live index: "no keyword match" (our no-answer test questions still matched ordinary words like "editor" in nearly every top result) and the hybrid score (a fusion score of about 0.03 that ranks results but does not measure them). Watching agents reword a failed search was impossible, because every agent call shares one anonymous ID. What worked was Azure's semantic ranker, which scores each result from 0 to 4 for how well it answers the question. Every agent search now runs it for that score while keeping hybrid's order, and the event carries the best score as `top_score` (the line in the code above), plus `engine` and `fallback`. We added `top_score` so we can alert on low confidence instead of zero results; below about 2.3 the docs probably do not answer, and post 7 covers how far to trust that number. One catch: past the free ranker quota, searches come back unscored and `top_score` is null, so count unscored searches separately, or silence will look like "no gaps". If you add vector search, decide what replaces "no results" before you ship it.

**What we got wrong, part two: one index, four kinds of caller.** To check PostHog's count, I asked Algolia for the same period. It counted 666 searches on the docs index, 92 of them (13.8%) with no results, against PostHog's 79 searches from the search box. The two are not measuring the same thing. The docs search box, the agent tool (until it moved to Azure), our test scripts and at least one other caller all query that one index, and we never told Algolia which was which. The top of Algolia's no-results list shows it. There are the three questions we tested with on 6 October, a nonsense string from a test run, and pairs of searches for our own blog-post titles that read like another site feature asking for related docs, not like people typing. So 13.8% is not our search box's rate, and I cannot tell you what is. The fix is one parameter per caller. Algolia's `analyticsTags` lets its reports be filtered by caller, so the search box now sends `["search-box"]` and the agent tool `["mcp"]`, and the main website is next. Tags only apply from the day you add them, so tag each caller of a shared index from day one.

We also have not tracked how many zero-result searches turned into new or edited pages. That is the number that proves the habit works, and it is the next one we will add.

## For people, too

This one is mostly for people. A zero-result list is the cheapest content strategy there is: your readers write your backlog for you, in their own words, every day, for free. A vocabulary gap fixed by adding the reader's phrase to a page helps the next person who types it, and it helps the agent that searches on their behalf. The page that says "we don't support that, here is what to do instead" saves a support ticket.

Our biggest vocabulary gap so far did not come from the list at all. "How do I let editors click on the page to edit it" ranked poorly on every engine we tried, because our docs never describe the feature that way. Search tuning cannot fix that. Adding the reader's words to the page can.

## Your turn

Can you answer step 1 of the check today? If you can, what is the strangest query on your zero-results list, and which bucket did it go in?

Next in the series: **Measure your search before you change it.**

*Parts of this work were done with an AI coding agent. The numbers are from our own measurements, and the mistakes are ours.*
