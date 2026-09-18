import { GoogleTagManager } from "@next/third-parties/google";

import nextConfig from "next.config";
import { defaultLocale } from "lib/i18n/config";
import { getHeaderData } from "lib/cms-content/getHeaderData";
import Header from "components/common/Header";
import Footer from "components/common/Footer";
import ClientInit from "components/common/ClientInit";

/**
 * The 404 page — and, since proxy.ts started validating paths, the one the site
 * actually serves. Modelled on the marketing site's src/app/not-found.tsx: site
 * chrome, an apology that doesn't blame the reader, and somewhere useful to go.
 *
 * WHY IT LIVES HERE, OUTSIDE [locale]
 * Every route inside the /docs basePath is partially prerendered, so its 200
 * status line is already on the wire before a page can call notFound() — the
 * soft 404 this repo used to serve. Next prerenders THIS route to a static file
 * with a real 404 status baked in (.next/server/app/_not-found.meta), so
 * proxy.ts rewrites unknown paths to a path outside the basePath, which matches
 * no route and lands here. See proxy.ts block 5.
 *
 * WHY THE CHROME IS FREE
 * Nothing here is wrapped in <Suspense>, deliberately: getHeaderData and the
 * Footer's getFooterData are both 'use cache', so this whole page — header, nav
 * and footer included — resolves during the build and ships as static HTML. A
 * reader gets a 404 with no server render at all. Keep it that way: introduce
 * one uncached read and this route starts postponing, which puts the 200 back
 * (that is exactly the bug getRichSnippet had — see its vimeoOEmbed comment).
 *
 * The chrome is rendered by hand rather than inherited because the site chrome
 * lives in app/[locale]/layout.tsx and this route sits above it.
 */
export default async function NotFound() {
	const headerData = await getHeaderData({ locale: defaultLocale, preview: false });
	const basePath = nextConfig.basePath || "";

	// The top-level sections, straight off the header data, so this list tracks
	// the nav instead of rotting as a hardcoded copy. "/" is already the
	// "Back to Docs home" button above, so it is dropped here.
	const sections = (headerData.mainMenuLinks || []).filter((link: any) => link.href !== "/");

	return (
		<div id="SiteWrapper" className="min-h-full font-muli">
			<GoogleTagManager gtmId="GTM-NJW8WMX" />
			<ClientInit />
			<div id="Site" className="flex flex-col min-h-full">
				<Header {...headerData} />

				<div className="grow flex items-start justify-center bg-(--bg) text-(--text) px-6 py-24">
					<div className="w-full max-w-2xl">
						<p
							className="uppercase m-0 mb-4"
							style={{
								fontFamily: "var(--mono)",
								fontSize: ".76rem",
								letterSpacing: ".24em",
								color: "var(--muted)",
							}}
						>
							404 · Not Found
						</p>
						<h1
							className="m-0 mb-4"
							style={{
								fontFamily: "var(--serif)",
								fontSize: "clamp(1.8rem,4vw,2.6rem)",
								letterSpacing: "-.03em",
								lineHeight: 1.1,
							}}
						>
							We couldn&apos;t find that page.
						</h1>
						<p className="m-0 mb-8 text-lg" style={{ color: "var(--text-2)" }}>
							It either moved or we pointed you at a dead link — either way, that&apos;s on us.
							Search from the header, or start from one of the sections below.
						</p>

						{/* Plain anchors, not next/link: this route is rendered OUTSIDE the
						    basePath, and a full load is the right thing from a 404 anyway. */}
						<a
							href={basePath || "/"}
							className="inline-block border-2 pt-2 pb-1.5 px-4 font-bold"
							style={{
								color: "var(--primary-text)",
								borderColor: "var(--primary)",
								borderRadius: "var(--r-sm)",
							}}
						>
							Back to Docs home
						</a>

						{sections.length > 0 && (
							<div className="mt-12 border-t pt-8" style={{ borderColor: "var(--border)" }}>
								<h2
									className="uppercase m-0 mb-4"
									style={{
										fontFamily: "var(--mono)",
										fontSize: ".72rem",
										letterSpacing: ".2em",
										color: "var(--muted)",
									}}
								>
									Or pick up where you meant to be
								</h2>
								<ul className="m-0 p-0 list-none flex flex-col gap-1">
									{sections.map((link: any) => (
										<li key={link.href}>
											<a
												href={`${basePath}${link.href}`}
												className="-mx-2 block rounded-lg px-2 py-2 hover:bg-(--surface-2)"
											>
												{link.name}
											</a>
										</li>
									))}
								</ul>
							</div>
						)}
					</div>
				</div>

				{/* Templates render the Footer themselves (it sits inside their scroll
				    container), so this route has to as well. */}
				<Footer languageCode={defaultLocale} isPreview={false} />
			</div>
		</div>
	);
}
