import React from "react";
import { Metadata } from "next";
import Link from "next/link";

import Footer from "components/common/Footer";
import SupportForm from "components/support/SupportForm";
import { defaultLocale, locales } from "lib/i18n/config";

/**
 * /docs/support — open a support request (website plans/36 §B1).
 *
 * Replaces the footer's "Get Support" link, which pointed at the Zendesk help
 * centre (help.agilitycms.com/hc/en-us/requests/new) and 404'd on every docs
 * page. The marketing site now redirects that old URL here.
 *
 * Hand-written, not CMS-backed, so it is listed in APP_PATHS in proxy.ts.
 * Without that entry it 404s in production while working in `next dev`.
 *
 * The page itself is static and the same for every reader; who is signed in is
 * fetched by SupportForm after mount, so nothing per-visitor reaches a cache.
 */

export const metadata: Metadata = {
	title: "Contact Support | Agility Docs",
	description:
		"Open a support request with the Agility CMS team. Sign in with your Agility account and we'll know which instances you work on.",
	alternates: { canonical: "https://agilitycms.com/docs/support" },
	robots: { index: false, follow: true },
};

export function generateStaticParams() {
	return locales.map((locale) => ({ locale }));
}

export default function SupportPage() {
	return (
		<>
			<div className="grow bg-(--bg) text-(--text)">
				<div className="mx-auto max-w-3xl px-4 pb-20 pt-10 lg:px-6">
					<h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Contact Support</h1>
					<p className="mt-3 text-base" style={{ color: "var(--text-2)" }}>
						Stuck on something the docs don&rsquo;t cover? Send us a request and a person on the
						Agility team will get back to you. You can also check{" "}
						<a href="https://status.agilitycms.com/" style={{ color: "var(--primary-text)" }}>
							system status
						</a>{" "}
						or <Link href="/" style={{ color: "var(--primary-text)" }}>search the docs</Link>.
					</p>
					<div className="mt-8">
						<SupportForm />
					</div>
				</div>
			</div>
			<Footer languageCode={defaultLocale} isPreview={false} />
		</>
	);
}
