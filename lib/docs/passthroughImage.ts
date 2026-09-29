/**
 * Which images must bypass the `?format=auto&w=…` ladder and be served as-is.
 *
 * Shared by both article image paths — `rehypeImage` in lib/docs/renderArticleBody.ts
 * (Markdown) and components/common/blocks/Image.tsx (EditorJS) — so the two can't
 * drift apart again. The `AgilityPic` callers (HeroHeading, TextBlocksWithImages) use
 * it too, to withhold `fallbackWidth` from SVGs.
 *
 * - **GIF:** the image service does not support them.
 * - **SVG:** the image service *rasterizes* them, badly. `?format=auto&w=800` on a
 *   6.5 KB diagram returns an 800px PNG of scrambled colour blocks. Fills set through
 *   `<style>` classes — how AGENTS.md requires diagrams to be built — are ignored,
 *   and diagrams using plain `fill=` attributes came out just as broken (checked
 *   2026-09-28 on every SVG then embedded in an article). Even a correct raster would
 *   lose the in-file `prefers-color-scheme` dark theme and vector sharpness.
 *
 * Decided on the URL's pathname, so `…/diagram.svg?v=2` still counts. Pure and
 * synchronous: this runs inside the cached Markdown pipeline.
 */
const pathnameOf = (src: string): string => {
	try {
		// The base only matters for relative srcs; absolute URLs ignore it.
		return new URL(src, "https://cdn.aglty.io").pathname.toLowerCase();
	} catch {
		return src.split(/[?#]/)[0].toLowerCase();
	}
};

export const isSvgImage = (src: string): boolean => pathnameOf(src).endsWith(".svg");

export const isGifImage = (src: string): boolean => pathnameOf(src).endsWith(".gif");

export const isPassthroughImage = (src: string): boolean => isSvgImage(src) || isGifImage(src);
