import "server-only";

import { isDevMode } from "lib/cms/isDevMode";

import agility, { ApiClientInstance } from "@agility/content-fetch";
import { draftMode } from "next/headers";

/**
 * Agility content-fetch SDK factory (pattern from demosite2025).
 *
 * Preview is on when Next.js draft mode is enabled OR we're in local dev —
 * dev always shows staging content so editors/devs see work-in-progress.
 */
const getAgilitySDK = async (): Promise<ApiClientInstance> => {
	const isDevelopmentMode = isDevMode();
	const { isEnabled: isDraftMode } = await draftMode();
	const isPreview = isDevelopmentMode || isDraftMode;

	return getAgilitySDK_NonReact({ isPreview });
};

/**
 * SDK factory for contexts where draftMode() can't be read (generateStaticParams,
 * webhooks, cached scopes). Preview must be decided by the caller.
 */
export const getAgilitySDK_NonReact = ({ isPreview }: { isPreview: boolean }): ApiClientInstance => {
	const apiKey = isPreview
		? process.env.AGILITY_API_PREVIEW_KEY
		: process.env.AGILITY_API_FETCH_KEY;

	return agility.getApi({
		guid: process.env.AGILITY_GUID,
		apiKey,
		isPreview,
	});
};

export default getAgilitySDK;
