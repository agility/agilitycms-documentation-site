---
title: "Fast, accessible and working everywhere: measured, not assumed"
published: false
description: "The human half of the standard. How to check speed, accessibility and cross-browser behaviour with real data, and what to do when the data and your own testing disagree."
tags: webdev, a11y, nextjs, performance
series: Expect More From Your Website
---

<!--
DRAFT 1. Joel: the Firefox section is deliberately unresolved. Watch the replays before this goes out and rewrite that section to say what they show, whichever way it goes.
Numbers: PostHog, docs pages ($pathname starting /docs), last 30 days to 2026-10-14. axe run: 2026-10-14, one page, Chromium, desktop viewport.
-->

Seven posts in this series have been about agents: search that understands questions, pages a machine can read, an assistant that knows when to say "I don't know".

This last one is about people. None of the agent work is worth much if the page is slow, if a keyboard user cannot reach search, or if the search button does something strange in one browser.

It is also the post where I am least sure of one of my own conclusions, and I am going to show you that instead of hiding it.

## The standard

**Your site should be fast, usable with a keyboard and a screen reader, and working in every major browser, and you should know this from real-user data, not from testing on your own laptop.**

## The 10-minute check

No paid tools needed. A free analytics tier or your browser's dev tools will do.

1. **Look up your Core Web Vitals from real users.** These are Google's three page experience measures: LCP (Largest Contentful Paint, how long until the main content shows), INP (Interaction to Next Paint, how long the page takes to respond to a click or key press) and CLS (Cumulative Layout Shift, how much the page jumps around while loading). Use field data: your analytics tool, or the Chrome UX Report section of PageSpeed Insights. Note the 75th percentile (p75), the value 3 in 4 visits beat. Google's "good" lines are 2.5 seconds, 200 milliseconds and 0.1.
2. **Put the mouse away and press Tab** on one ordinary page. Count the presses until you reach search. Press Enter. Does it open? Can you see where focus is the whole time?
3. **Run an automated accessibility check** on that page. axe DevTools and Lighthouse are free browser extensions. It takes a minute.
4. **Open your site in a browser you never use.** If you live in Chrome, try Firefox or Safari. Try a narrow window and a very wide one.
5. **Look for rage clicks:** three or more fast clicks on the same spot. Most analytics tools that record clicks detect them. Break them down by browser.

## Why it usually fails

- **We test on our own machine.** A fast laptop, a fast connection, one browser, one window size. Real readers have all the others.
- **Lab tests are not field data.** A Lighthouse score is one simulated visit, not the reader on hotel wifi.
- **Frameworks make the slow path easy.** One uncached call can quietly turn a static page into one that renders on every request. Nothing breaks, so nobody notices.
- **Production is not development.** Caching, routing and middleware behave differently once deployed, and the dev server is forgiving in ways production is not.
- **Analytics shows *what*, not *why*.** A dashboard says people clicked one button a lot. It does not say whether the button was broken.

## How to fix it

### 1. Cache what can be cached, and check it after every build

Our docs run on Agility CMS, which I co-founded, with a Next.js 16 front end on Vercel. We use Cache Components: anything that does IO must either sit in a `'use cache'` scope or be treated as request-time work. If it is request-time work, the page is "postponed": Next.js ships a static shell and finishes the render on every request.

Every content read from our CMS is wrapped like this (from `lib/cms/getSitemapFlat.ts`):

```ts
const cachedSitemapFlat = async (locale: string): Promise<SitemapFlat> => {
	"use cache";
	cacheTag(`agility-sitemap-flat-${locale}`);
	cacheLife("days");
	return fetchSitemapFlat(locale, false);
};
```

`cacheLife("days")` sets how long the entry lives. `cacheTag` lets a publish webhook expire it the moment an editor publishes, so "days" does not mean stale content.

The rule is easy to break without noticing. So after every build we run one line, and it must print 0:

```bash
find .next/server/app -name '*.meta' | grep -v '\[' \
  | xargs grep -l '"postponed"' | wc -l
```

It counts concrete pages (no `[param]` in the path) that Next.js marked as postponed. Parameterised routes legitimately have fallback shells, so we leave them out. On another stack, find the build output that says which pages are static, and fail the build when one you expected to be static is not.

### 2. Test the production path, not just the dev server

Our proxy (`proxy.ts`, the Next.js 16 name for middleware) answers real 404s for paths the CMS has not published. Hand-written routes have to be listed, or the proxy treats them as unknown:

```ts
const APP_PATHS = new Set([
	"/",
	"/llms.txt",
	"/robots.txt",
	"/sitemap.xml",
	// ...
]);

const isAppPath = (path: string): boolean =>
	APP_PATHS.has(path) || API_REFERENCE_PATHS.has(path);
```

The check is skipped in `next dev` and in draft mode, because both read unpublished content. So a new route works perfectly on your machine and 404s in production. Whatever your stack, ask which checks only run in production. A preview deploy for every pull request (Vercel, Netlify and Cloudflare all do this) is the cheapest way to find out.

### 3. Watch real-user data, by page and by browser

We use PostHog. Autocapture is on, which records clicks and rage clicks with no extra code. Web vitals are a project setting, also no code. Session replay records what the reader actually saw.

The useful habit is a breakdown, not a total: vitals by device, rage clicks by browser and element. A site-wide average hides exactly the reader you are failing.

### 4. When the data and your own testing disagree, watch a replay before you decide

The step people skip, me included.

## What happened when we tried it

### Speed

Real-user p75 on docs pages over the last 30 days, from PostHog:

| | LCP | INP | CLS | Samples (LCP / INP / CLS) |
|---|---|---|---|---|
| Desktop | 1,258 ms | 64 ms | 0.005 | 383 / 226 / 330 |
| Mobile | 959 ms | 86 ms | 0.0 | 26 / 10 / 3 |

Desktop is comfortably inside all three "good" lines. Mobile looks good too, but 3 CLS samples and 10 INP samples are an anecdote, not a measurement, so I am not claiming a mobile result. TODO(data): rerun with 90 days, or once mobile has a few hundred samples.

The postponed-page check earned its place early. A helper that looks up a Vimeo video's thumbnail and title used a bare `fetch` with `next: { revalidate: 86400 }`. Under Cache Components that option caches nothing. The fetch counted as request-time IO, and the eleven articles that embed a Vimeo video shipped a header-only shell and rendered the whole body on every request, while every other article was static. The fix was to move the call inside a `'use cache'` scope with `cacheLife("days")`. The check found it; a person would not have.

### Accessibility

I ran axe-core 4.12 (WCAG 2.1 A and AA rules) with Playwright and Chromium against one typical article, at a desktop window size:

- **0 violations**, 28 rules passed.
- **1 rule incomplete:** colour contrast, on 3 elements axe could not decide automatically. Those need a human with a contrast checker.
- **Keyboard:** search was the 5th Tab stop, and Enter opened it. The first stop was a promotional banner link. There is no "skip to content" link before it, which is worth fixing for screen reader and keyboard users on every page.

Be careful with "0 violations". Automated tools cannot tell you whether a screen reader announces search results sensibly, or whether focus returns to the right place when the dialog closes. TODO(data): a manual pass with a screen reader (NVDA or VoiceOver) on the same page.

### Firefox, and what I got wrong

PostHog showed a cluster of rage clicks on our collapsed search button: 273 rage clicks on docs pages in Firefox over the last 30 days, 269 of them on that button. They came from 32 sessions (32 distinct visitor profiles), on 9 different days between September 17 and October 10, and every one was in a window at least 1,280 pixels wide. Chrome and Edge, over the same period, had 2 and 1 rage clicks on that button.

An AI coding agent concluded the button was broken in Firefox. It sounded right, and I nearly wrote it down.

Then I tested Firefox by hand on October 13. Search opened and worked. PostHog recorded one Firefox `docs_search` event that day: the only one of 79 docs searches in the last 30 days that came from Firefox.

So the data and my own test disagree. Here is what the button does, from `components/common/SearchModal.tsx`:

```tsx
<div className="relative h-9 w-9 shrink-0">
	<DialogTrigger
		aria-label="Search docs"
		className="... absolute right-0 top-0 h-9 w-9 overflow-hidden
		  transition-[width,padding,border-color] duration-200
		  hover:w-48 focus-visible:w-48 ..."
	>
		{/* icon, then "Search docs..." and a ⌘K hint that fade in */}
	</DialogTrigger>
</div>
```

It is an icon-sized button that grows leftward into a full search field over 200 milliseconds on hover or keyboard focus. Clicking it opens a dialog.

I have two hypotheses, and **neither is confirmed**:

1. **The expanding button confuses rage-click detection, or the reader.** The element under the pointer changes size and content as the pointer arrives. Someone might click, see it animate, and click again. That would be a design problem worth fixing, but not a broken button.
2. **There is a real, intermittent problem** that only shows up in some Firefox setups at wide sizes, and my one test did not hit it. Thirty-two visitors on nine different days is a pattern, not one frustrated reader.

What the data cannot settle: we only send `docs_search` after someone types at least two characters and pauses for a second. A reader who opened search and closed it without typing leaves no event. So "almost no searches from Firefox" does not prove the dialog failed to open.

One clue I cannot explain yet: we have been capturing rage clicks on docs pages since late July, and the button's design has not changed since July, but the first Firefox rage click on it is on September 17. Something changed around then: our code, Firefox, a browser extension, or who was visiting. TODO(data): find out what changed on September 17.

TODO(data): watch the session replays for a sample of those 32 sessions and see whether the dialog opened.

What I got wrong was not the button. It was nearly accepting an agent's conclusion from a dashboard without watching a single replay. Analytics tells you something happened. A replay tells you what.

## For people, too

This whole post is the human half, and you should not have to trade it away to serve agents. In our experience you do not. A cached static page is fast for a reader and cheap for a crawler. Real headings and labelled buttons work for a screen reader and for an agent alike.

## The eight standards: a checklist to copy

Paste this into an issue, a README or a team wiki, and tick what you can prove with data rather than belief.

```markdown
## Expect more from your website

- [ ] 1. It works for two kinds of readers: people, and the agents reading on their behalf.
      Check: ask an AI assistant 3 real questions; type them into your own search.
- [ ] 2. Search understands a question, not just keywords.
      Check: a full-sentence question returns the right page.
- [ ] 3. "No results" is collected and read as feedback.
      Check: you can list last week's zero-result searches.
- [ ] 4. Search is measured before it is changed.
      Check: a fixed set of real questions with known answers, scored.
- [ ] 5. A build cannot quietly delete content.
      Check: the build refuses to replace the index when a list hits its limit.
- [ ] 6. Every page is readable by a machine, without a second site.
      Check: a plain-text or Markdown copy at a predictable URL, listed in llms.txt.
- [ ] 7. An assistant on the site knows when to say "I don't know".
      Check: ask it something the site does not answer.
- [ ] 8. Fast, accessible and working everywhere, measured not assumed.
      Check: field p75 for LCP, INP and CLS by device; keyboard to search;
      an axe run; rage clicks by browser; a replay before any verdict.
```

None of these needs our stack. Every one needs someone to look.

Your readers are the best source for what is missing. We use search logs and a public roadmap where anyone can submit an idea (roadmap.agilitycms.com/submit-idea). Whatever you use, make it easy for readers to tell you.

## Your turn

Run the checklist on your own site and tell me in the comments which item you could not prove with data. And if you have ever had a dashboard and your own testing disagree, tell me which one turned out to be right.

This is the last post in the series. If you are new here, start at the beginning: **Your website has two kinds of readers now**.

*Parts of this work were done with an AI coding agent. The numbers are from our own measurements, and the mistakes are ours.*
