---
title: "Your build should not be able to quietly delete content"
published: false
description: "A list default of 50 removed 89 pages from our search, and a test request briefly took more out. How to make full rebuilds refuse to run on bad input."
tags: webdev, nextjs, cms, javascript
series: Expect More From Your Website
---

<!-- OUTLINE. Sources: evals/search/FINDINGS.md lesson 3a; app/api/search/indexAllArticles/route.ts (take: 250 and the guard); PR #74 (CRLF headings). -->

## The standard

Any job that replaces a whole index, sitemap or cache should refuse to run when its input looks wrong, and should never be triggered by an innocent-looking request.

## The 10-minute check

- Find your "rebuild everything" jobs: search reindex, sitemap, static export, cache purge.
- For each one: if the content source returned half the usual items, would the job notice, or publish the half?
- Can anyone trigger it with a plain GET request, without a secret?

## Why it usually fails

- APIs page their results, with defaults that are easy to miss. Ours returned 50 items per list unless asked for more, with no warning.
- A full replace is the right design (it removes deleted pages), but it turns a short list into deleted content.
- Rebuild endpoints start as internal tools and stay unauthenticated.

## How to fix it

1. **Ask for an explicit page size, and treat hitting it as an error.** If you asked for 250 and got exactly 250, stop and paginate.
2. **Compare with the last run.** Refuse to replace an index that would shrink by more than a few percent without a human confirming it.
3. **Require a secret for any rebuild,** and make test requests side-effect free.
4. **Check the content shape, not just the count.** Code example: the guard in our reindex route.

## What happened when we tried it

- Our full reindex read categories without a page size. Three categories came back with exactly 50 articles, and 89 of 437 articles were missing from search. Nobody noticed, because the missing pages were spread across categories.
- While testing a new version, I sent a request to the old production endpoint with a made-up parameter, assuming it would be ignored. It was ignored, and the old code rebuilt the live index, still with the 50-item bug. Live search briefly dropped to 348 articles until the fixed version deployed and we rebuilt.
- A second, quieter bug: articles saved with Windows line endings had no headings in the search index, which affected 284 of 451 records.

## Human angle

Readers never see this go wrong. They just find that a page they used last week no longer appears in search, and assume it was removed.

## Open

- Joel: are you comfortable telling the outage story in the first person? It is the most memorable part of the series.
- TODO(data): how long the reduced index was live.
