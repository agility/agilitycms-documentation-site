---
title: "Your build should not be able to quietly delete content"
published: false
description: "A list default of 50 removed 89 pages from our search, and a test request briefly took more out. How to make full rebuilds refuse to run on bad input."
tags: webdev, nextjs, cms, javascript
series: Expect More From Your Website
---

<!--
DRAFT 1. Joel: rewrite the opening and the closing in your own voice. The outage section is written in first person from the facts in WRITING-BRIEF.md only; check it matches your memory.
Sources: app/api/search/indexAllArticles/route.ts (current, and as of 9b579d4 for the "before"), lib/search/azure.ts, utils/searchUtils.ts, AGENTS.md (list defaults), evals/search/JOURNAL.md, commit 90e59da (PR #74).
TODO(data): how long the reduced (348-article) index was live.
-->

The worst bug in our docs search did not throw an error. It did not fail a build or page anyone. It returned a perfectly valid list of articles that was 89 short, and our reindex job did exactly what it was designed to do with that list: it replaced the whole index with it.

Then I made it worse with a test request.

## The standard

**Any job that replaces a whole index, sitemap or cache should refuse to run when its input looks wrong, and should never be triggered by an innocent-looking request.**

## The 10-minute check

Works on any stack. You need your code, your CMS admin and a terminal.

1. **List your "rebuild everything" jobs.** Search reindex, sitemap, static export, RSS feed, cache purge. Anything that writes the full set of pages somewhere.
2. **Find where each one reads its list of content.** Look for a page size: `take`, `limit`, `first`, `per_page`. If there is none, look up the API's default. It is rarely "everything".
3. **Compare two counts:** the number of published items in your CMS, and the number of records in the output (search index, sitemap URLs). Do they match?
4. **Call each rebuild endpoint with no credentials,** from a terminal or a private window. Does it run?
5. **Open one stored record** for a page you know well. Are the title, headings and body what you expect, or are some fields empty?

If any count is a round number like 10, 50 or 100, look closely. That is usually a default, not your content.

## Why it usually fails

Nobody writes "delete 89 pages" in a pull request. It happens through sensible decisions that meet a default:

- **APIs page their results, and the defaults are easy to miss.** Our CMS returns 50 items from a GraphQL list unless you ask for more. Its REST content list defaults to 10. Nothing warns you when a list is cut short.
- **A full replace is the right design.** It is how deleted and unpublished pages leave the index. But it also turns a short list into deleted content.
- **Rebuild endpoints start as internal tools.** They get a URL so someone can run them by hand, and they never get a lock.
- **The loss is spread out.** If 89 pages vanish across three categories, every category still looks full. Nobody notices a page that is not there.

## How to fix it

### The principle

1. **Ask for an explicit page size, and treat hitting it as an error.** If you asked for 250 and got exactly 250, there may be more. Stop, or paginate.
2. **Compare with the last run.** If the new index would be much smaller than the old one, refuse and ask a human.
3. **Require a secret for any rebuild,** and make sure a request the endpoint does not understand cannot fall through to "rebuild everything".
4. **Check the shape of the content, not just the count.** Read a stored record now and then.
5. **Make expensive rebuilds incremental,** so running one is cheap and boring.

### Our implementation

Our docs run on Agility CMS, which I co-founded, with a Next.js 16 front end on Vercel. Search is Algolia for the search box and Azure AI Search for AI agents. One Next.js route handler, `app/api/search/indexAllArticles/route.ts`, rebuilds all of them from the CMS.

Here is how that route started. Notice that `indexAll()` never looks at the request, and the list of articles has no page size:

```ts
export async function GET(req: NextRequest) {
	return indexAll();
}

const indexAll = async () => {
	// ...
	const data = await gqlFresh({
		locale: defaultLocale,
		query: `
			{
				doccategories {
					contentID
					fields {
						title
						subTitle
						articles {
							// ...
```

Three categories (Overview, Editors and Developers) had more than 50 articles. Each came back with exactly 50. The route then handed the list to Algolia's atomic replace, which is designed to remove anything missing:

```ts
// Atomic full rebuild: replaceAllObjects copies into a temp index and renames,
// so any record not in `objects` (deleted/unpublished/orphaned) is removed.
// In v5 it always waits for each step (the v4 `safe` option is gone).
await client.replaceAllObjects({ indexName, objects });
```

The fix asks for the CMS maximum of 250 per list, and refuses to run if any list reaches it:

```ts
articles(take: 250) {
// ...

// GraphQL lists default to 50 items, which silently cut the Overview,
// Editors and Developers categories short. Since this is a full replace, a
// short list would DELETE the missing articles from search. Refuse instead.
const capped = data.doccategories.filter((c: any) => (c.fields.articles?.length || 0) >= 250);
if (capped.length) {
	return NextResponse.json(
		{ error: "A category hit the 250-article list limit; paginate before reindexing", categories: capped.map((c: any) => c.fields.title) },
		{ status: 500 }
	);
}
```

The route now reads the request, and needs a bearer secret:

```ts
const secret = process.env.SEARCH_REINDEX_SECRET;
const authorized = Boolean(secret) && req.headers.get("authorization") === `Bearer ${secret}`;
if ((secret || targets.includes("azure")) && !authorized) {
	return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

The Azure target always needs the secret, because every run there can spend money on embeddings. As the comment in the route puts it: "an open endpoint that spends embedding credits on each request is an invitation."

The Azure rebuild in `lib/search/azure.ts` is incremental. It stores a SHA-256 hash of each section's text, embeds only sections whose hash changed, and then deletes anything no longer present:

```ts
export async function replaceAllAzure(records: SectionRecord[]) {
	await ensureAzureIndex();
	const existing = new Map((await allDocs()).map((d) => [d.objectID, d.hash]));
	const hashes = await Promise.all(records.map((r) => hashOf(embeddingInput(r))));
	const changed = records.filter((r, i) => existing.get(r.objectID) !== hashes[i]);
	await upsertAzureSections(changed);
	const keep = new Set(records.map((r) => r.objectID));
	const stale = Array.from(existing.keys()).filter((k) => !keep.has(k));
	await deleteKeys(stale);
	// ...
}
```

Look at the last three lines. That delete step is exactly the behaviour that bit us in Algolia. It is only safe because the `take: 250` guard runs first. A full replace is only as trustworthy as the list you give it.

The hashes also suit Vercel's function limits. The route sets `maxDuration = 300`, and sections are uploaded in groups as soon as they are embedded, so a run cut short by a timeout keeps its progress and the next run finishes the job.

The same pattern works anywhere. In a WordPress export, pass `per_page` and check the total-pages header. In a static site generator, fail the build if the page count drops. In Typesense or Meilisearch, build into a new collection or index and swap only after checking its count.

## What happened when we tried it

### 89 missing articles

We found the 50-item default along the way, while building a second search index split into sections. 89 of 437 articles were missing from the full reindex. They were still in live search only because a separate publish webhook adds articles one at a time. Running the full reindex would have deleted them.

### The test request

This is the part I got wrong.

While testing the new version of the route, I sent a request to the old production endpoint with a parameter, assuming nothing would happen. The old code ignored the parameter, as it ignored the whole request. It did the only thing it knew how to do: it rebuilt the live search index, with the 50-item bug still in it.

Live search dropped to 348 articles. That is 437 minus the 89. Search worked, results looked normal, and a fifth of the docs were simply not there. It stayed that way until the fixed route deployed and we rebuilt, back to 437. TODO(data): how long the reduced index was live.

The lesson I took: an endpoint that ignores what you send it is not safe to poke, even with a parameter that "obviously" does nothing. The guard and the secret now cover this route. Two things are still on my list. The route still answers `GET`, which makes it easy to trigger from a browser or a link checker. And we have not built step 2 of the fix: comparing the new count with the last run before replacing. The `take` guard catches this bug; a count comparison would catch the next one.

### Windows line endings

A quieter bug turned up the same week, by reading one page's stored records rather than any total. Its sections had empty headings.

271 of 451 articles store their Markdown with Windows (CRLF) line endings. Our heading pattern was `^#{2,3}\s+(.+)$`, and in JavaScript `.` does not match `\r`, so on those articles no heading ever matched. In the live search box, 284 of 451 records had no headings, and headings are the second field Algolia searches after the title. The section indexes had cut 211 articles into blind chunks by length instead of at headings.

The fix, in `utils/searchUtils.ts`, is one line where Markdown enters the indexer:

```ts
const sourceMarkdown = (article: any): string => (article.fields.markdownContent || '').replace(/\r\n?/g, '\n');
```

It shipped in commit 90e59da (PR #74), "Index headings in CRLF articles (284 of 451 live search records had none)". The change to `utils/searchUtils.ts` was 14 lines; the rest of the PR was the test sets and notes that found it. Every aggregate number had looked plausible. Only reading a record showed the problem.

## For people, too

Readers never see any of this go wrong. They just find that a page they used last week no longer comes up in search, and assume it was removed. Or they search for a heading they can see on the page and get nothing, because the index never stored it. An agent searching your docs fails the same way, then tells someone your product does not do the thing.

A guard that refuses to run is boring. Boring is the goal: the person searching should never find out how close they came to a smaller site.

## Your turn

What is the default page size of the API your site is built from, and does any job of yours rely on it without saying so? Check, and tell me in the comments what you found.

Next in the series: **Every page should be readable by a machine, without a second site**

*Parts of this work were done with an AI coding agent. The numbers are from our own measurements, and the mistakes are ours.*
