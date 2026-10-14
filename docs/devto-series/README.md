# Expect More From Your Website (dev.to series)

A learning series for Joel's personal dev.to account. Working drafts live here so they can be iterated in PRs before anything is posted.

## The idea in one paragraph

Your website now has two kinds of readers: people, and the AI agents and assistants that read it on their behalf. Most sites are built for neither as well as they could be, mostly because of defaults nobody questioned. Each post sets one standard you should expect from your own site, gives you a check you can run in 10 minutes, explains why it usually fails, and shows how to fix it. The Agility docs site (Next.js on a headless CMS) is the worked example, mistakes included. It is never the point.

## Rules for every post

1. **The reader's site is the subject.** Ours is the example. If a paragraph is about how clever we were, cut it or turn it into "here is what you can check".
2. **Same five parts, in order:**
   1. **The standard.** One sentence, stated as something the reader should expect.
   2. **The 10-minute check.** Works on any stack. No Agility account, no paid tool.
   3. **Why it usually fails.** Blame defaults and deadlines, not developers.
   4. **How to fix it.** Stack-neutral first, then our code as one example.
   5. **What happened when we tried it.** One number and one thing we got wrong.
3. **Humans first, agents too.** Every agent-facing change must also say what it does for a person. If it does nothing for people, say so honestly.
4. **Every number is real and sourced.** Numbers come from `evals/search/` in this repo, PostHog, Algolia analytics or the git history. If a number is not measured yet, the draft says `TODO(data)` instead of guessing.
5. **Two layers: principle and real stack.** Every post teaches the stack-neutral principle and also shows the real implementation by name: Next.js and React, Agility CMS (disclose that Joel co-founded it), Algolia, Azure AI Search, PostHog, MCP, Vercel. Mention equivalents in other tools where it is easy. No comparisons against other CMS vendors. Full rules in [WRITING-BRIEF.md](WRITING-BRIEF.md).
6. **Disclose AI assistance.** Much of this work was done with an AI coding agent. Say so where it matters to the story, and follow dev.to's guidelines for AI-assisted posts (check the current wording before publishing).
7. **No secrets.** No instance IDs, API keys, customer names or internal URLs in drafts.
8. **House style:** plain English, short sentences, no em dashes.

## Posts

| # | File | Standard | Status |
|---|---|---|---|
| 1 | [01-two-kinds-of-readers.md](01-two-kinds-of-readers.md) | Your site should work for people and for the agents reading on their behalf | Full draft |
| 2 | [02-search-should-understand-questions.md](02-search-should-understand-questions.md) | Your search should understand a question, not just keywords | Full draft |
| 3 | [03-no-results-is-feedback.md](03-no-results-is-feedback.md) | "No results" is feedback, so collect it | Full draft |
| 4 | [04-measure-search-before-changing-it.md](04-measure-search-before-changing-it.md) | Measure your search before you change it | Full draft |
| 5 | [05-builds-should-not-delete-content.md](05-builds-should-not-delete-content.md) | Your build should not be able to quietly delete content | Full draft |
| 6 | [06-every-page-machine-readable.md](06-every-page-machine-readable.md) | Every page should be readable by a machine, without a second site | Full draft |
| 7 | [07-assistants-should-say-i-dont-know.md](07-assistants-should-say-i-dont-know.md) | An assistant on your site should know when to say "I don't know" | Full draft |
| 8 | [08-fast-accessible-everywhere.md](08-fast-accessible-everywhere.md) | Fast, accessible and working in every browser, measured not assumed | Full draft |

## Publishing notes

- **Account:** Joel's personal dev.to account.
- **Series name** (dev.to front matter `series`): `Expect More From Your Website`.
- **Cadence:** weekly. Have posts 1 to 3 finished before post 1 goes out, so the series does not stall.
- **Canonical URL:** if a post is also published on agilitycms.com, set `canonical_url` to that copy. Otherwise leave it out.
- **Tags** (dev.to allows four): pick from `webdev`, `nextjs`, `ai`, `search`, `seo`, `a11y`, `cms`, `javascript`.
- **Every post ends with** a link to the next post and one question for the comments, to start a conversation.

## Data still to gather

- [x] Share of docs traffic that is agents vs people. 30 days to 2026-10-14, PostHog docs project:
  - Human pageviews on `/docs`: 2,456.
  - AI assistant requests: 1,720. AI search requests: 3,981. Together that is 5,701, which is the number post 1 uses.
  - Also counted: AI training 6,842, search engines 5,351, SEO tools 1,058, scripts and SDKs 3,916 (this includes our own test runs), unidentified 4,853, other bots 14,083, MCP tool calls 132.
  - Re-pull these the week post 1 is published.
- [ ] Every remaining `TODO(data)` in the posts (`grep -n "TODO" 0*.md`). Posts 3, 5, 6, 7 and 8 have them. Post 7's no-answer probes (about 15) and post 8's Firefox replays are the two that change what a post says.
- [ ] Zero-result searches per week, before and after the query-setting change (PostHog `docs_search` with `results = 0`, plus Algolia analytics). Post 3.
- [ ] Search click-through: share of searches followed by a result click (`docs_search_result_click`). Posts 3 and 8.
- [ ] Core Web Vitals for docs pages (PostHog web vitals). Post 8.
- [ ] An accessibility pass on a typical article page. Post 8.
- [ ] The search-button rage clicks in PostHog: about 270 Firefox rage clicks across 32 sessions between Sep 17 and Oct 10, all on the collapsed search button. Joel tested Firefox on Oct 13 and search works. Watch a replay to work out what those clicks were before post 8 says anything about it.
