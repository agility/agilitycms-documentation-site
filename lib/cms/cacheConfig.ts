/**
 * Cache configuration for Agility CMS fetches (same convention as the
 * marketing site and demosite2025).
 *
 * - cacheDuration: TTL for tagged data fetches (content items/lists/sitemaps).
 * - pathRevalidateDuration: page-level ISR window for the catch-all route.
 *
 * Both are backstops — the /api/revalidate webhook gives instant invalidation
 * via revalidateTag/revalidatePath on publish.
 */
export const cacheConfig = {
	cacheDuration: process.env.AGILITY_FETCH_CACHE_DURATION
		? parseInt(process.env.AGILITY_FETCH_CACHE_DURATION)
		: 3600,
	pathRevalidateDuration: process.env.AGILITY_PATH_REVALIDATE_DURATION
		? parseInt(process.env.AGILITY_PATH_REVALIDATE_DURATION)
		: 86400,
};
