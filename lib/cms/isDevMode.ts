/**
 * Local dev serves preview (staging) content by default. Set FORCE_PUBLISHED=1
 * to make a dev server / debug build behave like production (published
 * content, cached paths) — useful for `next build --debug-prerender` and for
 * testing the published experience locally.
 */
export const isDevMode = () =>
	process.env.NODE_ENV === "development" && process.env.FORCE_PUBLISHED !== "1";
