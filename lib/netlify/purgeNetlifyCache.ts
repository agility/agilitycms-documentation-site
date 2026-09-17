/**
 * Purge the fronting Netlify CDN by cache tag.
 *
 * Why this exists: agilitycms.com/docs is a Netlify proxy rewrite onto this
 * app's Vercel deployment (see HOSTING.md). Netlify caches that proxied
 * response and has no idea an Agility publish happened, so Next's
 * revalidateTag/revalidatePath only ever refresh the Vercel side. Without this,
 * a publish would not show at the apex until Netlify's TTL lapsed.
 *
 * Vendor-specific by necessity and recorded in HOSTING.md's lock-in register.
 * Kept behind env vars and called over plain HTTP rather than importing
 * @netlify/*, so the portability rule in HOSTING.md still holds: unset the vars
 * and this is a no-op, and nothing in app/ or lib/ depends on a Netlify package.
 * (`purgeCache()` from @netlify/functions is not an option regardless — it only
 * runs inside a Netlify function, and this app runs on Vercel.)
 *
 * Env:
 *   NETLIFY_PURGE_TOKEN — Netlify personal access token
 *   NETLIFY_SITE_ID     — the site ID of the APEX/marketing site that owns the
 *                         proxy rewrite, NOT this docs app. The cache entries
 *                         being purged live on that site.
 */
const PURGE_ENDPOINT = "https://api.netlify.com/api/v1/purge";

export async function purgeNetlifyCache(cacheTags: string[]): Promise<void> {
	const token = process.env.NETLIFY_PURGE_TOKEN;
	const siteID = process.env.NETLIFY_SITE_ID;

	// Not configured (local dev, or a deployment that isn't fronted by Netlify).
	if (!token || !siteID || cacheTags.length === 0) return;

	try {
		const res = await fetch(PURGE_ENDPOINT, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ site_id: siteID, cache_tags: cacheTags }),
		});

		if (!res.ok) {
			// 429 = Netlify allows each tag to be purged only twice per 5s. A
			// burst of publishes can trip it; the next publish (or the TTL)
			// still clears it, so log and move on rather than failing the hook.
			console.error(
				`purgeNetlifyCache: ${res.status} ${res.statusText}`,
				await res.text().catch(() => "")
			);
			return;
		}

		console.info("purgeNetlifyCache: purged", cacheTags.join(", "));
	} catch (e) {
		// Never let a purge failure fail the publish webhook — Agility retries
		// the whole hook, and the TTL is the backstop.
		console.error("purgeNetlifyCache: request failed", e);
	}
}
