import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Footer from "components/common/Footer";
import ApiExplorer from "components/api-reference/ApiExplorer";
import MethodBadge from "components/api-reference/MethodBadge";
import ParameterTable from "components/api-reference/ParameterTable";
import { API_LIST, API_REGISTRY, isApiId } from "lib/api-specs/registry";
import { getOperation, getOperations, getSpec } from "lib/api-specs/loadSpec";
import { apiReferenceUrl, operationSchema } from "lib/seo/apiReferenceSchema";
import { defaultLocale, locales } from "lib/i18n/config";
import { OpenApiParameter } from "lib/api-specs/types";

interface Props {
	params: Promise<{ locale: string; api: string; operation: string }>;
}

/**
 * Prerender every operation page — 126 of them at the last count. They are
 * fully static: the specs are checked-in snapshots (loadSpec.ts, no IO) and the
 * only dynamic thing on the page, the explorer, is a client component that
 * fetches its own session after hydration. Nothing here postpones the route.
 *
 * An operation slug NOT in this list never reaches the render: Cache Components
 * rejects `dynamicParams = false`, so proxy.ts 404s unknown reference paths
 * instead. That is why it validates against the same snapshots — if the two
 * sources could disagree, the gap would show up as a soft 404 (200 + not-found
 * UI), which is the failure the proxy check exists to prevent.
 */
export function generateStaticParams() {
	const flat = API_LIST.flatMap((api) =>
		getOperations(api.id).map((op) => ({ api: api.slug, operation: op.slug }))
	);
	return locales.flatMap((locale) => flat.map((entry) => ({ locale, ...entry })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { api: apiSlug, operation: opSlug } = await params;
	if (!isApiId(apiSlug)) return {};
	const api = API_REGISTRY[apiSlug];
	const op = getOperation(api.id, opSlug);
	if (!op) return {};

	const name = op.summary || `${op.method.toUpperCase()} ${op.path}`;
	return {
		title: `${name} — ${api.title} | Agility Docs`,
		description: `${op.method.toUpperCase()} ${op.path}. ${op.summary}`.trim(),
		alternates: { canonical: apiReferenceUrl(api.slug, op.slug) },
	};
}

export default async function OperationPage({ params }: Props) {
	const { api: apiSlug, operation: opSlug } = await params;
	if (!isApiId(apiSlug)) notFound();

	const api = API_REGISTRY[apiSlug];
	const op = getOperation(api.id, opSlug);
	const spec = getSpec(api.id);
	if (!op) notFound();

	const parameters: OpenApiParameter[] = op.operation.parameters || [];
	const pathParams = parameters.filter((p) => p.in === "path");
	const queryParams = parameters.filter((p) => p.in === "query");
	const headerParams = parameters.filter((p) => p.in === "header");
	const responses = Object.entries(op.operation.responses || {});

	// v1 restricts the runner to read-only APIs — the reference still documents
	// every operation, but "try it" is not wired to anything that writes to a
	// customer's live instance. See allowWrites in lib/api-specs/registry.ts.
	const runnable = api.allowWrites && api.auth === "apiKey";

	return (
		<>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: operationSchema(api, op, spec.info?.version),
				}}
			/>
			<div className="grow bg-(--bg) text-(--text)">
				<div className="mx-auto max-w-(--wrap) px-4 pb-20 pt-10 lg:px-6">
					<nav className="mb-4 text-sm" style={{ color: "var(--muted)" }}>
						<Link href="/api-reference" style={{ color: "var(--primary-text)" }}>
							API Reference
						</Link>
						{" / "}
						<Link href={`/api-reference/${api.slug}`} style={{ color: "var(--primary-text)" }}>
							{api.title}
						</Link>
					</nav>

					<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
						{op.summary || `${op.method.toUpperCase()} ${op.path}`}
					</h1>

					<div
						className="mt-4 flex flex-wrap items-center gap-3 px-3.5 py-3"
						style={{
							background: "var(--code-bg)",
							border: "1px solid var(--border)",
							borderRadius: "var(--r-md)",
						}}
					>
						<MethodBadge method={op.method} />
						<code
							className="min-w-0 break-all"
							style={{ fontFamily: "var(--mono)", fontSize: ".82rem", color: "var(--text)" }}
						>
							<span style={{ color: "var(--muted)" }}>{api.defaultHost}</span>
							{op.path}
						</code>
					</div>

					{op.aliases.length > 0 && (
						<p className="mt-3 text-sm" style={{ color: "var(--text-2)" }}>
							Also served at{" "}
							{op.aliases.map((alias, i) => (
								<React.Fragment key={alias}>
									{i > 0 && ", "}
									<code style={{ fontFamily: "var(--mono)", fontSize: ".8rem" }}>{alias}</code>
								</React.Fragment>
							))}
							. The two forms are equivalent; prefer the one above.
						</p>
					)}

					{op.operation.description && (
						<p className="mt-4 max-w-3xl text-base" style={{ color: "var(--text-2)" }}>
							{op.operation.description}
						</p>
					)}

					<ParameterTable title="Path parameters" parameters={pathParams} />
					<ParameterTable title="Query parameters" parameters={queryParams} />
					<ParameterTable title="Headers" parameters={headerParams} />

					{responses.length > 0 && (
						<section className="mt-8">
							<h3 className="mb-3 text-base font-semibold" style={{ color: "var(--text)" }}>
								Responses
							</h3>
							<ul className="list-none p-0" style={{ margin: 0 }}>
								{responses.map(([code, response]) => (
									<li
										key={code}
										className="flex items-baseline gap-3 px-3 py-2"
										style={{ borderBottom: "1px solid var(--border)", margin: 0 }}
									>
										<code
											style={{
												fontFamily: "var(--mono)",
												fontSize: ".8rem",
												color: Number(code) < 400 ? "var(--ok)" : "var(--err)",
											}}
										>
											{code}
										</code>
										<span className="text-sm" style={{ color: "var(--text-2)" }}>
											{response.description || "—"}
										</span>
									</li>
								))}
							</ul>
						</section>
					)}

					<ApiExplorer
						path={op.path}
						method={op.method}
						parameters={parameters}
						defaultHost={api.defaultHost}
						runnable={runnable}
						notRunnableReason={
							api.auth === "oauth"
								? "The Management API explorer is coming in a later release. Its calls change live content, so it needs the OAuth flow and a confirmation step before it runs anything."
								: "This operation can't be run from the browser."
						}
					/>
				</div>
			</div>
			<Footer languageCode={defaultLocale} isPreview={false} />
		</>
	);
}
