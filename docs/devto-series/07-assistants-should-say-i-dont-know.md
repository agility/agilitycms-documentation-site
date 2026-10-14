---
title: "An assistant on your site should know when to say \"I don't know\""
published: false
description: "A chatbot on your content is an AI model calling your search. How to make it cite its sources and refuse when your content does not have the answer."
tags: ai, webdev, search, javascript
series: Expect More From Your Website
---

<!-- OUTLINE. Sources: evals/search/FINDINGS.md lessons 7 and 10; docs article "Build a chatbot on your content". -->

## The standard

An assistant answering from your content should cite the pages it used, and should say "I don't know" when your content does not cover the question, rather than make something up.

## The 10-minute check

- Ask your site's chatbot (or any assistant pointed at your docs) a question your content does not answer. Does it admit it, or invent an answer?
- Does every answer link to the page it came from?

## Why it usually fails

- The model is asked to "be helpful", so a confident wrong answer looks like success.
- The system has no measure of how relevant the retrieved pages actually were.

## How to fix it

1. **Build the assistant on your search,** not on a model's memory: the model calls a search tool, reads the top pages, and answers only from them.
2. **Require citations** in the answer format.
3. **Use the search engine's confidence score as a gate.** If the best result scores below a threshold, the assistant says it does not know and suggests where to ask.
4. **Calibrate the threshold on your own content,** with several questions you know have no answer.
5. Code example: the refusal check, a few lines around the search call.

## What happened when we tried it

- With a semantic reranker scoring 0 to 4, the top result for every answerable test question scored at least 2.16. Our one no-answer question scored 1.94. That suggests a threshold around 2.0.
- What we have not done yet: one probe is not enough to set a threshold. We need around 15 no-answer questions before relying on it, and this post should say so plainly.

## Human angle

A reader who gets "I don't know, here is how to ask us" trusts the next answer. A reader who gets a confident wrong answer stops using the assistant, and possibly the product.

## Open

- TODO(data): rerun with about 15 no-answer questions and report the threshold properly before publishing.
- Decide whether the docs chatbot is live by the time this post goes out, or whether the post teaches the pattern without a live demo.
