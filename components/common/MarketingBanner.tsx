import type { BannerCta } from "lib/cms-content/getHeaderData";

/**
 * The marketing bar — a thin strip above the docs topbar that carries the
 * marketing site's current message and links back to agilitycms.com.
 *
 * It sits ABOVE the sticky header rather than inside it, so it scrolls away on
 * first scroll and never competes with the docs nav for the viewport. That also
 * keeps it out of the header's shrink-on-scroll hysteresis
 * (components/common/Header.tsx) — the header's two thresholds are tuned to the
 * height IT loses, and a banner inside that row would have fed into the same
 * measurement.
 *
 * The height is fixed at 36px on purpose: the layout's Suspense fallback
 * reserves exactly that, so the page doesn't shift when this streams in.
 *
 * Every link here leaves the docs app, so they are plain `<a>` elements. A
 * `next/link` would prepend basePath `/docs` to a site-relative href and
 * client-route to a URL this app doesn't serve — hrefs arrive already absolute
 * from `toMainSiteUrl`.
 */
const MarketingBanner = ({ html, ctas }: { html?: string; ctas: BannerCta[] }) => {
	if (!html && ctas.length === 0) return null;

	return (
		<div className="shrink-0 border-b border-(--border) bg-(--raised)">
			<div className="mx-auto flex h-9 max-w-[90rem] items-center gap-4 px-4 text-xs sm:px-6 lg:px-8">
				{html && (
					/* The message is CMS HTML with no guaranteed shape — it may be a
					   bare string, one <p>, or several. `line-clamp-1` goes on the
					   container and children are forced inline so that whatever an
					   editor pastes collapses to a single ellipsised line instead of
					   growing the bar past the height the fallback reserved. */
					<div
						className="min-w-0 flex-1 line-clamp-1 text-(--text-2) [&_*]:inline [&_p]:m-0 [&_br]:hidden [&_a]:font-medium [&_a]:text-(--text) [&_a]:underline [&_a]:underline-offset-2"
						dangerouslySetInnerHTML={{ __html: html }}
					/>
				)}
				{ctas.length > 0 && (
					<nav className="ml-auto flex shrink-0 items-center gap-4" aria-label="Agility CMS">
						{/* keyed by position: two CTAs may legitimately share a URL */}
						{ctas.map((cta, i) => (
							<a
								key={i}
								href={cta.href}
								target={cta.target === "_blank" ? "_blank" : undefined}
								rel={cta.target === "_blank" ? "noreferrer" : undefined}
								className="whitespace-nowrap font-medium text-(--text-2) underline-offset-4 transition-colors hover:text-(--text) hover:underline"
							>
								{cta.text}
							</a>
						))}
					</nav>
				)}
			</div>
		</div>
	);
};

export default MarketingBanner;
