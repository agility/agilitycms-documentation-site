---
title: "Fast, accessible and working everywhere: measured, not assumed"
published: false
description: "The human half of the standard. How to check speed, accessibility and cross-browser behaviour with real data, and what to do when the data and your own testing disagree."
tags: webdev, a11y, nextjs, performance
series: Expect More From Your Website
---

<!-- OUTLINE. Mostly data still to gather; see README "Data still to gather". -->

## The standard

Your site should be fast, usable with a keyboard and a screen reader, and work in every major browser, and you should know this from real-user data, not from testing on your own laptop.

## The 10-minute check

- Look up your Core Web Vitals from real users (not a lab test).
- Tab through one page with the keyboard only. Can you reach and open search?
- Open the site in a browser you do not normally use.
- Look for rage clicks (repeated clicks on the same element) in your analytics or session replays.

## Why it usually fails

- Teams test on their own fast machine, in their own browser.
- Frameworks make it easy to accidentally render pages on every request instead of caching them.

## How to fix it

1. **Cache what can be cached.** In Next.js with Cache Components, check after every build that no fixed page is being rendered per request. Code example: the one-line check we run.
2. **Watch real-user data:** web vitals and rage clicks, by page and by browser.
3. **When data and your own testing disagree, watch a replay before you decide.** Analytics tells you something happened, not why.

## What happened when we tried it

- We added a build check that fails if any fixed page would render on every request.
- What we got wrong (draft, to confirm): our analytics showed a cluster of repeated clicks on the collapsed search button in Firefox, and an AI agent concluded the button was broken. When we tested Firefox by hand, search worked fine. TODO(data): watch the replays and finish this story honestly, whichever way it goes.
- TODO(data): Core Web Vitals for docs pages.
- TODO(data): accessibility pass results.

## Human angle

This whole post is the human angle. The point of the series is that you should not have to trade it away to serve agents.

## Close of the series

- Recap the eight standards as a checklist readers can copy.
- Invite readers to share their own check results in the comments.
- Point to the public roadmap (roadmap.agilitycms.com/submit-idea) only as an example of "ask your readers what is missing", not as a pitch.
