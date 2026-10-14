---
title: "Your site search should understand a question, not just keywords"
published: false
description: "People and AI agents both type whole questions into search boxes now. Four settings, and one ranking change, that stop your search from returning nothing."
tags: search, webdev, ai, javascript
series: Expect More From Your Website
---

<!-- OUTLINE. Sources: evals/search/FINDINGS.md (lessons 4 and 5), app/api/mcp/route.ts (query settings). -->

## The standard

When someone types a full question into your site search, they should get an answer, not an empty page. A blank result for a plain question is a bug, not a user error.

## The 10-minute check

- Take five questions from support tickets. Type each into your site search as a full sentence.
- Count the blank results.
- Then ask the same question in your own product's vocabulary versus a customer's ("locales" vs "multiple languages"). Does the customer's wording find anything?

## Why it usually fails

- Many search engines default to requiring every word in the query to match. Fine for keywords, fatal for sentences: "can I schedule content to publish later" includes "can", "I" and "later", and a page about scheduling may use none of them.
- Keyword search only matches words, not meaning. If your docs say "locales" and the reader says "languages", nothing connects them.

## How to fix it

1. **Four settings** (named here for Algolia; most engines have equivalents):
   - Query language set, so the engine knows which words are filler (`queryLanguages: ["en"]`).
   - Ignore filler words (`removeStopWords: true`).
   - Treat plurals as the same word (`ignorePlurals: true`).
   - When every word finds nothing, retry with words optional (`removeWordsIfNoResults: "allOptional"`).
2. **Add meaning-based (vector) search alongside keywords**, if your engine supports it. Hybrid search finds "locales" for "languages".
3. Code example: the query parameters from our MCP search tool. Keep it to the settings block.

## What happened when we tried it

- With the defaults, "can I schedule content to publish later" returned 0 results. With the four settings, it found the scheduling page.
- "Does Agility support multiple languages" found nothing by keyword, because the docs say "locales". Vector search found it.
- On 51 scored questions, keyword-plus-vector search put the right page first 36 times, against 25 for our original keyword setup (details in post 4).
- What we got wrong: we tested these changes through our live search, which filled our "searches with no results" alert with our own test queries. Test against the engine directly. (Lead-in to post 3.)

## Human angle

People type questions too, especially people who are new to your product and do not know your vocabulary yet. They are exactly the readers you most want to keep.

## Open

- TODO(data): number of zero-result searches per week before and after the settings change.
- Decide whether to show the hybrid setup (Azure AI Search) in this post or save it for post 4.
