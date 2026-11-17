/**
 * The responsive `srcset` for article images, shared by both article image paths:
 * `rehypeImage` in lib/docs/renderArticleBody.ts (Markdown) and
 * components/common/blocks/Image.tsx (EditorJS).
 *
 * **Why width descriptors, not media queries.** The old ladder was a stack of `<source
 * media="(min-width: …) and (min-resolution: 2x)">` rows with a `w=400` fallback. Below
 * 600px wide no row matched, so every phone got the 400px file whatever its density: on a
 * 3x iPhone a screenshot drawn 358px wide (1,074 device pixels) got 400 (Tanvir,
 * 2026-11-17, /docs/editors/finding-your-content). With `w` descriptors plus `sizes`, the
 * browser multiplies by the screen's density itself and picks the right step.
 *
 * **Capped at the original width, which is always a step.** The image CDN upscales: `w=2000`
 * on a 1280px source returns a real 2000px image, so steps above the original would ship
 * upscaled bytes. The old ladder also skipped the original itself, so a 1,015px screenshot
 * topped out at 800. The original width is now the top step, up to MAX_WIDTH.
 */

/** The CDN widths the ladder offers, smallest first. */
const WIDTHS = [400, 600, 800, 1200, 1600, 2000];

/** The largest file we ever ask for. */
const MAX_WIDTH = 2000;

/** Used when the image's real width is unknown, as Image.tsx always has. */
export const DEFAULT_IMAGE_WIDTH = 800;

/**
 * How wide an article image is drawn. Measured 2026-11-17 on agilitycms.com/docs: the
 * article column is 624px from a 768px viewport up, and the viewport minus 32px of padding
 * below that.
 */
export const ARTICLE_IMAGE_SIZES = "(min-width: 768px) 624px, calc(100vw - 32px)";

/**
 * `url` must already carry `?format=auto` (with spaces encoded); `originalWidth` is the
 * image's real pixel width, if known.
 */
export function articleImageSrcset(url: string, originalWidth?: number): { src: string; srcSet: string } {
	const top = Math.min(originalWidth && originalWidth > 0 ? originalWidth : DEFAULT_IMAGE_WIDTH, MAX_WIDTH);
	const widths = [...WIDTHS.filter((w) => w < top), top];
	return {
		// The fallback for browsers without srcset: the step closest to the desktop column.
		src: `${url}&w=${Math.min(800, top)}`,
		srcSet: widths.map((w) => `${url}&w=${w} ${w}w`).join(", "),
	};
}
