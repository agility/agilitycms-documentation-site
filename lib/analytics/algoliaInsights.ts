"use client";

import { posthog } from "./posthog";

/*
  Algolia Insights — sends "click after search" events so the Algolia
  dashboard reports click-through rate, average click position, and top
  clicked results for the `doc_site` index. Pairs with clickAnalytics:true on
  the search query (which returns the queryID each click must reference).

  Dependency-free: posts straight to the Insights REST API with the public
  search credentials (the search API key is authorized to send events). Runs
  only from click handlers, so it's Cache-Components-safe.

  These metrics only populate once events start flowing; the raw "what did
  people search for" data is recorded by Algolia server-side regardless and is
  read via the `algolia-search-analytics` skill.
*/

const APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const API_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY;
const INSIGHTS_ENDPOINT = "https://insights.algolia.io/1/events";
const INDEX = "doc_site";
const USER_TOKEN_KEY = "aglty-algolia-ut";

/**
 * A stable anonymous token for this visitor. Prefers the PostHog distinct id
 * so Algolia click analytics and PostHog events describe the same person;
 * falls back to a persisted random token when PostHog is absent.
 */
function getUserToken(): string {
	try {
		const phId = posthog?.get_distinct_id?.();
		if (phId) return String(phId);
	} catch {
		/* posthog not initialized */
	}
	try {
		let t = localStorage.getItem(USER_TOKEN_KEY);
		if (!t) {
			// Not called during prerender — only from click handlers.
			t = "anon-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
			localStorage.setItem(USER_TOKEN_KEY, t);
		}
		return t;
	} catch {
		return "anonymous";
	}
}

/**
 * Fire-and-forget click event. Needs the queryID from the search response
 * (present only when clickAnalytics:true) and the result's 1-based absolute
 * position. Silently skips when unconfigured or missing a queryID.
 */
export function sendAlgoliaClick({
	objectID,
	position,
	queryID,
}: {
	objectID: string;
	position: number;
	queryID?: string;
}): void {
	if (!APP_ID || !API_KEY || !objectID || !queryID) return;
	const payload = {
		events: [
			{
				eventType: "click",
				eventName: "Docs Result Clicked",
				index: INDEX,
				userToken: getUserToken(),
				queryID,
				objectIDs: [objectID],
				positions: [position],
			},
		],
	};
	try {
		fetch(INSIGHTS_ENDPOINT, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Algolia-Application-Id": APP_ID,
				"X-Algolia-API-Key": API_KEY,
			},
			body: JSON.stringify(payload),
			keepalive: true,
		}).catch(() => {});
	} catch {
		/* analytics must never break the UI */
	}
}
