import { type ContentItemRequestParams } from "@agility/content-fetch/dist/methods/getContentItem"

import { type ContentItem } from "@agility/content-fetch"
import getAgilitySDK from "./getAgilitySDK"

/**
 * Get a content item with caching information added.
 * @param params
 * @returns
 */
export const getContentItem = async <T>(params: ContentItemRequestParams) => {

	const agilitySDK = await getAgilitySDK()

	agilitySDK.config.fetchConfig = {
		next: {
			tags: [`agility-content-${params.contentID}-${params.languageCode || params.locale}`],
			revalidate: 60,
		},
	}

	return await agilitySDK.getContentItem(params) as ContentItem<T>

}