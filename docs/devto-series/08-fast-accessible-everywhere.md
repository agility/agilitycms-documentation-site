---
title: "Fast, accessible and working everywhere: measured, not assumed"
published: false
description: "The human half of the standard. How to check speed, accessibility and cross-browser behaviour with real data, and what to do when the data and your own testing disagree."
tags: webdev, a11y, nextjs, performance
series: Expect More From Your Website
---

<!--
DRAFT 2 (voice pass). Sources: PostHog, docs pages ($pathname starting /docs), last 30 days to 2026-10-14. axe run: 2026-10-14, one page, Chromium, desktop viewport.
Joel: the Firefox section is still deliberately unresolved. Watch the replays before this goes out and rewrite that section to say what they show, whichever way it goes.
-->

For 7 posts now, I've been going on about agents. Search that understands a question. Pages a machine can read. An assistant that knows when to say "I don't know".

This last one is about people.

None of that agent work is worth much if the page is slow, if somebody on a keyboard can't get to search, or if the search button does something weird in one browser.

It's also the post where I'm least sure of one of my own conclusions, and I'm going to show you that part instead of hiding it.

![Desktop, 75th percentile, last 30 days. Largest Contentful Paint 1,258 ms, good is 2.5 s or less. Interaction to Next Paint 64 ms, good is 200 ms or less. Cumulative Layout Shift 0.005, good is 0.1 or less. All three are in the good range. An automated accessibility check found 0 violations, with 1 rule needing a human.](img/out/08-fast-accessible-everywhere.gif)

## The standard

**Your site should be fast, usable with a keyboard and a screen reader, and working in every major browser, and you should know that from real-user data, since testing on your own laptop doesn't count.**

## The 10-minute check

No paid tools needed. A free analytics tier or your browser's dev tools will do.

1. **Look up your Core Web Vitals from real users.** These are Google's 3 page experience measures: LCP (Largest Contentful Paint, how long until the main content shows up), INP (Interaction to Next Paint, how long the page takes to respond to a click or key press) and CLS (Cumulative Layout Shift, how much the page jumps around while it loads). Use field data, from your analytics tool or the Chrome UX Report section of PageSpeed Insights. Write down the 75th percentile (p75), which is the value 3 out of 4 visits beat. Google's "good" lines are 2.5 seconds, 200 milliseconds and 0.1.
2. **Put the mouse away and press Tab** on one ordinary page. Count the presses until you get to search, then hit Enter. Does it open? Can you see where focus is the whole time?
3. **Run an automated accessibility check** on that same page. axe DevTools and Lighthouse are both free browser extensions. It takes about a minute.
4. **Open your site in a browser you never use.** If you live in Chrome, go try Firefox or Safari. Squish the window down narrow, then stretch it really wide.
5. **Go looking for rage clicks:** 3 or more fast clicks on the same spot. Most analytics tools that record clicks detect them. Break them down by browser.

## It worked on my machine

Usually it comes down to where we test:

- We test on our own machine. Fast laptop, fast connection, one browser, one window size. Real readers have all the others.
- A lab test is one simulated visit. Your Lighthouse score has never met the reader on hotel wifi.
- Frameworks make the slow path really easy. One uncached call can quietly turn a static page into one that renders on every single request. Nothing breaks, so nobody notices.
- Production plays by its own rules. Caching, routing and middleware all behave differently once you deploy, and the dev server forgives things that production won't.
- Analytics tells you *what* happened and leaves you guessing about *why*. A dashboard can say people clicked one button a whole lot. It can't tell you whether that button was broken.

## Fixing it, one habit at a time

### Step 1: Cache everything you can, then prove it after every build

Our docs run on Agility CMS (I co-founded it, so I'm biased) with a Next.js 16 front end hosted on Vercel. We use Cache Components, which means anything that does IO has to either live inside a `'use cache'` scope or get treated as request-time work. If it's request-time work, the page gets "postponed": Next.js ships a static shell and finishes the render on every request.

Every content read from the CMS gets wrapped like this (from `lib/cms/getSitemapFlat.ts`):

```ts
const cachedSitemapFlat = async (locale: string): Promise<SitemapFlat> => {
	"use cache";
	cacheTag(`agility-sitemap-flat-${locale}`);
	cacheLife("days");
	return fetchSitemapFlat(locale, false);
};
```

`cacheLife("days")` sets how long the entry lives. `cacheTag` lets a publish webhook expire it the moment an editor hits publish, so "days" doesn't mean stale content.

Trouble is, this rule is super easy to break without noticing. So after every build we run one line, and it has to print 0:

```bash
find .next/server/app -name '*.meta' | grep -v '\[' \
  | xargs grep -l '"postponed"' | wc -l
```

That counts the concrete pages (no `[param]` in the path) that Next.js marked as postponed. Parameterized routes legitimately have fallback shells, so we leave those out. On another stack, go find the build output that tells you which pages are static, and fail the build when one you expected to be static isn't.

### Step 2: Test the production path too

Our proxy (`proxy.ts`, which is what Next.js 16 calls middleware) answers real 404s for any path the CMS hasn't published. That means hand-written routes have to be listed, or the proxy treats them as unknown:

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

The catch? That check is skipped in `next dev` and in draft mode, because both of those read unpublished content. So your shiny new route works perfectly on your machine and 404s in production. Whatever you're running, ask which checks only run in production. A preview deploy for every pull request (Vercel, Netlify and Cloudflare all do this) is the cheapest way to find out.

### Step 3: Slice your real-user data by device and by browser

We use PostHog. Autocapture is turned on, so it records clicks and rage clicks without any extra code. Web vitals are just a project setting, also no code. And session replay records what the reader actually saw.

The habit that really pays off is breaking things down: vitals by device, rage clicks by browser and by element. A site-wide average hides exactly the reader you're failing.

### Step 4: Watch a replay before you call it

When the data and your own testing disagree, go watch a session replay BEFORE you decide anything.

This is the step people skip. Me included, as you're about to see.

## How our docs actually measured up

### Is it fast?

Here's the real-user p75 on our docs pages over the last 30 days, from PostHog:

| | LCP | INP | CLS | Samples (LCP / INP / CLS) |
|---|---|---|---|---|
| Desktop | 1,258 ms | 64 ms | 0.005 | 383 / 226 / 330 |
| Mobile | 959 ms | 86 ms | 0.0 | 26 / 10 / 3 |

Desktop is comfortably inside all 3 "good" lines! Mobile looks good too, but 3 CLS samples and 10 INP samples are an anecdote at best, so I'm not claiming a mobile result. TODO(data): rerun with 90 days, or once mobile has a few hundred samples.

The postponed-page check paid for itself pretty early. We had a helper that looks up a Vimeo video's thumbnail and title, and it used a bare `fetch` with `next: { revalidate: 86400 }`. Under Cache Components, that option caches NOTHING. The fetch counted as request-time IO, so the 11 articles that embed a Vimeo video were shipping a header-only shell and rendering the whole body on every request, while every other article was static.

Oops.

The fix was to move the call inside a `'use cache'` scope with `cacheLife("days")`. The check found it. A person wouldn't have.

### Can everyone use it?

I ran axe-core 4.12 (the WCAG 2.1 A and AA rules) with Playwright and Chromium against one typical article, at a desktop window size. Results:

- **0 violations**, and 28 rules passed.
- **1 rule incomplete:** colour contrast, on 3 elements that axe couldn't decide on automatically. Those need a human with a contrast checker.
- **Keyboard:** search was the 5th Tab stop, and Enter opened it. The first stop was a promotional banner link, and there's no "skip to content" link before it. That's worth fixing for screen reader and keyboard users on every page.

Go easy on that "0 violations", though. Automated tools can't tell you whether a screen reader announces search results sensibly, or whether focus lands back in the right place when the dialog closes. TODO(data): a manual pass with a screen reader (NVDA or VoiceOver) on the same page.

### The Firefox mystery

PostHog showed a cluster of rage clicks on our collapsed search button. In Firefox, over the last 30 days, there were 273 rage clicks on docs pages, and 269 of them were on that one button. They came from 32 sessions (32 distinct visitor profiles), on 9 different days between September 17 and October 10, and every single one was in a window at least 1,280 pixels wide. Chrome and Edge, over the same stretch, had 2 and 1 rage clicks on that button.

An AI coding agent looked at that and concluded the button was broken in Firefox. It sounded right, and I nearly wrote it down.

Then I tested Firefox by hand on October 13. Search opened, and it worked.

PostHog recorded one Firefox `docs_search` event that day. It was the only one of 79 docs searches in the last 30 days that came from Firefox.

So the data says one thing and my own test says another. Here's what the button does, from `components/common/SearchModal.tsx`:

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

It's an icon-sized button that grows leftward into a full search field over 200 milliseconds when you hover it or give it keyboard focus. Click it, and it opens a dialog.

I've got 2 hypotheses, and **neither one is confirmed**:

1. **The expanding button confuses rage-click detection, or the reader.** The thing under the pointer changes size and content right as the pointer arrives. Somebody might click, see it animate, and click again. That'd still be a design problem worth fixing, with a button that technically works.
2. **There's a real, intermittent problem** that only shows up in some Firefox setups at wide sizes, and my one test just didn't hit it. That's 32 visitors on 9 different days: a pattern, and a lot more than one frustrated reader.

Here's what the data can't settle. We only send `docs_search` after somebody types at least 2 characters and pauses for a second. If a reader opens search and closes it without typing anything, there's no event at all. So "almost no searches from Firefox" doesn't prove the dialog failed to open.

There's one more clue I can't explain yet. We've been capturing rage clicks on docs pages since late July, and the button's design hasn't changed since July. So when's the first Firefox rage click on it? September 17. Something changed around then: our code, Firefox, a browser extension, or who was visiting. TODO(data): find out what changed on September 17.

TODO(data): watch the session replays for a sample of those 32 sessions and see whether the dialog opened.

So what did I actually get wrong? It wasn't the button. I nearly took an agent's conclusion straight off a dashboard without watching a single replay. Analytics tells you something happened. A replay shows you what.

## You don't have to pick a side

This whole post is the human half of the standard, and you shouldn't have to trade it away to serve agents. In our experience, you don't. A cached static page is fast for a reader and cheap for a crawler. Real headings and properly labelled buttons work for a screen reader, and they work for an agent too.

## All 8 standards on one page

Here's the whole series as one checklist. Go ahead and paste it into an issue, a README or your team wiki, and only tick the boxes you can prove with data. Gut feel doesn't count!

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

None of these needs our stack. Every one of them needs somebody to actually look.

Your readers are the best source for what's missing. We use search logs and a public roadmap where anyone can submit an idea (roadmap.agilitycms.com/submit-idea). Whatever you use, make it really easy for readers to tell you.

## So, which box couldn't you tick?

Run the checklist on your own site and tell me in the comments which item you couldn't prove with data. And if you've ever had a dashboard and your own testing disagree, I'd love to hear which one turned out to be right!

That's a wrap on the series. If you're new here, start at the beginning: **Your website has two kinds of readers now**.

*One last disclosure: an AI coding agent did a ton of the work behind this post, including the Firefox conclusion I nearly published. The numbers are from our own measurements, and the mistakes are ours.*
