"use client";

import { useEffect } from "react";

import nextConfig from "next.config";
import { initPostHog, track } from "lib/analytics/posthog";

/**
 * Route-level error boundary — the "500" page. Renders inside the layout that
 * was already on screen, so the header and footer stay put and only the failed
 * subtree is replaced. Modelled on the marketing site's src/app/error.tsx.
 *
 * Before this existed, anything that threw fell through to global-error.tsx,
 * which replaces the entire document with a bare unstyled screen — the right
 * behaviour when the root layout itself is broken, far too blunt when one CMS
 * fetch failed.
 *
 * `unstable_retry` (Next 16.2+), NOT `reset`: reset only re-renders the
 * boundary's children, while retry re-fetches and re-renders them. Almost
 * everything that lands here is a failed Agility fetch, and re-rendering
 * without re-fetching would reproduce it — the button would look like it did
 * something and change nothing.
 */
export default function ErrorPage({
	error,
	unstable_retry,
}: {
	error: Error & { digest?: string };
	unstable_retry: () => void;
}) {
	useEffect(() => {
		console.error(error);
		// PostHog's exception autocapture can't see an error React has already
		// caught in a boundary, so report it explicitly. initPostHog() first
		// because this boundary can render before ClientInit's effect has run,
		// and track() is a no-op until PostHog is initialised. Both are safe to
		// call repeatedly and inert without NEXT_PUBLIC_POSTHOG_KEY.
		initPostHog();
		track("$exception", {
			$exception_message: error.message,
			$exception_type: error.name,
			$exception_source: "app/error.tsx",
			digest: error.digest,
		});
	}, [error]);

	return (
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
					500 · Something went wrong
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
					Something broke on our end.
				</h1>
				<p className="m-0 mb-8 text-lg" style={{ color: "var(--text-2)" }}>
					Not your fault, and plenty of these clear on a second try. If it doesn&apos;t, the chat
					widget reaches a real person.
				</p>

				<div className="flex flex-wrap gap-3">
					<button
						onClick={() => unstable_retry()}
						className="inline-block border-2 pt-2 pb-1.5 px-4 font-bold cursor-pointer"
						style={{
							color: "var(--primary-text)",
							borderColor: "var(--primary)",
							borderRadius: "var(--r-sm)",
						}}
					>
						Try again
					</button>
					<a
						href={nextConfig.basePath || "/"}
						className="inline-block border-2 pt-2 pb-1.5 px-4 font-bold"
						style={{ borderColor: "var(--border)", borderRadius: "var(--r-sm)" }}
					>
						Back to Docs home
					</a>
				</div>

				{/* Next replaces the real message with this hash in production so server
				    internals can't leak to the browser, and logs the same hash beside the
				    full stack trace. Quoting it is the only way a reader's report can be
				    matched to the actual failure — hence spelling out what it is for. */}
				{error.digest && (
					<p
						className="mt-12 border-t pt-8 text-sm"
						style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
					>
						Error code{" "}
						<span style={{ fontFamily: "var(--mono)", color: "var(--text)" }}>{error.digest}</span>{" "}
						— quote it and we can go straight to what failed.
					</p>
				)}
			</div>
		</div>
	);
}
