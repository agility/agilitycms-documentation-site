---
title: "Every page should be readable by a machine, without a second site"
published: false
description: "Server-rendered HTML, a Markdown copy of every page, an llms.txt index and a two-tool MCP server, all from one content source. How we did it in Next.js, and the two mistakes that hid our docs from the machines reading them."
tags: nextjs, ai, webdev, seo
series: Expect More From Your Website
---

<!--
DRAFT 2 (voice pass). Sources: TODO(data): MCP tool calls per week and the pages agents fetch most (PostHog docs_mcp_tool_call, docs_agent_request with endpoint type "markdown").
-->

For a while, one of the most important pages in our docs was blank to every machine that read it.

It was the page about our MCP server, the one an AI assistant reads to learn how to connect to us. In a browser it looked fine. But to `curl`, to a search crawler, or to an assistant fetching it for somebody, it was a title, a menu, a footer and... no article. We were converting the Markdown to HTML in the browser, after the page loaded, so anything that skipped JavaScript never saw it.

Nobody noticed, because everybody who checked it used a browser.

![Content in Agility CMS is rendered by Next.js on Vercel into four views: an HTML page for people, and for agents a Markdown copy of every page, an llms.txt index, and an MCP server with search_docs and fetch_doc tools.](img/out/06-every-page-machine-readable.gif)

## The standard

**Every page on your site should be available as clean content at a predictable URL, and one index should list them all, generated from the same source as the pages people see.**

That last bit matters. The usual reason teams never get started is that "an AI version of the site" sounds like a second site to maintain. It doesn't have to be. All you really need is a second rendering of the content you've already got.

## The 10-minute check

Any site, any stack. You'll need a terminal and a browser.

1. **Fetch one page the way a machine does:** `curl -s https://your-site.com/some-article | grep -c "a sentence from the body"`. If it prints 0, the body isn't in the HTML.
2. **Try the page URL with `.md` on the end.** Do you get the article as plain text, or a 404 page?
3. **Look for `/llms.txt`** at your site root (or your docs root). Is it there, and does it list your pages?
4. **View source on an article and search for `rel="alternate"`.** Is there a link telling a machine where the clean copy lives?
5. **List every hostname that serves your site** (the apex, `www`, a `docs.` subdomain, your hosting provider's default domain). Open `/robots.txt` on each one. Is any duplicate host open to crawlers?
6. **Paste one page into an AI assistant** and ask it something specific about that page. Does it answer from the article, or get distracted by the menu and footer?

## How this sneaks up on you

Same old story: defaults and deadlines.

- **Rendering moved to the browser because it was convenient.** A component that fetches or transforms content in a `useEffect` works perfectly in development. It just hands an empty shell to anything that doesn't run JavaScript, and nothing in a normal QA pass is going to show you that.
- **Pages are built for browsers.** Even when the content is in the HTML, it's wrapped in navigation, banners and scripts. A model can dig the answer out, but it burns effort and makes mistakes doing it.
- **"Machine-readable" sounds like a project.** A separate export, a separate site, a separate pipeline. So it goes on the roadmap, and it stays there.
- **Hosting creates duplicates nobody planned.** A subdomain gets pointed straight at the app for a migration or a test, and now every page exists twice.

## One source, a few different views

Here's the idea: **one content source, several renderings, one cache.** Your CMS (or your Markdown files, or your database) is the source. HTML for people, Markdown for machines and an index for both are all just views of it. They're rendered on the server and invalidated together when content changes.

In order:

1. **Render the content on the server.** If the answer isn't in the first HTML response, nothing else here matters.
2. **Serve a Markdown copy of each page at the page URL plus `.md`.** That's one route handler reading the same content as the page.
3. **Advertise it.** Put a `<link rel="alternate" type="text/markdown">` on each page, so an agent that lands on the HTML can find the clean copy.
4. **Publish `/llms.txt`,** generated from your sitemap so it never drifts: a title, a Markdown URL and a one-line purpose per page. ([llmstxt.org](https://llmstxt.org) describes the format.)
5. **Give agents tools as well as pages,** with an MCP server. More on that in a sec.
6. **Block crawling on duplicate hosts** and point canonicals at the real one.

On our stack, that looks like this. Our docs run on Agility CMS, which I co-founded, with a Next.js 16 front end on Vercel.

### Render it on the server

Fixing the blank page took one change: do the Markdown conversion during render instead of after it. The article body is a React Server Component now, and the file says why right at the top:

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

You can do this on any framework. Keep the content on the server, and push only the interactive bits out to the client.

### A `.md` twin for every page

In Next.js 16, every request passes through `proxy.ts` (it was called middleware before). Any path ending in `.md` gets rewritten to a route handler:

```ts
// proxy.ts
if (pathname.endsWith(".md") && !pathname.startsWith("/api/")) {
	const url = nextUrl.clone();
	url.pathname = `/api/article-md${pathname.slice(0, -3)}`;
	return NextResponse.rewrite(url);
}
```

The handler looks the path up in the CMS sitemap and serializes the same content item the HTML page uses:

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

So where does "one cache" come in? That's Next.js Cache Components. `getContentItem` is the exact same cached function the HTML page calls, and it's tagged per content item:

```ts
// lib/cms/getContentItem.ts
const cachedContentItem = async <T>(params: Params): Promise<ContentItem<T>> => {
	"use cache";
	cacheTag(`agility-content-${params.contentID}-${params.locale}`);
	cacheLife("days");
	return fetchContentItem<T>({ ...params, preview: false });
};
```

When an editor publishes, the CMS calls a webhook, the webhook calls `revalidateTag`, and the HTML page, its `.md` copy and `llms.txt` all refresh together. There's no export job to forget about. Pretty handy!

Each article page then advertises its twin in its metadata. Only articles, though. Landing pages don't have a `.md`, and as the comment in our code puts it, "advertising an alternate that 404s is worse than advertising none":

```ts
// lib/cms-content/resolveAgilityMetaData.ts
const isArticle = !!sitemapNode.contentID && sitemapNode.contentID > 0;
const alternates: Metadata["alternates"] = { canonical };
if (isArticle) alternates.types = { "text/markdown": `${canonical}.md` };
```

### An llms.txt nobody has to maintain

`llms.txt` is a plain route handler that walks the same cached sitemap. It skips redirects, folders, hidden pages and anything marked noindex, then writes one line per page:

```ts
// app/llms.txt/route.ts
const line = (path: string, node: SitemapNode, withMd: boolean) => {
	const purpose = PAGE_PURPOSES[path];
	const url = withMd ? `${BASE}${path}.md` : `${BASE}${path}`;
	return `- [${node.title || node.menuText}](${url})${purpose ? `: ${purpose}` : ""}`;
};
```

Since it's generated, a page you publish this morning is in it THIS morning, and a page that gets archived drops right out. Nobody edits it by hand.

### Handing agents some tools (MCP)

Pages and an index let an agent read you. Tools let it *use* you.

**MCP (Model Context Protocol)** is an open standard for giving an AI assistant tools. Your server publishes a list of tools, each with a name, a plain-English description and an input schema. The assistant reads the descriptions, decides when to call a tool, and reads whatever comes back. Think of it as an API whose documentation is written for a model, since the model's the one calling it.

Ours has exactly 2 tools. `search_docs` takes a short query and gives back pages with a URL, a snippet and an id. `fetch_doc` takes an id and gives back the whole article. In Next.js it's one route handler using the `mcp-handler` package:

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

Check out what `fetch_doc` returns: the same `.md` copy. One source, again! The tool descriptions do real work, too. `search_docs` tells the model to send "3 to 8 words or one short question" and to run several short searches for a broad question, because models left to their own devices tend to send one long keyword list.

The most useful call we made here was to keep the tool contract stable and swap the engine behind it. The tools call one function, and one environment variable picks the engine:

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

If Azure fails, Algolia answers, and the event records why. So if Azure has a bad day, search gets a bit worse, but it keeps working.

Not on Next.js? Astro, Nuxt, SvelteKit and Remix all have server routes that can return `text/markdown`. On WordPress, a rewrite rule plus a template that prints the post content without the theme does the same job. And the MCP part is a small server in any language with an official SDK.

## How it went, mistakes and all

**First, we got rendering wrong.** The blank MCP article was fixed in July 2026, and the commit message records the check that proved it: after the change, that page served 84 KB of full body HTML to `curl`, tool tables and headings included. Before? The body wasn't there AT ALL. Every Markdown-based article had the same problem.

**Then we got hosting wrong.** Our docs were reachable on 2 hosts: `agilitycms.com/docs`, the real one, and `docs.agilitycms.com`, which pointed straight at the Vercel app. The pages already declared the real URL as canonical. But the subdomain's `/robots.txt` sat outside the app's `/docs` base path, so it returned a 404, and nothing stopped crawlers. In October we added a redirect that only matches that host:

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

That route answers `Disallow: /`. MCP clients don't read `robots.txt`, so agents using the tools weren't affected.

**Then the stable contract paid off.** Later on, we moved `search_docs` from Algolia to Azure AI Search (keyword plus vector "hybrid" search) by changing that one variable. No agent had to change a thing! Measured through the tool itself, the right page now comes first for 40 of our 51 answerable test questions. Algolia managed 25. Azure adds a few hundred milliseconds per search (about 250 ms for hybrid, and up to about 0.2 s more since we also ask the semantic ranker for a confidence score). An agent that spends seconds on every model turn isn't going to notice.

**And the contract hid a bug.** Testing the engine directly scored better than testing through the MCP. Weird, right? The gap was exactly 2 questions that got no results at all, and both were 13 words long. The tool refused anything over 12 words with a "shorten your query" hint. We'd written that guard ourselves, to stop keyword stuffing on the old engine.

Whoops.

A real question has a few small words like "the", "my" and "when". A keyword list has none. Now the guard lets a 13 to 20 word query through on Azure as long as it has at least 3 of them. If I take one thing away from this post, it's to test through the real interface, not just the engine behind it.

So how much do agents actually use all this? TODO(data): how many MCP tool calls we get per week, and which pages agents fetch most.

## What people get out of it

- Server rendering is faster on slow phones and works with JavaScript blocked, for anybody.
- The `.md` copy is the easiest way to paste a page into your own AI tool, print it, or read it offline. One catch: right now a person has to know to add `.md`. We don't show a "copy as Markdown" link on the page yet, and we should.
- `llms.txt` is a one-page table of contents that a person can skim, too.
- The MCP server does nothing at all for somebody browsing the site. It helps the person asking their assistant about us, and post 1 suggests that's a lot of people now.

## So, how many hostnames have you got?

Go run step 5 of the check. How many hostnames serve your site, and how many of them did you already know about? Let me know in the comments.

Next in the series: **An assistant on your site should know when to say "I don't know".**

*An AI coding agent did a big chunk of the work behind this post, and helped me draft it. The numbers are from our own measurements, and so are the mistakes.*
