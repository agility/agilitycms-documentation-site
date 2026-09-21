import React from "react";
import { Metadata } from "next";
import Link from "next/link";

import Footer from "components/common/Footer";
import { API_LIST } from "lib/api-specs/registry";
import { getOperations } from "lib/api-specs/loadSpec";
import { apiReferenceUrl, indexSchema } from "lib/seo/apiReferenceSchema";
import { defaultLocale, locales } from "lib/i18n/config";

/**
 * /docs/api-reference — the index of the generated API reference.
 *
 * This route tree is hand-written, not CMS-backed, so it has to be allowed
 * through the sitemap check in proxy.ts (APP_PATH_PREFIXES). Without that entry
 * it 404s in production while working perfectly in `next dev`, because the
 * check is skipped in dev and draft mode.
 */

export const metadata: Metadata = {
	title: "API Reference | Agility Docs",
	description:
		"Interactive reference for the Agility CMS Content Fetch API and Management API, generated from the OpenAPI specs — with a live explorer you can run against your own instance.",
	alternates: { canonical: apiReferenceUrl() },
};

export function generateStaticParams() {
	return locales.map((locale) => ({ locale }));
}

export default function ApiReferenceIndex() {
	// Synchronous: the specs are checked-in snapshots, so there is no IO here
	// and nothing that could postpone this route. See loadSpec.ts.
	const counts = API_LIST.map((api) => ({ api, count: getOperations(api.id).length }));

	return (
		<>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: indexSchema(API_LIST) }}
			/>
			<div className="grow bg-(--bg) text-(--text)">
				<div className="mx-auto max-w-(--wrap) px-4 pb-20 pt-10 lg:px-6">
					<h1 className="text-3xl font-bold tracking-tight sm:text-4xl">API Reference</h1>
					<p className="mt-3 max-w-2xl text-base" style={{ color: "var(--text-2)" }}>
						Every endpoint in the Agility CMS REST APIs, generated from the OpenAPI specs so
						it can&rsquo;t drift from what the APIs actually do. Sign in and you can run
						requests against your own instance without leaving the page.
					</p>

					<div className="mt-10 grid gap-5 sm:grid-cols-2">
						{counts.map(({ api, count }) => (
							<Link
								key={api.id}
								href={`/api-reference/${api.slug}`}
								className="block p-5 transition-shadow hover:shadow-[var(--elev-2)]"
								style={{
									background: "var(--surface)",
									border: "1px solid var(--border)",
									borderRadius: "var(--r-md)",
									textDecoration: "none",
								}}
							>
								<h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
									{api.title}
								</h2>
								<p className="mt-1.5 text-sm" style={{ color: "var(--text-2)" }}>
									{api.tagline}
								</p>
								<p
									className="mt-3"
									style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--muted)" }}
								>
									{count} operations · {api.auth === "apiKey" ? "API key" : "OAuth 2.0"}
								</p>
							</Link>
						))}
					</div>
				</div>
			</div>
			<Footer languageCode={defaultLocale} isPreview={false} />
		</>
	);
}
