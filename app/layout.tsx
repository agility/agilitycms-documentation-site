import "styles/lightfair.css";
import "styles/globals.css";

import React from "react";
import { Metadata } from "next";
import { Mulish, Fira_Code } from "next/font/google";
import classNames from "classnames";

// Fonts match the marketing site (Ocean design system, 2026-07-23): a single
// Mulish variable font powers BOTH body and headings — no per-weight loading,
// the variable axis covers 400–800 (headings render at 700). Fira Code powers
// code blocks and mono labels (its coding ligatures make snippets read better).
const mulish = Mulish({
	subsets: ["latin"],
	style: ["normal", "italic"],
	display: "swap",
	variable: "--font-mulish",
});

const firaCode = Fira_Code({
	subsets: ["latin"],
	weight: ["400", "500", "600"],
	display: "swap",
	variable: "--font-fira-code",
});

export const metadata: Metadata = {
	title: "Agility Docs",
	description:
		"Use this Agility CMS Docs site to find guides, tutorials, and general help when using our headless CMS.",
};

/**
 * Root layout: html shell, theme bootstrap, and fonts. The next/font variables
 * live on <html> so they reach the WHOLE document — including page content,
 * which streams in after </main> under cacheComponents and so sits outside
 * <main> in the DOM. styles/tokens.css resolves --font / --serif / --mono from
 * them at :root (a var() reference resolves at its declaring node).
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		// The next/font variables live HERE, not on <main>: a var() reference
		// resolves at its declaring node, and with cacheComponents the page body
		// streams in after </main>, so anything declared on <main> never reaches
		// it. See the Type section of styles/tokens.css.
		<html
			className={classNames("h-full dark", mulish.variable, firaCode.variable)}
			lang="en-US"
			suppressHydrationWarning
		>
			<head>
				{/* Theme bootstrap — matches the marketing site's technique so the
				    preference is shared across the agilitycms.com / .../docs origin:
				    dark is the default (the `dark` class ships on <html>), and the
				    persisted choice lives under the namespaced `aglty-theme` key (never
				    a generic `theme` key — other apps on the origin clobber that one).
				    A `?theme=light|dark|system` query persists a choice (deep-link
				    parity with the marketing site). Runs pre-paint so there is no flash
				    of the wrong theme. The visible ThemeControl writes the same key. */}
				<script
					dangerouslySetInnerHTML={{
						__html: `(function(){try{var q=new URLSearchParams(location.search).get('theme');if(q==='light'||q==='dark'||q==='system'){localStorage.setItem('aglty-theme',q);}var m=localStorage.getItem('aglty-theme')||'dark';var d=m==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):m;var el=document.documentElement;el.classList.toggle('dark',d==='dark');el.style.colorScheme=d;}catch(e){}})();`,
					}}
				/>
			</head>
			<body className="h-full">
				<main
					className={classNames(
						// min-h (not h): the window scrolls, so the chain must be able
						// to GROW past the viewport or sticky chrome stops at ~100vh
						// and content gets clipped (the iPad no-scroll bug).
						"min-h-full"
					)}
				>
					{children}
				</main>
			</body>
		</html>
	);
}
