/* eslint-disable @next/next/no-img-element */
import React from "react";
import { cacheLife } from "next/cache";
import Link from "next/link";
import nextConfig from "next.config";
import { getFooterData } from "lib/cms-content/getFooterData";
import { defaultLocale } from "lib/i18n/config";

/*
  Lean docs footer (Stripe/Vercel docs pattern): same brand tokens as the
  marketing site, but quiet, utilitarian, and docs-scoped — NOT the marketing
  mega-footer. Content comes from the docs instance's single `Footer` item
  (tagline + three link columns + legal links); the constants below are the
  fallback when that item isn't available (e.g. not yet published).
*/

const FALLBACK = {
	tagline:
		"Documentation for the CMS built for editors, developers, and AI agents.",
	columns: [
		{
			heading: "Docs",
			links: [
				{ text: "Overview", href: "~/overview" },
				{ text: "Editors", href: "~/editors" },
				{ text: "Developers", href: "~/developers" },
				{ text: "Owners & Admins", href: "~/owners-admins" },
				{ text: "Training Guide", href: "~/training-guide" },
				{ text: "Changelog", href: "~/changelog" },
			],
		},
		{
			heading: "Resources",
			links: [
				{ text: "Get Support", href: "https://help.agilitycms.com/hc/en-us/requests/new" },
				{ text: "MCP Server", href: "https://mcp.agilitycms.com" },
				{ text: "System Status", href: "https://status.agilitycms.com/" },
				{ text: "llms.txt", href: "~/llms.txt" },
			],
		},
		{
			heading: "Agility",
			links: [
				{ text: "agilitycms.com", href: "https://agilitycms.com" },
				{ text: "Start Free Trial", href: "https://agilitycms.com/trial/" },
				{ text: "Sign in", href: "https://manager.agilitycms.com/" },
				{ text: "Blog", href: "https://agilitycms.com/blog" },
			],
		},
	],
	legal: [
		{ text: "Privacy Policy", href: "https://agilitycms.com/privacy-policy" },
		{ text: "Terms of Service", href: "https://agilitycms.com/terms-of-service" },
	],
};

const FooterLink = ({ link }: { link: { text: string; href: string } }) => {
	const cls = "text-sm text-(--muted) hover:text-(--primary)";
	// CMS link hrefs use the "~/" site-root convention for internal paths.
	const href = link.href.startsWith("~") ? link.href.slice(1) : link.href;
	const isExternal = /^https?:/.test(href);
	// Route-handler files (llms.txt) can't client-navigate — plain <a>, and
	// unlike next/link a plain anchor needs the basePath prepended.
	const isFile = !isExternal && /\.[a-z0-9]+$/i.test(href);

	if (isExternal) {
		return (
			<a href={href} target="_blank" rel="noreferrer" className={cls}>
				{link.text}
			</a>
		);
	}
	if (isFile) {
		return (
			<a href={`${nextConfig.basePath || ""}${href}`} className={cls}>
				{link.text}
			</a>
		);
	}
	return (
		<Link href={href} className={cls}>
			{link.text}
		</Link>
	);
};

// 'use cache' scopes the copyright year (a non-deterministic Date read,
// which Cache Components requires us to isolate).
const getYear = async () => {
	"use cache";
	cacheLife("hours");
	return new Date().getFullYear();
};

interface FooterProps {
	languageCode?: string;
	isPreview?: boolean;
}

const Footer = async ({ languageCode, isPreview }: FooterProps) => {
	const [data, year] = await Promise.all([
		getFooterData({
			locale: languageCode || defaultLocale,
			preview: !!isPreview,
		}),
		getYear(),
	]);
	const { tagline, columns, legal } = data || FALLBACK;

	return (
		<footer className="border-t border-(--border) bg-(--surface) font-muli">
			<div className="mx-auto max-w-[1400px] px-4 py-12 lg:px-6">
				<div className="grid gap-10 md:grid-cols-4">
					<div>
						<img
							className="h-7 w-auto"
							src="/docs/assets/agility-docs-logo.svg"
							alt="Agility CMS documentation"
						/>
						{tagline && (
							<p className="mt-4 max-w-[28ch] text-sm leading-relaxed text-(--muted)">
								{tagline}
							</p>
						)}
					</div>
					{columns.map((col: any) => (
						<div key={col.heading}>
							<div className="mb-3 font-mono text-[.66rem] uppercase tracking-[.14em] text-(--faint)">
								{col.heading}
							</div>
							<ul className="space-y-2">
								{col.links.map((link: any) => (
									<li key={link.href}>
										<FooterLink link={link} />
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
				<div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-(--border) pt-6 text-sm text-(--faint) sm:flex-row">
					<div>© {year} Agility Inc. All rights reserved.</div>
					<div className="flex items-center gap-6">
						{legal.map((link: any) => (
							<a
								key={link.href}
								href={link.href}
								target="_blank"
								rel="noreferrer"
								className="hover:text-(--primary)"
							>
								{link.text}
							</a>
						))}
					</div>
				</div>
			</div>
		</footer>
	);
};

export default Footer;
