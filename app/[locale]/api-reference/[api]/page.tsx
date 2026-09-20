import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Footer from "components/common/Footer";
import MethodBadge from "components/api-reference/MethodBadge";
import { API_LIST, API_REGISTRY, isApiId } from "lib/api-specs/registry";
import { getOperations, getSpec } from "lib/api-specs/loadSpec";
import { groupByTag } from "lib/api-specs/operations";
import { apiReferenceUrl, apiSchema } from "lib/seo/apiReferenceSchema";
import { defaultLocale, locales } from "lib/i18n/config";

interface Props {
	params: Promise<{ locale: string; api: string }>;
}

export function generateStaticParams() {
	return locales.flatMap((locale) => API_LIST.map((api) => ({ locale, api: api.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { api: apiSlug } = await params;
	if (!isApiId(apiSlug)) return {};
	const api = API_REGISTRY[apiSlug];
	return {
		title: `${api.title} Reference | Agility Docs`,
		description: api.description.replace(/`/g, ""),
		alternates: { canonical: apiReferenceUrl(api.slug) },
	};
}

export default async function ApiOverviewPage({ params }: Props) {
	const { api: apiSlug } = await params;
	if (!isApiId(apiSlug)) notFound();

	const api = API_REGISTRY[apiSlug];
	const operations = getOperations(api.id);
	const spec = getSpec(api.id);
	const groups = Array.from(groupByTag(operations).entries());

	return (
		<>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: apiSchema(api, operations, spec.info?.version) }}
			/>
			<div className="grow bg-(--bg) text-(--text)">
				<div className="mx-auto max-w-(--wrap) px-4 pb-20 pt-10 lg:px-6">
					<nav className="mb-4 text-sm" style={{ color: "var(--muted)" }}>
						<Link href="/api-reference" style={{ color: "var(--primary-text)" }}>
							API Reference
						</Link>
					</nav>

					<h1 className="text-3xl font-bold tracking-tight">{api.title}</h1>
					<p className="mt-3 max-w-3xl text-base" style={{ color: "var(--text-2)" }}>
						{api.description.replace(/`/g, "")}
					</p>

					<dl
						className="mt-6 flex flex-wrap gap-x-8 gap-y-2"
						style={{ fontFamily: "var(--mono)", fontSize: ".74rem" }}
					>
						<div>
							<dt style={{ color: "var(--muted)" }}>Base URL</dt>
							<dd style={{ color: "var(--text)", margin: 0 }}>{api.defaultHost}</dd>
						</div>
						<div>
							<dt style={{ color: "var(--muted)" }}>Auth</dt>
							<dd style={{ color: "var(--text)", margin: 0 }}>
								{api.auth === "apiKey" ? "APIKey header" : "OAuth 2.0 bearer token"}
							</dd>
						</div>
						<div>
							<dt style={{ color: "var(--muted)" }}>Operations</dt>
							<dd style={{ color: "var(--text)", margin: 0 }}>{operations.length}</dd>
						</div>
					</dl>

					{api.conceptualDocPath && (
						<p className="mt-5 text-sm" style={{ color: "var(--text-2)" }}>
							New to this API?{" "}
							<Link href={api.conceptualDocPath} style={{ color: "var(--primary-text)" }}>
								Start with the guide
							</Link>
							.
						</p>
					)}

					{groups.map(([tag, ops]) => (
						<section key={tag} className="mt-10">
							<h2
								className="mb-3 text-xs font-semibold uppercase tracking-wider"
								style={{ color: "var(--muted)" }}
							>
								{tag}
							</h2>
							<ul className="list-none p-0" style={{ margin: 0 }}>
								{ops.map((op) => (
									<li key={op.slug} style={{ margin: 0 }}>
										<Link
											href={`/api-reference/${api.slug}/${op.slug}`}
											className="flex items-baseline gap-3 px-3 py-2.5"
											style={{
												borderBottom: "1px solid var(--border)",
												textDecoration: "none",
												color: "var(--text)",
											}}
										>
											<MethodBadge method={op.method} />
											<code
												className="min-w-0 break-all"
												style={{ fontFamily: "var(--mono)", fontSize: ".78rem" }}
											>
												{op.path}
											</code>
											<span
												className="ml-auto hidden shrink-0 text-right text-xs md:block"
												style={{ color: "var(--muted)", maxWidth: "22rem" }}
											>
												{op.summary}
											</span>
										</Link>
									</li>
								))}
							</ul>
						</section>
					))}
				</div>
			</div>
			<Footer languageCode={defaultLocale} isPreview={false} />
		</>
	);
}
