---
title: "Fast, accessible and working everywhere: measured, not assumed"
published: false
description: "The human half of the standard. How to check speed, accessibility and cross-browser behaviour with real data, and what to do when the data and your own testing disagree."
tags: webdev, a11y, nextjs, performance
series: Expect More From Your Website
---

<!--
DRAFT 3. Sources: PostHog project 33241, $host = agilitycms.com and $pathname starting /docs, 2026-09-17 to 2026-10-15 (web vitals on production docs start 2026-09-17, so 30 and 90 days are the same). axe run: 2026-10-14, one page, Chromium, desktop viewport.
Firefox: PostHog data (2026-10-15) points to automated traffic; see the JOEL note in that section. Rage-click counts are Sep 17 to Oct 10 (Oct 14 added 9 sessions; full window is 322 clicks, 312 on the button, 41 sessions, 10 days).
-->

For 7 posts now, I've been going on (and on...) about agents - search that understands a question, pages a machine can actually read, and an assistant that knows when to say "I don't know".

Now let's talk about people - like you and me - the meat-suits, if you will. ;)

Because none of that agent work is worth much if the page is slow, or if somebody on a keyboard can't get to search, or if the search button does something weird in one browser and you never find out about it.

This is also the post where I'm the LEAST sure of one of my own conclusions, and I'm gonna show you that part instead of hiding it.

![Desktop, 75th percentile, production docs since September 17. Largest Contentful Paint 1,252 ms, good is 2.5 s or less. Interaction to Next Paint 64 ms, good is 200 ms or less. Cumulative Layout Shift 0.005, good is 0.1 or less. All three are in the good range. An automated accessibility check found 0 violations, with 1 rule needing a human.](img/out/08-fast-accessible-everywhere.gif)

## The standard

**Your site should be fast, usable with a keyboard and a screen reader, and working in every major browser - and you should know that from real-user data, because testing on your own laptop doesn't count!**

## The 10-minute check

No paid tools needed for this one. A free analytics tier or your browser's dev tools will do just fine.

1. Look up your Core Web Vitals from *real users*. These are Google's 3 page experience measures: LCP (Largest Contentful Paint, how long until the main content shows up), INP (Interaction to Next Paint, how long the page takes to respond to a click or key press) and CLS (Cumulative Layout Shift, how much the page jumps around while it loads). Use field data, from your analytics tool or the Chrome UX Report section of PageSpeed Insights. Write down the 75th percentile (p75), which is the value 3 out of 4 visits beat. Google's "good" lines are 2.5 seconds, 200 milliseconds and 0.1.
2. Put the mouse away and press Tab on one ordinary page. Count the presses until you get to search, then hit Enter. Does it open? Can you see where focus is the whole time?
3. Run an automated accessibility check on that same page - axe DevTools and Lighthouse are both free browser extensions, and it takes about a minute.
4. Open your site in a browser you NEVER use. If you live in Chrome, go try Firefox or Safari for a change. Squish the window down narrow, then stretch it really wide.
5. Go looking for rage clicks, which is 3 or more fast clicks on the same spot. Most analytics tools that record clicks will detect them for you. Break them down by browser.

## It worked on my machine

Nobody sets out to ship a slow or broken page, and usually it comes down to where (and how) we test:

- We test on our own machine - fast laptop, fast connection, one browser, one window size. Real readers have all the others.
- A lab test is one simulated visit, and your Lighthouse score has never met the reader on hotel wifi.
- Frameworks make the slow path really easy. One uncached call can quietly turn a static page into one that renders on every single request, and since nothing breaks, nobody notices...
- Production plays by its own rules. Caching, routing and middleware all behave differently once you deploy, and the dev server forgives a LOT of things that production won't.
- Analytics tells you *what* happened and leaves you guessing about *why*. A dashboard can say people clicked one button a whole lot, but it can't tell you whether that button was actually broken.

## Fixing it, one habit at a time

### Step 1: Cache everything you can, then prove it after every build

A bit of context on how our docs are built first. They run on Agility CMS (BTW: I've been at Agility for 21 years, so I'm a little biased) with a Next.js 16 front end hosted on Vercel. We use Cache Components, which means anything that does IO has to either live inside a `'use cache'` scope or get treated as request-time work. And if it's request-time work, the page gets "postponed" - Next.js ships a static shell and then finishes the render on EVERY request.

So every content read from the CMS gets wrapped like this (from `lib/cms/getSitemapFlat.ts`):

```ts
const cachedSitemapFlat = async (locale: string): Promise<SitemapFlat> => {
	"use cache";
	cacheTag(`agility-sitemap-flat-${locale}`);
	cacheLife("days");
	return fetchSitemapFlat(locale, false);
};
```

`cacheLife("days")` sets how long the entry lives, and `cacheTag` lets a publish webhook expire it the moment an editor hits publish - so "days" doesn't mean stale content.

Trouble is, this rule is SUPER easy to break without noticing. So after every build we run one line, and it has to print 0:

```bash
find .next/server/app -name '*.meta' | grep -v '\[' \
  | xargs grep -l '"postponed"' | wc -l
```

That counts the concrete pages (no `[param]` in the path) that Next.js marked as postponed. Parameterized routes legitimately have fallback shells, so we leave those out. If you're on another stack, go find the build output that tells you which pages are static, and fail the build when one you *expected* to be static isn't.

### Step 2: Test the production path too

Our proxy (`proxy.ts`, which is what Next.js 16 calls middleware) answers real 404s for any path the CMS hasn't published. That means hand-written routes have to be listed, or else the proxy treats them as unknown:

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

The catch? That check is skipped in `next dev` and in draft mode, because both of those read unpublished content. So your shiny new route works perfectly on your machine... and 404s in production. Whatever you're running, ask yourself which checks only run in production. A preview deploy for every pull request (Vercel, Netlify and Cloudflare all do this) is the cheapest way to find out.

### Step 3: Slice your real-user data by device and by browser

We use PostHog for this (you already know I like it a LOT). Autocapture is turned on, so it records clicks and rage clicks without any extra code, web vitals are just a project setting (also no code), and session replay records what the reader actually saw.

The habit that really pays off is breaking things down - vitals by device, rage clicks by browser and by element. A site-wide average hides *exactly* the reader you're failing.

### Step 4: Watch a replay before you call it

When the data and your own testing disagree, go watch a session replay BEFORE you decide anything. This is the step people skip (me included, as you're about to see).

## How our docs actually measured up

### Is it fast?

Here's the real-user p75 on our production docs pages since PostHog went live on them (September 17 to October 15):

| | LCP | INP | CLS | Samples (LCP / INP / CLS) |
|---|---|---|---|---|
| Desktop | 1,252 ms | 64 ms | 0.005 | 344 / 206 / 297 |
| Mobile | 1,079 ms | 86 ms | 0.0 | 29 / 10 / 3 |

Desktop is comfortably inside all 3 "good" lines! Mobile looks good too, but 3 CLS samples and 10 INP samples are an anecdote at best, so I'm not gonna claim a mobile result yet. (Fun fact: the first time I pulled these, I accidentally included our preview deployments too. Filter by your production hostname, folks!)

The postponed-page check paid for itself pretty early, too. We had a helper that looks up a Vimeo video's thumbnail and title, and it used a bare `fetch` with `next: { revalidate: 86400 }`. Under Cache Components, that option caches NOTHING. The fetch counted as request-time IO, so the 11 articles that embed a Vimeo video were shipping a header-only shell and rendering the whole body on every request, while every other article was static. Oops!

The fix was to move the call inside a `'use cache'` scope with `cacheLife("days")`. The check found it - a person clicking around the site wouldn't have.

### Can everyone use it?

<!-- JOEL: You tweeted in 2019 that software should be judged on how inclusive it is ("Thought for the day: Software should promote inclusivity"). This is the place for why accessibility matters to you personally. -->

I ran axe-core 4.12 (the WCAG 2.1 A and AA rules) with Playwright and Chromium against one typical article, at a 1280x720 window. Here's what came back:

- **0 violations**, and 28 rules passed.
- 1 rule incomplete - colour contrast, on 3 elements that axe couldn't decide on automatically. Those need a human with a contrast checker.
- On the keyboard, search was the 5th Tab stop, and Enter opened it. The first stop was a promotional banner link, though, and there's no "skip to content" link before it. That's worth fixing for screen reader and keyboard users on every page.

Go easy on that "0 violations", though! So I went a step further and had an agent drive the search dialog with a real keyboard, in Chrome AND Firefox, and read the accessibility tree a screen reader would see. The good news: Enter opens search, focus lands in the box, Tab can't escape the dialog, and Escape puts you right back on the button. The not-so-good news:

- **The results are silent.** Type a query and a sighted person sees "116 results" - a screen reader user hears... nothing. Same for "No results". There's no live region telling anybody that anything happened.
- **Space on a result types a space** instead of opening it. Oops.
- **⌘K opens 2 dialogs.** We render 2 search buttons in the header (one hidden, depending on the window size), and each one listens for the shortcut... so you get 2 dialogs stacked on top of each other, and you need to press Escape twice. Nobody clicking around with a mouse would ever notice!
- **"5th Tab stop" depends on your window.** At 1440 wide, search is the *27th* stop, because tabbing onto "APIs & SDKs" opens its mega menu and you get to walk through every link in it.

None of these showed up in axe, and every one of them is a 1 or 2 line fix. That's kinda the point: automated checks find the easy stuff, and you still need to actually *use* the thing the way your readers do. TODO(data): a real pass with a screen reader (NVDA or VoiceOver) on the same page, to hear the actual wording.

<!-- JOEL: All of these are fixed in PR #85 (not merged yet): silent results, Space, double Cmd+K, the skip link, real landmarks, and the mega menu (search is now the 13th Tab stop at 1440, was 27th). Once it ships, Claude can rewrite this section as "here is what we found, and here is the fix". The VoiceOver pass is about 10 minutes on your Mac: Cmd+F5, Tab to Search docs, type a query, arrow through results. -->

### The Firefox mystery

OK, this is my favourite part of the whole series. PostHog showed a cluster of rage clicks on our collapsed search button. In Firefox, between September 17 and October 10, there were 273 rage clicks on docs pages, and 269 of them were on that ONE button. They came from 32 sessions (32 distinct visitor profiles) on 9 different days, and every single one was in a window at least 1,280 pixels wide. Chrome and Edge, over the same stretch, had 2 and 1 rage clicks on that button.

An AI coding agent looked at that and concluded the button was broken in Firefox. It sounded right (it sounded right to me, anyway), and I nearly wrote it down.

Then I tested Firefox by hand on October 13. Search opened, and it worked just fine.

<!-- JOEL: What did your test actually look like? Which machine, Mac or Windows, what you clicked. And how close you came to publishing the agent's conclusion. -->

PostHog recorded one Firefox `docs_search` event that day - and it was the only one of 79 docs searches in the last 30 days that came from Firefox.

So the data says one thing and my own test says another. Hmm. Here's what the button actually does, from `components/common/SearchModal.tsx`:

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

It's an icon-sized button that grows leftward into a full search field over 200 milliseconds when you hover it or give it keyboard focus. Click it, and it opens a dialog. Pretty simple, right?

I had 2 theories. Maybe the expanding button was confusing people (it changes size right as the pointer arrives, so you click, it animates, you click again). Or maybe there was some weird, intermittent Firefox bug at wide window sizes that my one test just didn't hit.

Both wrong!

So I went digging (well... I sent another agent digging, and this time I made it show its work). Here's what turned up:

- **September 17 wasn't a mystery at all.** That's the day the new docs site launched to production, and PostHog went live on it within a couple of minutes. The rage clicks "since late July" were on our preview deploys. Nothing changed on the 17th - we just started looking.
- **Nobody in those sessions ever used search.** 0 searches, 0 result clicks, and 0 clicks on anything inside the search dialog. Real Chrome users DO show up in there, so it's not a tracking gap.
- **They clicked buttons you can't see.** Our header has an "Open menu" button that's hidden on wide screens. These sessions clicked it 318 times, at window widths where it isn't visible. No human did that... because a human can't click something that isn't there!
- **They look like a script.** The browser window height matches the screen height in every one of them (that's a headless or full-screen browser), every session is a brand new visitor arriving direct, there's exactly 1 rage click per page, pages load about 10 seconds apart, and they show up in short bursts on 5 different days. A few more turned up on October 14, so it's still going (41 sessions now). PostHog didn't flag any of them as bots.

My best guess? Somebody's automated test or scraper is running Firefox against our docs and clicking every button on every page, 3 times in a second, which is exactly what a "rage click" looks like. And the replays back that up. In one of them, the search dialog, the mobile navigation drawer AND the side menu are all open at the same time, stacked on top of each other... a person can't do that, because opening one closes the others. (It also shows the search dialog opening just fine, so the button works!)

<!-- JOEL: Claude watched 2 replays on 2026-10-15: the Oct 1 one shows search dialog + mobile nav drawer + side "Menu" panel all open at once; the Oct 14 one is a single article page, nothing unusual. Watch one yourself before publishing, since the post is in your voice. Oct 1 (12 pages): https://us.posthog.com/project/33241/replay/01a0f69b-d54d-75c0-993e-081788278e3c  Sep 17 (43 pages): https://us.posthog.com/project/33241/replay/01a0b144-de8f-764f-b77f-1de0a9ed5a7a -->

So what did I get wrong? I nearly took an agent's conclusion straight off a dashboard, and then I nearly "fixed" a button that wasn't broken. The readers rage-clicking our search button weren't people at all... they were bots. Which, if you've read this far in the series, is kinda the whole point. ;)

A note if you're leaning on AI agents for this kind of analysis: they'll hand you a confident, plausible answer FAST, and that's exactly the moment to slow down and go look for yourself (or at least make the agent prove it).

## You don't have to pick a side

<!-- JOEL: Your big-picture view: where do you think websites are going in the next couple of years, with agents reading more of them than people do? -->

This whole post is the human half of the standard, and you shouldn't have to trade it away to serve agents - and in our experience, you don't. A cached static page is fast for a reader AND cheap for a crawler. Real headings and properly labelled buttons work for a screen reader, and (surprise!) they work for an agent too.

## All 8 standards on one page

Here's the whole series as one checklist. Go ahead and paste it into an issue, a README or your team wiki, and only tick the boxes you can actually prove with data. Gut feel doesn't count!

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

<!-- JOEL: Wrap-up in your own words: why you wrote the series, what you'd want readers to do Monday morning, and what's next for you or for Agility on this. -->

None of these needs our stack (or any particular stack, really), but every one of them needs somebody to actually go and look.

Your readers are the best source for what's missing, too. We use search logs and a public roadmap where anyone can submit an idea (roadmap.agilitycms.com/submit-idea), and whatever you use, make it REALLY easy for readers to tell you.

## So, which box couldn't you tick?

Run the checklist on your own site and tell me in the comments which item you couldn't prove with data. And if you've ever had a dashboard and your own testing disagree, I'd love to hear which one turned out to be right!

That's a wrap on the series. If you're new here, start at the beginning: **Your website has two kinds of readers now**.

*One last disclosure: an AI coding agent did a ton of the work behind this series (including the Firefox conclusion I nearly published, and the one that replaced it!), and it helped me draft these posts, too. The numbers are from our own measurements, and the mistakes are ours.*
