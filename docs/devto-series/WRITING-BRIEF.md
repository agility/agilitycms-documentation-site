# Writing brief for the series

Read this before writing or editing any post. It applies to every file in this folder.

## Who is writing, and for whom

- **Byline:** Joel Varty, writing on his personal dev.to account. First person ("I", "we" for the team). Joel has been at Agility CMS for 21 years and runs its tech and product side. He did NOT co-found it: never say he did.
- **Readers:** developers and technical content people who run a website or docs site on any stack. Many are on Next.js and React. Some are on WordPress, Contentful, Sanity or a hand-built site.
- **Purpose:** teach readers to expect more from their own work. It is not us showing off. Our site is the worked example, mistakes included.

## Two layers in every post: the principle and the real stack

Every post works at two levels, and both must be concrete:

1. **The principle,** stack-neutral, with a 10-minute check any reader can run.
2. **The real stack,** with product names and real code from this repo:
   - **Next.js 16 (App Router, Cache Components) and React** for the site.
   - **Agility CMS** for content (GraphQL and the Fetch API; content edited by people, read by the site).
   - **Algolia** for site search (per-article and per-section indexes).
   - **Azure AI Search** with **Azure OpenAI** embeddings (`text-embedding-3-large`) for hybrid and semantic search.
   - **PostHog** for analytics, alerts and session replay.
   - **MCP** (Model Context Protocol) for agent access.
   - **Vercel** for hosting.

Name products plainly and say what each did well or badly for us. Show how to do the same thing with other tools in a sentence or two where it is easy (for example, "Typesense and Meilisearch have equivalent settings"). Do not compare against or criticise other CMS vendors.

## Structure (the same five beats, in this order)

Every post covers these beats, but only the first 2 use fixed headings. Name the rest for what the post is about, in Joel's words (see "Joel's voice" below).

1. **The standard** (fixed heading): one sentence, as something the reader should expect.
2. **The 10-minute check** (fixed heading): numbered steps, works on any stack, no paid tools.
3. Why it usually fails: blame defaults and deadlines, not developers.
4. How to fix it: principle first, then the real implementation with code.
5. What happened when we tried it: at least one number and one thing we got wrong.

Then, in whatever order reads naturally:
- What the change does for human readers. This can be its own short section or woven in.
- One question for the comments.
- A link line to the next post (use the title; the URL will be added at publish time).
- A short disclosure that an AI coding agent did a lot of the work. Word it a little differently in each post.

## Code rules

- Code must come from this repository, trimmed for clarity. Mark trimmed parts with `// ...`. Do not invent APIs or options.
- Before quoting an option or function, open the file and check it exists. The key files:
  - `app/api/mcp/route.ts`: MCP server, `search_docs` and `fetch_doc` tools, Algolia query settings.
  - `lib/search/docsSearch.ts`: engine switch (`DOCS_SEARCH_ENGINE`).
  - `lib/search/azure.ts`: Azure AI Search index, hybrid + semantic query, upload with hashes.
  - `lib/search/algoliaSections.ts`: per-section Algolia index settings.
  - `utils/searchUtils.ts`: splitting articles into sections.
  - `app/api/search/indexAllArticles/route.ts`: full reindex, `take: 250` guard, bearer secret.
  - `app/llms.txt/route.ts` and `app/api/article-md/[...slug]/route.ts`: llms.txt and Markdown copies.
  - `components/common/SearchModal.tsx`: site search UI and PostHog events.
  - `evals/search/`: the 52-question test set, scoring script, results, findings.
  - `AGENTS.md`: gotchas, including the postponed-page check.
- Keep each code block short (under about 30 lines). Readers should be able to copy it.
- Never include secrets, API keys, app IDs, instance IDs, internal URLs or customer names. Use placeholders such as `process.env.ALGOLIA_APP_ID`.

## Facts you may use (all verified)

- 52 test questions, 51 with a correct page, committed before scoring.
- **Run 7 (2026-10-11) is the current result and supersedes run 2.** Agent question set, MRR@10 and hit@1:
  - Algolia `doc_site`: 0.587, 25.
  - Algolia per section: 0.594, 25.
  - Azure keyword: 0.762, 32.
  - Azure hybrid: 0.853, 40.
  - Azure hybrid + semantic: 0.796, 34. The reranker made ranking worse once the full corpus was indexed, so the docs MCP now uses hybrid without it.

  On 36 search-box queries, Algolia's default settings scored 0.886 at about 46 to 53 ms, while Azure hybrid took about 224 to 266 ms. Source: `evals/search/README.md`. Use run 7 for headline claims. Run 2 can appear only as history, in the story of a wrong conclusion.
- Run 2 scores (history; hit@1 / hit@3 / hit@5 / MRR@10):
  - Algolia per article: 25 / 33 / 36 / 0.577.
  - Algolia per section: 25 / 32 / 35 / 0.573.
  - Azure keyword (BM25): 27 / 40 / 42 / 0.668.
  - Azure hybrid: 36 / 44 / 47 / 0.801.
  - Azure hybrid + semantic: 37 / 47 / 49 / 0.830.
- Our first conclusion ("half the gap is how content is split") was wrong; run 2 showed splitting changed nothing for Algolia.
- With Algolia defaults, "can I schedule content to publish later" returned 0 results. Four query settings fixed zero-result questions: `queryLanguages: ["en"]`, `removeStopWords: true`, `ignorePlurals: true`, `removeWordsIfNoResults: "allOptional"`.
- "Does Agility support multiple languages" found nothing by keyword (the docs say "locales"); vectors found it.
- "How do I let editors click on the page to edit it" ranked poorly everywhere: a vocabulary gap in the content.
- Every engine missed "what changed in the latest release".
- GraphQL lists in our CMS default to 50 items. The full reindex dropped 89 of 437 articles. Fixed with `take: 250` and a guard that refuses to replace the index when a list hits the limit.
- A test request to the old production reindex endpoint (with a parameter the old code ignored) rebuilt live search with 348 articles. Restored to 437 after the fix deployed.
- Articles saved with Windows line endings had no headings in the index: 284 of 451 live search records.
- The first PostHog zero-result alert was triggered by our own test traffic through the live MCP endpoint.
- Semantic reranker (0 to 4), first probe: every answerable question's top result scored at least 2.16; the one no-answer question scored 1.94, which suggested a threshold near 2.0. Superseded by run 7 with 9 no-answer questions: they scored 1.96 to 2.62, answerable ones 2.28 and up (median 2.95), and the working threshold is about 2.3. Not settled: about 15 no-answer questions are wanted (post 7). Rerun 2026-10-15 with 16 no-answer questions (7 new, mostly near misses): no-answer 1.92 to 2.62 (median 2.16), answerable 2.28 to 3.53 (median 3.04 on the current index); below 2.3 refuses 11 of 16 and wrongly refuses 1 of 51. 2.3 holds.
- Azure: Basic tier; free semantic ranker plan is 1,000 queries a month; embedding the docs took about 8 minutes at first and cost cents. After adding hashes to skip unchanged sections, a full rebuild took 129 seconds and a no-change rebuild 2 seconds.
- The MCP server exposes two tools, `search_docs` and `fetch_doc`. The search engine behind it moved from Algolia to Azure hybrid search without changing the tools.
- Every docs page has a Markdown copy listed in `llms.txt`.
- The postponed-page check after each build caught a bare `fetch` with `next: { revalidate }` that cost eleven article pages a full render on every request.
- A route that works in `next dev` can 404 in production if the proxy (`proxy.ts`) does not allow it.

If you need a number that is not here and not in the repo, write `TODO(data): ...` instead of guessing.

## Style

- Plain English. Explain jargon the first time (MRR, BM25, embeddings, MCP).
- **No em dashes or en dashes** (the long dash characters). Joel's own spaced hyphen (" - ") is fine and is part of his voice.
- 1,500 to 2,200 words per post, code included.
- Keep the dev.to front matter at the top of each file (`published: false`).

## Joel's voice

These posts go out under Joel's name, and they have to sound like him, not like a language model. There are two references, and the second one wins when they disagree:

1. His published dev.to posts from 2019 to 2020: "Using a CMS Made Me A Better Developer", "Learn to be a better leader and team member with pair-programming", "DNS 101 For Web Developers", "Upgrading my website to JAMStack - 1 page at a time".
2. **His own edits to this series** (October 2026), especially post 1. Lines Joel wrote himself are the best guide to how he sounds now. Never rewrite them, and leave his typos alone: he keeps them on purpose.

### Who he is in these posts

- He's been at Agility for 21 years and runs its tech and product side. **He did NOT co-found it.** Disclose it casually: "BTW: I've been at Agility for 21 years, so take my enthusiasm with a grain of salt."
- He's a practitioner sharing what he learned, not an expert lecturing. He'll say "It's kinda hard to measure search performance if you aren't an expert in it (and I am NOT!)". He presumes and guesses out loud ("I presume these visits are on behalf of somebody running an agent").
- He's a mentor at heart. He likes to step back and give the reader a career-level nudge: "A note on being *wrong*: it's not always bad, even though it feels crappy... Don't be so afraid of being wrong that you never try stuff!" Each post can have one moment like that.
- He gets excited and wants to share: "I really want to share this stuff - it's super cool!", "I wanna help you improve on yours, too!"
- He has opinions about tools and says them inline, in a few words: "Awesome tool - there are others that can do this too, but I like Posthog a LOT." "free plan covers a ton of usage on a small site." "great stack for quick iteration."
- He links today's problem to his own history: "I've written about this since 2019." He's been "touting the server side rendering benefits of Next.js for years", and admits it when he didn't live up to it ("I'm super embarrassed by this... Ouch!").
- He starts with context and motivation before the problem. For example, post 1 opens with "One of the things that I've been working on is being more data driven", and post 5 explains how the webhook works before saying what broke. He explains how things work and doesn't open with a punchline.

### How it sounds on the page

- **Contractions, always,** plus casual forms: wanna, kinda, gonna, etc, "no?" and "right?" as tag questions.
- **Spaced hyphens** as his dash: "it's not super high traffic - those are a different story".
- **Ellipses for a beat:** "So...", "But...", "READERS... they just aren't PEOPLE."
- **CAPS for emphasis, often:** a word or two in caps in most sections (LOT, FAR, SOMETIMES, WORSE, NOT, SO MANY TIMES). *Italics* for stress too (*NOW*, *use cases*, *feeling*).
- **Mild swearing and slang** where it fits: "DAMN!", "crappy", "heck", "Ouch!", "meat-suits". A smiley now and then: ":)" ";)".
- **Exclamation points** are welcome, several per post.
- **Parenthetical asides** carry a lot of his personality: "(but I was, anyway)", "(or bots disguised as humans)", "(albeit the less popular ones, but still...)".
- **Rounded numbers with k** in casual prose ("2.5k times", "5.7k"). Keep exact figures in tables, charts and anywhere precision matters.
- **Numerals** for small numbers ("2 people").
- **Canadian spelling:** colour, behaviour, favourite, centre, but realize, organize (-ize).
- **Sentences can run on a bit.** He strings clauses together with "and" and "but". Not every paragraph needs to be tight and balanced, and too-neat prose reads as AI.
- **Endings turn to the reader** with a real question, and a closing line about why he cares.
- Headings are plain and a bit casual. The two recurring series sections stay: **The standard** and **The 10-minute check**. Everything else is named for what that post is about, and no two posts share a set of headings.

### What gives a post away as AI-written (cut these)

- No contractions; the same sentence rhythm everywhere; every paragraph the same length.
- "Not X, but Y" / "It's not X. It's Y." / "X, not Y" antitheses. One per post at most.
- Everything in threes. A bolded lead-in on every paragraph or bullet.
- A neat moral at the end of each section ("The lesson: ...", "That is the point.").
- Punchy one-word paragraphs used as a device ("Oops.") more than once a post. Joel explains more than he quips.
- "Here's the thing", "Let's dive in", "It's worth noting", "In today's world", "game-changer", "delve", "crucial", "robust", "leverage", "seamless", "landscape", "unlock", "navigate", "testament", "honest(ly)" as a flourish.
- Over-hedging and signposting ("In this post, we will...").
- Identical structure and closing lines across posts.
- Invented specifics. Never make up a day, place, conversation, feeling or number. Where only Joel can supply a detail, leave a `<!-- JOEL: ... -->` note instead.
