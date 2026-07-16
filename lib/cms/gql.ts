import "server-only";

import { cacheLife, cacheTag } from "next/cache";

interface Params {
	query: string;
	locale: string;
	preview: boolean;
}

/**
 * Query the Agility GraphQL API (replaces the Pages-Router Apollo client).
 *
 * Published requests are cached under the coarse `agility-graphql-{locale}`
 * tag — the /api/revalidate webhook busts it on ANY content publish, since a
 * GraphQL result can join many containers (sidebar nav, changelog, header).
 * Preview requests bypass the cache.
 */
export const gql = async <T = any>(params: Params): Promise<T> => {
	if (params.preview) return fetchGql<T>(params);
	return cachedGql<T>(params);
};

const cachedGql = async <T>(params: Params): Promise<T> => {
	"use cache";
	cacheTag(`agility-graphql-${params.locale}`);
	cacheLife("days");
	return fetchGql<T>({ ...params, preview: false });
};

const fetchGql = async <T>({ query, locale, preview }: Params): Promise<T> => {
	const mode = preview ? "preview" : "fetch";
	const apiKey = preview
		? process.env.AGILITY_API_PREVIEW_KEY
		: process.env.AGILITY_API_FETCH_KEY;

	const res = await fetch(
		`https://api.aglty.io/v1/${process.env.AGILITY_GUID}/${mode}/${locale}/graphql`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				apiKey: apiKey || "",
			},
			body: JSON.stringify({ query }),
		}
	);

	if (!res.ok) {
		throw new Error(`Agility GraphQL error ${res.status}: ${await res.text()}`);
	}

	const json = await res.json();
	if (json.errors?.length) {
		throw new Error(`Agility GraphQL error: ${JSON.stringify(json.errors)}`);
	}
	return json.data as T;
};
