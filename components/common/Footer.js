/* eslint-disable @next/next/no-img-element */
import React from "react";
import { cacheLife } from "next/cache";
import Link from "next/link";

/*
  Lean docs footer (Stripe/Vercel docs pattern): same brand tokens as the
  marketing site, but quiet, utilitarian, and docs-scoped — NOT the marketing
  mega-footer. Fully code-defined: no cross-instance CMS fetch, so it no
  longer depends on the old marketing instance's content items.
*/

const COLUMNS = [
	{
		heading: "Docs",
		links: [
			{ text: "Overview", href: "/overview" },
			{ text: "Editors", href: "/editors" },
			{ text: "Developers", href: "/developers" },
			{ text: "Owners & Admins", href: "/owners-admins" },
			{ text: "Training Guide", href: "/training-guide" },
			{ text: "Changelog", href: "/changelog" },
		],
	},
	{
		heading: "Resources",
		links: [
			{ text: "Get Support", href: "https://help.agilitycms.com/hc/en-us/requests/new" },
			{ text: "MCP Server", href: "https://mcp.agilitycms.com" },
			{ text: "System Status", href: "https://status.agilitycms.com/" },
			{ text: "llms.txt", href: "/docs/llms.txt", plain: true },
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
];

const LEGAL = [
	{ text: "Privacy Policy", href: "https://agilitycms.com/privacy-policy" },
	{ text: "Terms of Service", href: "https://agilitycms.com/terms-of-service" },
];

const FooterLink = ({ link }) => {
	const external = link.href.startsWith("http") || link.plain;
	const cls = "text-sm text-(--muted) hover:text-(--primary)";
	if (external) {
		return (
			<a href={link.href} target={link.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className={cls}>
				{link.text}
			</a>
		);
	}
	return (
		<Link href={link.href} className={cls}>
			{link.text}
		</Link>
	);
};

// 'use cache' captures the copyright year (a non-deterministic Date read,
// which Cache Components requires us to scope).
const Footer = async () => {
	"use cache";
	cacheLife("hours");
	const year = new Date().getFullYear();

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
						<p className="mt-4 max-w-[28ch] text-sm leading-relaxed text-(--muted)">
							Documentation for the CMS built for editors, developers, and AI
							agents.
						</p>
					</div>
					{COLUMNS.map((col) => (
						<div key={col.heading}>
							<div className="mb-3 font-mono text-[.66rem] uppercase tracking-[.14em] text-(--faint)">
								{col.heading}
							</div>
							<ul className="space-y-2">
								{col.links.map((link) => (
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
						{LEGAL.map((link) => (
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
