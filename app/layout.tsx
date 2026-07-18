import "styles/lightfair.css";
import "styles/globals.css";

import React from "react";
import { Metadata } from "next";
import { Mulish, Inder, Fira_Mono } from "next/font/google";
import classNames from "classnames";

const mulish = Mulish({
	subsets: ["latin"],
	display: "auto",
	variable: "--font-mulish",
});

// Ocean heading face — Inder ships a 400 weight only (handoff gotcha:
// bolder headings are browser-synthesized; that matches the mockup).
const inder = Inder({
	subsets: ["latin"],
	weight: "400",
	display: "swap",
	variable: "--font-inder",
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
		<html className="h-full" lang="en-US" data-theme="light" suppressHydrationWarning>
			<head>
				{/* Apply the persisted theme before first paint so there is no flash
				    of the wrong theme on reload. */}
				<script
					dangerouslySetInnerHTML={{
						__html: `(function(){try{var m=localStorage.getItem('theme')||'system';var d=m==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):m;document.documentElement.setAttribute('data-theme',d);document.documentElement.style.colorScheme=d;}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`,
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
						inder.variable,
						firaMono.variable
					)}
				>
					{children}
				</main>
			</body>
		</html>
	);
}
