import "server-only";

/**
 * Neutral IndexNow endpoint — a submission here is shared with every
 * participating search engine (Bing, Yandex, Seznam, Naver, …).
 */
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/** IndexNow accepts up to 10,000 URLs per request. */
const MAX_URLS_PER_REQUEST = 10000;

// Canonical host + docs base, matching the rest of the site (getRichSnippet /
// resolveAgilityMetaData / sitemap). The docs live under /docs on this host.
const SITE_HOST = "agilitycms.com";
const SITE_URL = "https://agilitycms.com/docs";

// Read env at call time (not module-load): the webhook entrypoint may load env
// vars after this module is imported.
const getIndexNowKey = () => process.env.INDEXNOW_KEY || "";

/**
 * Whether we should actually ping IndexNow from this environment. We only want
 * to submit from the real production site — preview/branch deploys and local
 * dev must not (their key file isn't reachable at the canonical host, and their
 * URLs aren't the ones we want recrawled). Set INDEXNOW_ALLOW_NON_PROD=true to
 * force submission when testing.
 */
const isSubmissionEnabled = () =>
	process.env.VERCEL_ENV === "production" || process.env.INDEXNOW_ALLOW_NON_PROD === "true";

/**
 * Notify IndexNow-participating search engines that one or more docs URLs have
 * changed so they recrawl sooner. Safe to call from the publish webhook.
 *
 * Accepts absolute URLs or docs-relative paths (e.g. "/overview/concepts");
 * relative paths resolve against the docs base URL. URLs that don't belong to
 * the canonical host are dropped. No-ops (with a log line) when the key isn't
 * configured or the environment isn't production.
 *
 * The key file is served at `${SITE_URL}/${key}.txt` (see proxy.ts). Because
 * that is a non-root key location, IndexNow authorizes exactly the /docs URL
 * space we submit — which is what we want for a sub-path site.
 *
 * @param urls A single URL/path or an array of them.
 */
export const submitToIndexNow = async (urls: string | string[]): Promise<void> => {
	const list = Array.isArray(urls) ? urls : [urls];
	if (list.length === 0) return;

	const key = getIndexNowKey();
	if (!key) {
		console.info("IndexNow: INDEXNOW_KEY not set — skipping submission.");
		return;
	}

	if (!isSubmissionEnabled()) {
		console.info("IndexNow: not a production environment — skipping submission.");
		return;
	}

	// Resolve to absolute docs URLs on the canonical host, de-duplicated.
	const urlList = Array.from(
		new Set(
			list
				.map((u) => {
					try {
						const abs = /^https?:\/\//i.test(u)
							? u
							: `${SITE_URL}${u.startsWith("/") ? u : `/${u}`}`;
						const resolved = new URL(abs);
						return resolved.host === SITE_HOST ? resolved.toString() : null;
					} catch {
						return null;
					}
				})
				.filter((u): u is string => u !== null)
		)
	).slice(0, MAX_URLS_PER_REQUEST);

	if (urlList.length === 0) return;

	const body = {
		host: SITE_HOST,
		key,
		keyLocation: `${SITE_URL}/${key}.txt`,
		urlList,
	};

	try {
		const res = await fetch(INDEXNOW_ENDPOINT, {
			method: "POST",
			headers: { "Content-Type": "application/json; charset=utf-8" },
			body: JSON.stringify(body),
			cache: "no-store",
			// Best-effort and fired from the publish webhook — never let a hung
			// endpoint stall the webhook response.
			signal: AbortSignal.timeout(10000),
		});

		if (res.ok) {
			console.info(`IndexNow: submitted ${urlList.length} url(s).`);
		} else {
			// 429 = rate limited; 4xx = key/host problem. Best-effort — log and move on.
			console.error(
				`IndexNow: submission failed (${res.status} ${res.statusText}) for ${urlList.length} url(s).`
			);
		}
	} catch (e) {
		console.error("IndexNow: submission error:", e instanceof Error ? e.message : String(e));
	}
};
