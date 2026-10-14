---
title: "Every page should be readable by a machine, without a second site"
published: false
description: "Markdown copies of every page, an llms.txt index and a small MCP server: how to make a Next.js site readable by AI agents without maintaining a separate version."
tags: nextjs, ai, webdev, seo
series: Expect More From Your Website
---

<!-- OUTLINE. Sources: the .md route and llms.txt route in this repo; app/api/mcp/route.ts; docs article "Build an MCP server for your content". -->

## The standard

Any page on your site should be available as clean content (no navigation, no scripts) at a predictable URL, and there should be one index that lists them all.

## The 10-minute check

- Try fetching one of your pages with `curl`. Is the answer in what comes back?
- Is there an `llms.txt` at your site root?
- Paste one of your pages into an AI assistant and ask it a question about the page. Does it get confused by menus and footers?

## Why it usually fails

- Pages are built for browsers, so the content is mixed with navigation, banners and scripts.
- Teams assume they need a separate "AI version" of the site, and never start.

## How to fix it

1. **Serve a Markdown copy of each page** from the same content source, at the page URL plus `.md`. One route, no duplicate content to maintain.
2. **Publish `/llms.txt`:** a list of every page with its title, Markdown URL and a one-line description. Generate it from your sitemap so it never drifts.
3. **Give agents tools, not just pages:** an MCP server with two tools, search and fetch, lets an assistant find the right page and read it in full.
4. **Keep the tool contract stable** so you can change the search engine behind it without breaking anyone.
5. Code example: the Next.js route that serves the `.md` copy, and the two tool definitions.

## What happened when we tried it

- Every docs page has a `.md` copy, listed in `llms.txt`, and both come from the same CMS content as the HTML.
- Our MCP server has two tools, `search_docs` and `fetch_doc`. We later moved the search behind them from Algolia to Azure hybrid search without changing the tools.
- What we got wrong: our docs site was reachable on two domains, and we had to stop search engines crawling the duplicate one.
- TODO(data): how many MCP tool calls per week, and which pages agents fetch most.

## Human angle

The Markdown copy is useful to people too: a "copy as Markdown" link for pasting a page into your own AI tool, and a clean version for printing or reading offline.

## Open

- Decide whether to show the MCP server code in full or link to the docs article.
