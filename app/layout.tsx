import "styles/lightfair.css";
import "styles/globals.css";

import React from "react";
import { Metadata } from "next";
import { Mulish, Fira_Mono } from "next/font/google";
import classNames from "classnames";

// Fonts match the marketing site (Ocean design system, 2026-07-23): a single
// Mulish variable font powers BOTH body and headings — no per-weight loading,
// the variable axis covers 400–800 (headings render at 700). Fira Mono stays
// for labels/code.
const mulish = Mulish({
	subsets: ["latin"],
	style: ["normal", "italic"],
	display: "swap",
	variable: "--font-mulish",
});

const firaMono = Fira_Mono({
	subsets: ["latin"],
	weight: ["400", "500", "700"],
	display: "swap",
	variable: "--font-fira-mono",
});

export const metadata: Metadata = {
	title: "Agility Docs",
	description:
		"Use this Agility CMS Docs site to find guides, tutorials, and general help when using our headless CMS.",
};

/**
 * Root layout: html shell, theme bootstrap, and fonts. The font CSS variables
 * live on the <main> wrapper because styles/tokens.css resolves its --font /
 * --serif / --mono aliases at the `main` selector (custom properties resolve
 * var() references at the declaring node — see tokens.css comment).
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html className="h-full dark" lang="en-US" suppressHydrationWarning>
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
						"min-h-full",
						mulish.variable,
						firaMono.variable
					)}
				>
					{children}
				</main>
			</body>
		</html>
	);
}
