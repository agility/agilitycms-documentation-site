---
title: "Your website has two kinds of readers now"
published: false
description: "In the last 30 days, AI assistants read our docs more often than people did. What to expect from your site for both kinds of reader, and a 10-minute check to see where you stand."
tags: webdev, ai, nextjs, search
series: Expect More From Your Website
---

<!--
DRAFT 3 (voice pass). Numbers: PostHog, docs project, 30 days to 2026-10-14. Re-pull them the week this is published, and re-render the illustration.
-->

I was digging through our docs analytics and found a number I didn't expect.

In the last 30 days, people viewed pages on our documentation site about 2,500 times. In those same 30 days, AI assistants and AI search tools fetched our pages about 5,700 times. That's ChatGPT, Claude, Perplexity and friends, reading our docs on behalf of somebody who may never visit the site at all.

And that's not counting the training crawlers (another 6,800 requests), the regular search engines (5,400) or all the scripts that hit any public site. Those are a different story. These 5,700 are readers. They just aren't people.

So who is your website actually for?

I've been building websites for a long time, and I co-founded a CMS company, so I've spent a LOT of time thinking about how people read web pages. That number made me realize I'd been building for half the audience.

This series is about raising the bar for both halves. Not on our site. On yours.

![A docs page sends content to people and to AI agents. People: 2,456 pageviews. AI assistants and AI search: 5,701 requests, about 2.3 times as many.](img/out/01-two-kinds-of-readers.gif)

## The standard

**Your website should work well for 2 kinds of reader: the people who visit it, and the AI agents that read it for them.**

That doesn't mean building 2 sites, and it doesn't mean making things worse for people. In my experience, almost everything that helps an agent helps a person too. There are a few spots where that isn't true, and I'll point them out when we get there.

## What does an agent actually need?

A search engine crawler mostly cared about titles, links and speed. It read your page so it could send a person there later.

An agent is a different animal. When somebody asks Claude "how does pagination work in this API?" or asks ChatGPT "does this CMS support multiple languages?", the assistant:

1. **Searches** for likely pages, often using the whole question as the query.
2. **Fetches** those pages and reads the whole thing, not just the title.
3. **Answers** in its own words, hopefully with a link back to you.

If your search can't handle a question, the agent grabs the wrong page. If your page is mostly navigation, scripts and cookie banners, the agent has to guess which part is the answer. Either way, somebody gets a vague or wrong answer, and your product's name is right there next to it.

## The 10-minute check

You can do this today, on any site, with a browser and an AI assistant.

1. **Pick 3 questions your site answers.** Real ones, from support tickets or sales calls, written the way a customer would ask them.
2. **Ask an AI assistant each one** (ChatGPT, Claude, Copilot, whatever your customers use). Does it find your page? A competitor's page? Or does it just make something up?
3. **Type the same 3 questions into your own site search**, exactly as written. How many come back empty?
4. **Fetch one page the way a machine would:** `curl -s https://your-site.com/some-page | less`. Is the answer in the HTML, or does it only show up after JavaScript runs?
5. **Check your analytics for AI traffic.** Can you tell how many requests came from AI assistants last month? If you can't, you don't know how big your second audience is.

Most sites fail at least 2 of these. Ours failed 3.

## Why does this keep happening?

Nobody sets out to build a site that agents can't read. It happens because of defaults that made total sense when every reader was a person:

- **Search tuned for keywords.** Lots of search engines require every word in the query to match, by default. People typed keywords, so that was fine! Agents type whole questions, and so do more and more people. "Can I schedule content to publish later" has words in it that your scheduling page might never use.
- **Content that only exists after JavaScript runs.** Fine in a browser. Slower and flakier for anything else.
- **No clean version of the page.** An agent that wants your page gets your menu, your footer and your consent banner too.
- **Analytics that only sees browsers.** If you count pageviews with a JavaScript snippet, you'll never see an agent, because agents don't run your JavaScript. Your biggest audience can be completely invisible.

## The short version of the fix

The rest of the series takes each of these one at a time, with code. Roughly in order of effort:

1. **Make your site search handle sentences** (post 2). With Algolia, 4 query settings stopped questions from coming back empty. Adding meaning-based search with Azure AI Search put the right page first way more often.
2. **Log the searches that find nothing, and actually read the list every week** (post 3). We send a PostHog event for every search, with the result count, from the site and from our agent endpoint.
3. **Measure your search before you change it** (post 4). 50 questions and a scoring script will tell you more than a month of opinions.
4. **Make sure your build can't quietly delete content** (post 5). Ours did. Oops.
5. **Publish a clean Markdown copy of every page, an `llms.txt` index, and an MCP server** (post 6). In Next.js that's a couple of route handlers reading from the same CMS content as your HTML.
6. **If you put an assistant on your site, teach it to say "I don't know"** (post 7).
7. **Keep the human experience fast and accessible, and measure it** (post 8).

None of this is specific to our stack, and I'll point out the equivalents as we go. But I'm going to show you exactly what we used, because vague advice is the problem this whole series is trying to fix.

## Our stack, so you can follow along

- **Next.js 16** (App Router, with Cache Components) and **React** for the site, hosted on **Vercel**.
- **Agility CMS** for content. BTW: I co-founded it, so take my enthusiasm with a grain of salt. Editors write in the CMS, and the site reads it over GraphQL and the Fetch API.
- **Algolia** for site search.
- **Azure AI Search**, with embeddings from **Azure OpenAI**, for hybrid (keyword plus vector) search for AI agents.
- **PostHog** for analytics, alerts and session replay, including server-side events for agent traffic.
- An **MCP server** (Model Context Protocol, which is the standard way to give an AI assistant tools) so assistants can search and read the docs directly.

## Counting your agent readers

Step 5 of the check is the one most people can't answer, so here's how we count agent traffic. Agents don't run JavaScript, so a browser analytics snippet never sees them. You have to catch them on the server.

In Next.js 16, every request goes through `proxy.ts` (what used to be called middleware) before anything renders. That's the spot. The trick is `waitUntil`: the analytics call runs after the response has already gone out, so it never slows a page down.

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

`reportAgentRequest` matches the user agent against the crawler names each AI company publishes, and drops each one into a category. Order matters here, because the first match wins:

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

Then it sends one PostHog event, `docs_agent_request`, with the agent, who runs it, its category and what kind of page it read (HTML, the Markdown copy, `llms.txt` or the MCP server). Each agent gets one fixed ID, there are no person profiles, and we don't store IP addresses or cookies. Nothing gets sent outside production. The whole thing is wrapped in a `try` that swallows every error, because analytics should never, ever break a page.

The categories are the important part. A training crawler hoovering up data isn't the same thing as ChatGPT fetching a page because somebody asked a question 5 seconds ago. If you report "AI traffic", split them up, or the number doesn't mean anything. The 5,700 at the top of this post is only the `ai-assistant` and `ai-search` categories.

A couple of caveats on our numbers:

- **Agent HTML counts are a floor.** Our pages are cached at the edge for up to an hour, so a bot that re-reads a popular page within that hour never reaches our code. The Markdown copies and `llms.txt` are only cached for a minute, so those counts are pretty close to complete.
- **User agents can lie.** Some assistants browse with a normal browser user agent, so they get counted as people. This is a best effort.

## What happened when we tried it

We worked through everything above over a few weeks, with a ton of help from an AI coding agent, measuring as we went. 2 things jumped out.

**Search mattered more than anything else.** We wrote 52 real questions, each with its correct page, and scored our search against them. Our Algolia setup put the right page first for 25 of the 51 questions that actually have an answer. Azure AI Search, combining keyword and meaning-based (vector) search, put it first for 40. For an agent, that's the difference between quoting the right page and quoting the wrong one.

**I was wrong. Twice.** After the first test run, I wrote down that "about half the improvement comes from splitting long articles into sections". Sounded right to me! Then we measured it directly, and splitting made no difference to the ranking at all. Later, once every article was indexed properly, the fancy extra step I was most excited about (a semantic reranker that re-reads the top results) turned out to make the ranking slightly worse. We only use it for its score now, not its order. If we hadn't kept measuring, I'd have published confident advice that was just plain false, twice. You'll see that theme all through this series: measure it before you believe it.

## And it helps people too

Every change in this series helps your human readers as well:

- Search that handles sentences helps the newcomer who types a question because they don't know your vocabulary yet.
- A list of searches that found nothing is a content plan, written by your readers.
- A clean Markdown copy of a page is really easy to paste into your own AI tool.
- A fast, server-rendered page is a fast page for everyone.

When an agent-facing change does nothing for people, I'll tell you.

## What's coming up

1. Your website has two kinds of readers now (you're here)
2. Your search should understand a question, not just keywords
3. "No results" is feedback, so collect it
4. Measure your search before you change it
5. Your build should not be able to quietly delete content
6. Every page should be readable by a machine, without a second site
7. An assistant on your site should know when to say "I don't know"
8. Fast, accessible and working everywhere: measured, not assumed

## How about you?

Go run the 10-minute check on your own site. Which step failed? And if you can measure it: do AI assistants read your site more or less than people do? I'd really love to know if our ratio is typical, so drop it in the comments.

Next up: **Your search should understand a question, not just keywords.**

*Full disclosure: I did a lot of this work with an AI coding agent. The numbers come from our own measurements, and the mistakes are all mine.*
