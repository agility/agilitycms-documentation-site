import nextConfig from "next.config";

/**
 * Root-level 404 (outside the [locale] segment) — and, since proxy.ts started
 * validating paths, the 404 the site actually serves.
 *
 * Next prerenders this route to a static file with a real 404 status, which is
 * why proxy.ts rewrites unknown paths outside the /docs basePath to reach it:
 * every route INSIDE the basePath is partially prerendered, so its 200 status
 * line is already on the wire before notFound() can run. See proxy.ts block 5.
 *
 * It deliberately carries no header/footer: those need CMS data, which would
 * turn this into a server render on every 404. Styling mirrors the in-app 404
 * at app/[locale]/[...slug]/not-found.tsx — keep the two in step.
 */
export default function NotFound() {
	return (
		<div className="min-h-full flex items-center justify-center bg-(--bg) text-(--text) px-6 py-24">
			<div className="text-center max-w-xl">
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
				<p className="m-0 mb-8" style={{ color: "var(--text-2)" }}>
					It may have moved — try the docs home and search from there.
				</p>
				{/* A plain anchor, not next/link: this page is rendered OUTSIDE the
				    basePath (that is how it gets a 404 status), so the router would
				    resolve a relative href against the wrong root. */}
				<a
					href={nextConfig.basePath || "/"}
					className="inline-block border-2 pt-2 pb-1.5 px-4 font-bold"
					style={{
						color: "var(--primary-text)",
						borderColor: "var(--primary)",
						borderRadius: "var(--r-sm)",
					}}
				>
					Back to Docs home
				</a>
			</div>
		</div>
	);
}
