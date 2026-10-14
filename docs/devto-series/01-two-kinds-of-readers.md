---
title: "Your website has two kinds of readers now"
published: false
description: "In the last 30 days, AI assistants read our docs more often than people did. What to expect from your site for both kinds of reader, and a 10-minute check to see where you stand."
tags: webdev, ai, nextjs, search
series: Expect More From Your Website
---

<!--
DRAFT 2. Joel: rewrite the opening and the closing in your own voice. The middle is the teaching part and can stay closer to this.
Numbers: PostHog, docs project, 30 days to 2026-10-14. Re-pull them the week this is published.
-->

Here is a number I did not expect.

In the last 30 days, people viewed pages on our documentation site about 2,500 times. In the same 30 days, AI assistants and AI search tools fetched our pages about 5,700 times to answer somebody's question: ChatGPT, Claude, Perplexity and others, reading on behalf of a person who may never visit the site at all.

That does not count the training crawlers (another 6,800 requests), traditional search engines (5,400) or the scripts and tools that hit any public site. Those are a different story. These 5,700 are readers, just not human ones.

So who is your website for?

I co-founded a CMS company. I have spent a long time thinking about how people read websites. That number made me realise I had been building for half the audience.

This series is about raising the bar for both halves. Not for our site: for yours.

## The standard

**Your website should work well for two kinds of reader: the people who visit it, and the AI agents that read it on their behalf.**

That does not mean building two sites, and it does not mean trading away the human experience. In our experience, almost everything that helps an agent also helps a person. The places where that is not true are worth knowing about, and we will get to them.

## What an agent reader needs

A search engine crawler mostly cared about titles, links and speed, and it read your page so it could send a person to it later.

An agent is different. When someone asks Claude "how does pagination work in this API?" or asks ChatGPT "does this CMS support multiple languages?", the assistant:

1. **Searches** for likely pages, often with the whole question as the query.
2. **Fetches** the pages and reads all of them, not just the title.
3. **Answers** in its own words, ideally with a link back.

If your search cannot handle a question, the agent picks the wrong page. If your page is mostly navigation, scripts and cookie banners, the agent has to guess which part is the answer. Either way, someone gets a vague or wrong answer, and your product's name is attached to it.

## The 10-minute check

You can do this today, on any site, with a browser and an AI assistant.

1. **Pick three questions your site answers.** Real ones, from support tickets or sales calls, written the way a customer would ask them.
2. **Ask an AI assistant each question** (ChatGPT, Claude, Copilot, whichever your customers use). Does it find your page, a competitor's page, or make something up?
3. **Type the same three questions into your own site search**, exactly as written. How many return nothing?
4. **Fetch one page the way a machine would:** `curl -s https://your-site.com/some-page | less`. Is the answer in the HTML, or does it only appear after JavaScript runs?
5. **Check your analytics for AI traffic.** Can you tell how many requests came from AI assistants last month? If not, you do not know how big your second audience is.

Most sites fail at least two of these. Ours failed three.

## Why it usually fails

Nobody decides to build a site that agents cannot read. It happens through defaults that made sense when every reader was a person:

- **Search tuned for keywords.** Many search engines require every word in the query to match by default. People typed keywords, so that was fine. Agents type whole questions, and so do more people every year. "Can I schedule content to publish later" contains words your scheduling page may never use.
- **Content that only exists after JavaScript runs.** Fine in a browser. Slower and less reliable for anything else.
- **No clean version of a page.** An agent that wants your page gets the menu, footer and consent banner too.
- **Analytics that only sees browsers.** Tools that count pageviews with a JavaScript snippet never see an agent, because agents do not run your JavaScript. Your biggest audience can be invisible.

## How to fix it: the short version

The rest of the series takes each of these in turn, with code. In order of effort:

1. **Make site search tolerant of sentences** (post 2). With Algolia, four query settings stopped questions returning nothing. Adding meaning-based search with Azure AI Search put the right page first far more often.
2. **Log searches that find nothing and read the list every week** (post 3). We send a PostHog event for every search, with the result count, from the site and from our agent endpoint.
3. **Measure your search before you change it** (post 4). Fifty questions and a scoring script will tell you more than a month of opinions.
4. **Make sure your build cannot quietly delete content** (post 5). Ours did.
5. **Publish a clean Markdown copy of every page, an `llms.txt` index, and an MCP server** (post 6). In Next.js this is a couple of route handlers reading from the same CMS content as the HTML.
6. **If you put an assistant on your site, teach it to say "I don't know"** (post 7).
7. **Keep the human experience fast and accessible, and measure it** (post 8).

None of this is specific to our stack, and I will point out the equivalents as we go. But I will show you exactly what we used, because vague advice is the problem this series is trying to fix.

## Our stack, so you can follow along

- **Next.js 16** (App Router, with Cache Components) and **React** for the site, hosted on **Vercel**.
- **Agility CMS** for content. I co-founded it, so take my enthusiasm with a pinch of salt. Editors write in the CMS; the site reads it over GraphQL and the Fetch API.
- **Algolia** for site search.
- **Azure AI Search**, with embeddings from **Azure OpenAI**, for hybrid (keyword plus vector) search for AI agents.
- **PostHog** for product analytics, alerts and session replay, including server-side events for agent traffic.
- An **MCP server** (Model Context Protocol, the standard way to give an AI assistant tools) so assistants can search and read the docs directly.

## Counting your agent readers

Since step 5 of the check is the one most people cannot answer, here is how we count agent traffic. Agents do not run JavaScript, so a browser analytics snippet never sees them. You have to record them on the server.

In Next.js 16, every request passes through `proxy.ts` (what used to be called middleware) before anything renders. That is the place to do it. The trick is `waitUntil`: the analytics call runs after the response is sent, so it never slows a page down.

```ts
// proxy.ts
export async function proxy(request: NextRequest, event: NextFetchEvent) {
	const pathname = request.nextUrl.pathname;

	// First, so every outcome below is counted, and handed to waitUntil
	// so it never delays the response.
	event.waitUntil(
		reportAgentRequest({ pathname, userAgent: request.headers.get("user-agent"), method: request.method })
	);
	// ...
}
```

`reportAgentRequest` matches the user agent against the crawler names each AI company publishes, and puts each one in a category. Order matters, because the first match wins:

```ts
// lib/analytics/agentTraffic.ts
const AGENT_RULES: AgentRule[] = [
	{ pattern: /ChatGPT-User/i, agent: "ChatGPT-User", operator: "OpenAI", category: "ai-assistant" },
	{ pattern: /OAI-SearchBot/i, agent: "OAI-SearchBot", operator: "OpenAI", category: "ai-search" },
	{ pattern: /GPTBot/i, agent: "GPTBot", operator: "OpenAI", category: "ai-training" },
	{ pattern: /Claude-User/i, agent: "Claude-User", operator: "Anthropic", category: "ai-assistant" },
	{ pattern: /ClaudeBot|anthropic-ai/i, agent: "ClaudeBot", operator: "Anthropic", category: "ai-training" },
	{ pattern: /PerplexityBot/i, agent: "PerplexityBot", operator: "Perplexity", category: "ai-search" },
	// ... search engines, SEO tools, curl/python/node, then a generic "bot" fallback
];
```

It then sends one PostHog event, `docs_agent_request`, with the agent, its operator, its category and which kind of page it read (HTML, Markdown copy, `llms.txt` or the MCP server). The event uses one fixed ID per agent, creates no person profiles and stores no IP addresses or cookies, and nothing is sent outside production. It is wrapped in a `try` that swallows every error: analytics must never break a page.

The categories are the important part. A training crawler collecting data is not the same as ChatGPT fetching a page because someone asked a question five seconds ago. When you report "AI traffic", separate them, or the number means nothing. The 5,700 at the top of this post is only the `ai-assistant` and `ai-search` categories.

Two honest caveats about our numbers:

- **Agent HTML counts are a floor.** Our pages are cached at the edge for up to an hour, so a bot re-reading a popular page within that hour never reaches our code. The Markdown copies and `llms.txt` are cached for only a minute, so those counts are close to complete.
- **User agents can lie.** Some assistants browse with an ordinary browser user agent and get counted as people. Classification is a best effort.

## What happened when we tried it

We worked through every item above over a few weeks, with a lot of help from an AI coding agent, and measured as we went. Two results stood out.

**Search mattered more than anything else.** We wrote 52 real questions, each with its correct page, and scored our search on them. Our Algolia setup put the right page first for 25 of the 51 questions that have an answer. Azure AI Search, combining keyword and meaning-based (vector) search, put it first for 40. For an agent, that is the difference between quoting the right page and quoting the wrong one.

**We were wrong twice.** After the first run we wrote down that "about half the improvement comes from splitting long articles into sections". It sounded right. Then we measured it directly: splitting made no difference to the ranking at all. Later, once every article was indexed properly, the expensive extra step we had been most excited about, a semantic reranker that re-reads the top results, turned out to make the ranking slightly worse. We now use it for its score, not its order. If we had not kept measuring, we would have published confident advice that was simply false, twice. That lesson, measure before you believe, runs through the rest of the series.

## For people, too

Every change in this series also helps human readers:

- Sentence-tolerant search helps the newcomer who types a question because they do not know your vocabulary yet.
- A zero-results list is a content plan, written by your readers.
- A clean Markdown copy of a page is easy to paste into your own AI tool.
- A fast, server-rendered page is a fast page for everyone.

Where an agent-facing change does nothing for people, I will say so.

## What is coming

1. Your website has two kinds of readers now (this post)
2. Your search should understand a question, not just keywords
3. "No results" is feedback, so collect it
4. Measure your search before you change it
5. Your build should not be able to quietly delete content
6. Every page should be readable by a machine, without a second site
7. An assistant on your site should know when to say "I don't know"
8. Fast, accessible and working everywhere: measured, not assumed

## Your turn

Run the 10-minute check on your own site. Which step failed? And if you can measure it: do AI assistants read your site more or less often than people do? I would love to know whether our ratio is typical.

Next: **Your search should understand a question, not just keywords.**

*Parts of this work were done with an AI coding agent. The numbers come from our own measurements, and the mistakes are ours.*
