---
title: "\"No results\" is feedback, so collect it"
published: false
description: "Every search that finds nothing is a reader telling you what is missing. How to capture those searches, alert on them, and turn them into a content plan."
tags: webdev, search, analytics, cms
series: Expect More From Your Website
---

<!-- OUTLINE. Sources: PostHog docs search health dashboard and alerts; algolia-search-analytics skill; evals/search/FINDINGS.md lesson 6. -->

## The standard

You should be able to list last week's searches that returned nothing, and someone should read that list every week.

## The 10-minute check

- Can you answer "what did people search for last week that found nothing?" without asking a developer?
- If you have an AI assistant or MCP server on your content, can you answer the same question for agent searches?
- When did someone last act on that list?

## Why it usually fails

- Search analytics is often turned off, or lives in a tool nobody on the content team opens.
- Searches are logged, but the result count is not, so "found nothing" is invisible.
- Agent searches (through an API or MCP server) are not logged at all.

## How to fix it

1. **Log every search with its result count**, from the site and from any agent tool. One event, two properties: the query and the number of results.
2. **Build one view:** zero-result queries, most frequent first.
3. **Alert on it.** A daily alert when zero-result searches appear is enough to build the habit.
4. **Sort each query into one of three buckets:**
   - A content gap: write the page.
   - A vocabulary gap: the page exists but uses different words, so add the reader's words to it.
   - A search problem: the page exists and uses the words, so fix the search.
5. Code example: the analytics event we send from the search modal and from the MCP tool.

## What happened when we tried it

- We set up a daily alert for site and agent searches with zero results.
- The first alert that fired was our own test traffic: we had run test queries through the live agent endpoint. Lesson: exclude your own team, and test engines directly rather than through production.
- An example of a vocabulary gap: "how do I let editors click on the page to edit it" ranked poorly everywhere because our docs never use that phrase.
- TODO(data): the real zero-result queries from the last month, sorted into the three buckets.

## Human angle

This is the cheapest content strategy there is. Your readers are writing your content backlog for you, for free, every day.

## Open

- TODO(data): how many zero-result searches per week, and how many turned into new or edited pages.
- Decide whether to include a screenshot of the dashboard.
