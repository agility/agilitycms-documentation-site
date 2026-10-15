---
title: "Your build should not be able to quietly delete content"
published: false
description: "A list default of 50 removed 89 pages from our search, and a test request briefly took more out. How to make full rebuilds refuse to run on bad input."
tags: webdev, nextjs, cms, javascript
series: Expect More From Your Website
---

<!--
DRAFT 2 (voice pass). Sources: app/api/search/indexAllArticles/route.ts (current, and as of 9b579d4 for the "before"), lib/search/azure.ts, utils/searchUtils.ts, AGENTS.md (list defaults), evals/search/JOURNAL.md, commit 90e59da (PR #74).
The outage section uses only the facts in WRITING-BRIEF.md; Joel, check it matches your memory.
TODO(data): how long the reduced (348-article) index was live.
-->

The worst bug we've had in our docs search didn't throw an error. It didn't fail a build, and it didn't page anybody. It just returned a perfectly valid list of articles that happened to be 89 short. And our reindex job did exactly what it was built to do with that list: it replaced the whole index with it.

Then I made it worse with a test request.

Oops.

![Before: content lists are read with a default page size of 50, so the longer lists are cut off and a full reindex replaces 437 live articles with 348, with no error. After: the lists are read with take 250 and the rebuild refuses to replace the index if any list comes back exactly full, so all 437 are indexed.](img/out/05-builds-should-not-delete-content.gif)

## The standard

**Any job that replaces a whole index, sitemap or cache should refuse to run when its input looks wrong, and should never be triggered by an innocent-looking request.**

## The 10-minute check

You can run this on any stack. All you need is your code, your CMS admin and a terminal.

1. **List your "rebuild everything" jobs.** Search reindex, sitemap, static export, RSS feed, cache purge. Anything that writes out the full set of pages somewhere.
2. **Find where each one reads its list of content.** Look for a page size: `take`, `limit`, `first`, `per_page`. If there isn't one, go look up the API's default. It's rarely "everything".
3. **Compare 2 counts:** how many published items are in your CMS, and how many records ended up in the output (search index, sitemap URLs). Do they match?
4. **Call each rebuild endpoint with no credentials,** from a terminal or a private window. Does it run?
5. **Open one stored record** for a page you know well. Are the title, headings and body what you'd expect, or are some fields empty?

If any of those counts is a nice round number like 10, 50 or 100, look closer. Round numbers are usually a default talking.

## How a sensible default eats your pages

Nobody writes "delete 89 pages" in a pull request. So how does it happen? A bunch of reasonable decisions run into a default nobody looked at:

- APIs page their results, and the defaults are really easy to miss. Our CMS gives you 50 items from a GraphQL list unless you ask for more. Its REST content list defaults to 10. Nothing warns you when a list gets cut short.
- A full replace is the right design. It's how deleted and unpublished pages get out of the index. But it also means a short list turns into deleted content.
- Rebuild endpoints start life as internal tools. They get a URL so somebody can run them by hand, and they never get a lock.
- The loss is spread out. If 89 pages vanish across 3 categories, every category still looks full. Nobody notices a page that isn't there.

## Teaching the rebuild to say no

### The rules, on any stack

1. Ask for an explicit page size, and treat hitting it as an error. If you asked for 250 and got exactly 250, there might be more. Stop, or paginate.
2. Compare with the last run. If the new index would be a lot smaller than the old one, refuse and ask a human.
3. Require a secret for any rebuild, and make sure a request the endpoint doesn't understand can't fall through to "rebuild everything".
4. Check the shape of the content as well as the count. Read a stored record every now and then.
5. Make expensive rebuilds incremental, so running one is cheap and boring.

### What that looks like in our Next.js route

Our docs run on Agility CMS (yes, the one I co-founded) with a Next.js 16 front end on Vercel. Search is Algolia for the search box and Azure AI Search for AI agents. One Next.js route handler, `app/api/search/indexAllArticles/route.ts`, rebuilds all of them straight from the CMS.

Here's how that route started out. Check out `indexAll()`: it never looks at the request, and the list of articles has no page size at all.

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

3 categories (Overview, Editors and Developers) had more than 50 articles. Each one came back with exactly 50. Then the route handed that list to Algolia's atomic replace, which is designed to remove anything that's missing:

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

The route actually reads the request now, and it needs a bearer secret:

```ts
const secret = process.env.SEARCH_REINDEX_SECRET;
const authorized = Boolean(secret) && req.headers.get("authorization") === `Bearer ${secret}`;
if ((secret || targets.includes("azure")) && !authorized) {
	return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

The Azure target always needs the secret, because every run there can spend money on embeddings. The comment in the route says it pretty well: "an open endpoint that spends embedding credits on each request is an invitation."

The Azure rebuild in `lib/search/azure.ts` is incremental. It stores a SHA-256 hash of each section's text, only embeds the sections whose hash changed, and then deletes anything that's no longer there:

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

Look at those last 3 lines. That delete step is EXACTLY the behaviour that bit us in Algolia. The only reason it's safe here is that the `take: 250` guard runs first. A full replace is only as trustworthy as the list you hand it.

The hashes play nicely with Vercel's function limits, too. The route sets `maxDuration = 300`, and sections get uploaded in groups as soon as they're embedded. If a timeout cuts a run short, it keeps its progress, and the next run finishes the job.

You can do the same thing on pretty much any stack. In a WordPress export, pass `per_page` and check the total-pages header. In a static site generator, fail the build if the page count drops. In Typesense or Meilisearch, build into a new collection or index and only swap once you've checked its count.

## How it actually went down

### 89 articles, hiding in plain sight

We stumbled on the 50-item default while building a second search index, one split into sections. 89 of our 437 articles were missing from the full reindex. The only reason they were still in live search was a separate publish webhook that adds articles one at a time. If we'd run the full reindex, it would've deleted them.

### Then I poked production

This is the part I got wrong.

While I was testing the new version of the route, I sent a request to the old production endpoint with a parameter, figuring nothing would happen. Of course, the old code ignored the parameter. It ignored the whole request! It did the only thing it knew how to do: rebuild the live search index, 50-item bug and all.

Live search dropped to 348 articles. That's 437 minus the 89. Search still worked, the results looked normal, and a fifth of the docs just weren't there. It stayed that way until the fixed route deployed and we rebuilt, back up to 437. TODO(data): how long the reduced index was live.

What I took away from it: an endpoint that ignores what you send it isn't safe to poke, even with a parameter that "obviously" does nothing. The guard and the secret cover this route now. 2 things are still on my list, though. The route still answers `GET`, so it's easy to set off from a browser or a link checker. And we haven't built step 2 of the fix yet, comparing the new count with the last run before replacing anything. The `take` guard catches this bug. A count comparison would catch the next one.

### The bug that only one record could show

A quieter bug turned up the same week. It showed up when we read one page's stored records, not any total. That page's sections had empty headings.

271 of 451 articles store their Markdown with Windows (CRLF) line endings. Our heading pattern was `^#{2,3}\s+(.+)$`, and in JavaScript `.` doesn't match `\r`, so on those articles no heading ever matched. Not one! In the live search box, 284 of 451 records had no headings, and headings are the second field Algolia searches, right after the title. The section indexes had chopped 211 articles into blind chunks by length instead of at headings.

The fix, in `utils/searchUtils.ts`, is one line where Markdown comes into the indexer:

```ts
const sourceMarkdown = (article: any): string => (article.fields.markdownContent || '').replace(/\r\n?/g, '\n');
```

It shipped in commit 90e59da (PR #74), "Index headings in CRLF articles (284 of 451 live search records had none)". The change to `utils/searchUtils.ts` was 14 lines. The rest of the PR was the test sets and notes that found it. Every aggregate number had looked plausible. Only reading a record showed the problem.

## What readers would have seen

Readers never see any of this go wrong. They just notice that a page they used last week doesn't come up in search anymore, and figure it got removed. Or they search for a heading they can see right there on the page and get nothing, because the index never stored it. An agent searching your docs fails the same way, and then it tells someone your product doesn't do the thing.

A guard that refuses to run is boring. That's the goal! The person searching should never find out how close they came to a smaller site.

## So, what's your page size?

What's the default page size of the API your site is built from, and is any job of yours quietly relying on it? Go check, and tell me in the comments what you found.

Next in the series: **Every page should be readable by a machine, without a second site**

*How this got built: an AI coding agent did a big chunk of the work alongside me. The numbers are our own measurements, and the mistakes are ours.*
