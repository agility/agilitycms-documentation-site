---
title: "Every page should be readable by a machine, without a second site"
published: false
description: "Server-rendered HTML, a Markdown copy of every page, an llms.txt index and a two-tool MCP server, all from one content source. How we did it in Next.js, and the two mistakes that hid our docs from the machines reading them."
tags: nextjs, ai, webdev, seo
series: Expect More From Your Website
---

<!--
DRAFT 3. Sources: PostHog project 33241 (2026-10-15): docs_mcp_tool_call Oct 6 to 15 (test traffic from curl/node/agility-search-eval removed by matching docs_agent_request user agents); docs_agent_request endpoint=markdown Oct 6 to 15 (5,706 requests; top page agility-cms-mcp-server, 58).
-->

Here';'s a fun one! For a while, one of the most important pages in our docs was blank to nearly every machine that read or crawled it.

It was the page about our MCP server - the one an AI assistant reads to learn how to connect to us. In a browser it looked totally fine. But to `curl`, to a search crawler, or to an assistant fetching it on behalf of somebody, it was a title, a menu, a footer and... no article. We were converting the Markdown to HTML in the browser, *after* the page loaded, so anything that skipped JavaScript never saw it.

And nobody noticed, because everybody who checked it (us included) used a browser. I'm super embarrsed by this, as I've been touting the server side rendering benefits of Next.js for years, and I site that *I'm* accountable for was not working. Ouch! Even with the right framework, you can still make mistakes.

![Content in Agility CMS is rendered by Next.js on Vercel into four views: an HTML page for people, and for agents a Markdown copy of every page, an llms.txt index, and an MCP server with search_docs and fetch_doc tools.](img/out/06-every-page-machine-readable.gif)

## The standard

**Every page on your site should be available as clean content at a predictable URL, and one index should list them all, generated from the same source as the pages people see.**

That last bit is the important part. The usual reason teams never get started on this is that "an AI version of the site" sounds like a whole second site to maintain. It doesn't have to be one, though. What you actually need is a second *rendering* of the content you've already got, and that's a much smaller job.

## The 10-minute check

This works on any site and any stack - all you need is a terminal and a browser.

1. Fetch one page the way a machine does: `curl -s https://your-site.com/some-article | grep -c "a sentence from the body"`. If it prints 0, the body isn't in the HTML.
2. Try the page URL with `.md` on the end. Do you get the article as plain text, or a 404 page?
3. Look for `/llms.txt` at your site root (or your docs root). Is it there, and does it list your pages?
4. View source on an article and search for `rel="alternate"`. Is there a link telling a machine where the clean copy lives?
5. List every hostname that serves your site - the apex, `www`, a `docs.` subdomain, your hosting provider's default domain, etc. Open `/robots.txt` on each one. Is any duplicate host open to crawlers?
6. Paste one page into an AI assistant and ask it something specific about that page. Does it answer from the article, or does it get distracted by the menu and footer?

## How this sneaks up on you

It's the same old story, really - defaults and deadlines.

- Rendering drifts into the browser because it's convenient. A component that fetches or transforms content in a `useEffect` works PERFECTLY in development - it just hands an empty shell to anything that doesn't run JavaScript, and nothing in a normal QA pass is gonna show you that.
- Pages are built for browsers. Even when the content IS in the HTML, it's wrapped in navigation, banners and scripts. A model can dig the answer out, but it burns effort (and makes mistakes) doing it.
- "Machine-readable" sounds like a big project. A separate export, a separate site, a separate pipeline... so it goes on the roadmap, and it kinda just stays there.
- Hosting creates duplicates nobody planned. Somebody points a subdomain straight at the app for a migration or a test, and now every page on the site exists twice.

## One source, a few different views

The way I think about it is **one content source, several renderings, one cache.** Your CMS (or your Markdown files, or your database) is the source. HTML for people, Markdown for machines and an index for both are all just *views* of that same content, rendered on the server and invalidated together whenever something changes.

Here's the order I'd tackle it in:

1. **Render the content on the server.** If the answer isn't in the first HTML response, nothing else on this list really matters.
2. **Serve a Markdown copy of each page at the page URL plus `.md`.** That's just one route handler reading the same content as the page.
3. **Advertise it.** Put a `<link rel="alternate" type="text/markdown">` on each page, so an agent that lands on the HTML can find the clean copy.
4. **Publish `/llms.txt`,** generated from your sitemap so it never drifts: a title, a Markdown URL and a one-line purpose per page. ([llmstxt.org](https://llmstxt.org) describes the format.)
5. **Give agents tools as well as pages,** with an MCP server. More on that in a sec.
6. **Block crawling on duplicate hosts** and point canonicals at the real one.

Here's what that looks like on our stack. Our docs run on Agility CMS (where I've worked for 21 years, so yeah, I'm a bit biased) with a Next.js 16 front end on Vercel.

### Render it on the server

<!-- JOEL: You've been preaching static and server rendering since the JAMstack days ("Migrate to JAMStack Now - NO EXCUSES!"). A nod to that history makes the embarrassment in the opening even better. -->

The fix for the blank page was actually just one change - do the Markdown conversion *during* render instead of after it. The article body is a React Server Component now, and the comment at the top of the file explains why:

```tsx
// components/agility-pageModules/DynamicArticleDetails.tsx
/**
 * ...
 * The three things that genuinely need the browser are now small, separate
 * client components: the Classic-UI toggle (ClassicModeSwitch), the code-tab
 * upgrade and inline-script re-execution (ArticleBodyEnhancer), and the
 * on-this-page scroll-spy (ArticleNav). Everything else renders once, on the
 * server.
 */
```

You can do this on pretty much any framework. Keep the content on the server, and push only the interactive bits (toggles, tabs, scroll-spy, that kinda thing) out to the client.

### A `.md` twin for every page

In Next.js 16, every request passes through `proxy.ts` (it used to be called middleware). Any path that ends in `.md` gets rewritten to a route handler:

```ts
// proxy.ts
if (pathname.endsWith(".md") && !pathname.startsWith("/api/")) {
	const url = nextUrl.clone();
	url.pathname = `/api/article-md${pathname.slice(0, -3)}`;
	return NextResponse.rewrite(url);
}
```

Then the handler looks that path up in the CMS sitemap and serializes the SAME content item the HTML page uses:

```ts
// app/api/article-md/[...slug]/route.ts
const sitemap = await getSitemapFlat({ locale, preview });
const node = sitemap[path];
if (!node || node.isFolder || node.redirect) {
	return new Response("Not found", { status: 404 });
}
// ...
const article = await getContentItem({ contentID: node.contentID, locale, preview, contentLinkDepth: 1 });
// ...
const markdown = articleToMarkdown({
	fields: article.fields,
	canonicalUrl: `https://agilitycms.com/docs${path}`,
	related,
});
return new Response(markdown, {
	headers: {
		"content-type": "text/markdown; charset=utf-8",
		"cdn-cache-control": "public, s-maxage=60, stale-while-revalidate=86400",
	},
});
```

So where does the "one cache" part come in? That's Next.js Cache Components doing its thing. `getContentItem` is the exact same cached function the HTML page calls, and it's tagged per content item:

```ts
// lib/cms/getContentItem.ts
const cachedContentItem = async <T>(params: Params): Promise<ContentItem<T>> => {
	"use cache";
	cacheTag(`agility-content-${params.contentID}-${params.locale}`);
	cacheLife("days");
	return fetchContentItem<T>({ ...params, preview: false });
};
```

When an editor publishes, the CMS calls a webhook, the webhook calls `revalidateTag`, and the HTML page, its `.md` copy and `llms.txt` all refresh together - there's no export job for somebody to forget about. Pretty handy!

Each article page then advertises its twin in its metadata... but only articles. Landing pages don't have a `.md`, and as the comment in our code puts it, "advertising an alternate that 404s is worse than advertising none":

```ts
// lib/cms-content/resolveAgilityMetaData.ts
const isArticle = !!sitemapNode.contentID && sitemapNode.contentID > 0;
const alternates: Metadata["alternates"] = { canonical };
if (isArticle) alternates.types = { "text/markdown": `${canonical}.md` };
```

### An llms.txt nobody has to maintain

`llms.txt` is just a plain route handler that walks the same cached sitemap. It skips redirects, folders, hidden pages and anything marked noindex, and then writes out one line per page:

```ts
// app/llms.txt/route.ts
const line = (path: string, node: SitemapNode, withMd: boolean) => {
	const purpose = PAGE_PURPOSES[path];
	const url = withMd ? `${BASE}${path}.md` : `${BASE}${path}`;
	return `- [${node.title || node.menuText}](${url})${purpose ? `: ${purpose}` : ""}`;
};
```

Since it's generated, a page you publish this morning is in it THIS morning, and a page that gets archived drops right out. Nobody edits it by hand (and let's be real, nobody would remember to).

### Handing agents some tools (MCP)

<!-- JOEL: Why did you build an MCP server for the docs? What was the first thing you asked it yourself, in Claude or Cursor or wherever you use it? -->

Pages and an index are great for letting an agent *read* your site, but tools let it go a step further and actually *use* it.

**MCP (Model Context Protocol)** is an open standard for giving an AI assistant tools. Your server publishes a list of tools, each with a name, a plain-English description and an input schema. The assistant reads those descriptions, decides when to call a tool, and reads whatever comes back. I think of it as an API where the documentation is written for a model... since the model's the one calling it!

Ours has exactly 2 tools. `search_docs` takes a short query and gives back pages with a URL, a snippet and an id, and `fetch_doc` takes one of those ids and gives back the whole article. In Next.js it's one route handler, using the `mcp-handler` package:

```ts
// app/api/mcp/route.ts
server.tool(
  "fetch_doc",
  "Retrieve the full content of a documentation article by its ID. Use this after finding relevant documents with the search_docs tool to get complete information for analysis and citation.",
  { objectID: z.string().describe("The article's objectID from search results") },
  { title: "Fetch document", readOnlyHint: true },
  async ({ objectID }: { objectID: string }) => {
    // ...
    const path = await docUrl(objectID);
    // ...
    const twin = path ? await fetch(`${BASE_URL}${path}.md`, { cache: "no-store" }) : null;
    if (twin?.ok) {
      // ...
      return { content: [{ type: "text" as const, text: await twin.text() }] };
    }
    // ... otherwise fall back to the search record
  }
);
```

Check out what `fetch_doc` returns - it's the same `.md` copy. One source, again! And the tool descriptions do a LOT of real work, too. `search_docs` tells the model to send "3 to 8 words or one short question", and to run several short searches for a broad question, because models left to their own devices tend to send one long keyword list.

The most useful decision we made here was to keep the tool contract stable and swap the engine *behind* it. The tools call one function, and one environment variable picks which engine answers:

```ts
// lib/search/docsSearch.ts
export const docsSearchEngine = (): "algolia" | "azure" =>
	process.env.DOCS_SEARCH_ENGINE === "azure" && azureSearchConfigured() ? "azure" : "algolia";

export async function searchDocs(query: string, page = 0): Promise<DocsSearchResult> {
	if (docsSearchEngine() !== "azure") return searchAlgolia(query, page);
	try {
		return await searchAzure(query, page, PAGE_SIZE);
	} catch (err) {
		console.error("Azure docs search failed; answering from Algolia", err);
		return { ...(await searchAlgolia(query, page)), fallback: message(err) };
	}
}
```

If Azure fails, Algolia answers instead, and the event records why. So if Azure has a bad day, search gets a bit worse... but it keeps working, which is what you want.

Not on Next.js? No problem - Astro, Nuxt, SvelteKit and Remix all have server routes that can return `text/markdown`. On WordPress, a rewrite rule plus a template that prints the post content without the theme does the same job. And the MCP part is a small server in any language with an official SDK.

## How it went, mistakes and all

<!-- JOEL: Why did docs.agilitycms.com exist in the first place? A line of history explains how a duplicate host sticks around for years. -->

We got a couple of things wrong along the way, so let's start with rendering. The blank MCP article got fixed in July 2026, and the commit message records the check that proved it - after the change, that page served 84 KB of full body HTML to `curl`, tool tables and headings included. Before? The body wasn't there AT ALL. And it wasn't just that page... every Markdown-based article had the same problem.

Then we got hosting wrong. Our docs were reachable on 2 hosts: `agilitycms.com/docs`, the real one, and `docs.agilitycms.com`, which pointed straight at the Vercel app. The pages already declared the real URL as canonical, so we were fine, right? But the subdomain's `/robots.txt` sat outside the app's `/docs` base path, so it returned a 404, and nothing at all stopped crawlers. In October we added a redirect that only matches that host:

```js
// next.config.js
{
    // ...
    source: '/robots.txt',
    destination: '/docs/api/robots/subdomain',
    basePath: false,
    permanent: false,
    has: [{ type: 'host', value: 'docs.agilitycms.com' }]
}
```

That route answers `Disallow: /`. (MCP clients don't read `robots.txt`, so agents using the tools weren't affected.)

This is where the stable contract paid off. Later on, we moved `search_docs` from Algolia to Azure AI Search (keyword plus vector "hybrid" search) by changing that one variable, and no agent had to change a thing! Measured through the tool itself, the right page now comes first for 40 of our 51 answerable test questions - Algolia managed 25. Azure does add a few hundred milliseconds per search (about 250 ms for hybrid, and up to about 0.2 s more since we also ask the semantic ranker for a confidence score), but an agent that spends seconds on every model turn isn't gonna notice.

But... the contract also hid a bug. Testing the engine directly scored better than testing through the MCP, which was weird, right? The gap was exactly 2 questions that got no results at all, and both of them were 13 words long. Turns out the tool refused anything over 12 words with a "shorten your query" hint - a guard we'd written *ourselves*, to stop keyword stuffing on the old engine. Whoops!

A real question has a few small words in it like "the", "my" and "when", and a keyword list has none, so now the guard lets a 13 to 20 word query through on Azure as long as it has at least 3 of them.

A little advice, because it's SO easy to miss: test through the REAL interface your users (and their agents) actually hit. The code you wrote around the engine can be wrong just like anything else.

So how much do agents actually use all this? Not a ton yet, to be fair! In the first week we logged it (October 6 to 11), real agents made 48 searches and 30 page fetches through the MCP server - plus 28 test searches of our own that I had to filter out. The Markdown copies got 5,706 requests in about 10 days (weirdly close to the 5.7k number in post 1 - total coincidence, different thing), but most of those weren't AI at all: our own server, a link checker, curl and SEO crawlers. The AI bots tend to grab each page once and move on. And the single most-fetched Markdown page? The one about our MCP server. :) My other favourite stat: one Codex client connects to our MCP server about 900 times a day... and almost never calls a tool. Connecting isn't using!

## What people get out of it

- Server rendering is faster on slow phones, and it works with JavaScript blocked - for anybody at all.
- The `.md` copy is the easiest way to paste a page into your own AI tool, print it, or read it offline. One catch, though - right now a person has to *know* to add `.md`, because we don't show a "copy as Markdown" link on the page yet. We should!
- `llms.txt` is a one-page table of contents that a person can skim, too.
- The MCP server does nothing at all for somebody browsing the site... but it helps the person who's asking their assistant about us, and if post 1 is any indication, that's a LOT of people now.

<!-- JOEL: Your opinion: is llms.txt going to matter, or is it a fad? People will want your take as a CMS person. -->

## So, how many hostnames have you got?

So go run step 5 of the check! How many hostnames serve your site, and how many of them did you actually know about before you looked? Let me know in the comments - I'm really curious how common this is!

Next in the series: **An assistant on your site should know when to say "I don't know".**

*An AI coding agent did a big chunk of the work behind this post, and helped me draft it. The numbers are from our own measurements, and so are the mistakes.*
