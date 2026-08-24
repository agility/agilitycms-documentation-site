"use client";

import { useEffect, useState } from "react";

const MODES = [
	{ key: "light", label: "Light", glyph: "☀" },
	{ key: "dark", label: "Dark", glyph: "☾" },
	{ key: "system", label: "Match system", glyph: "◐" },
];

const resolve = (mode: string) =>
	mode === "system"
		? window.matchMedia("(prefers-color-scheme: dark)").matches
			? "dark"
			: "light"
		: mode;

const apply = (mode: string) => {
	const resolved = resolve(mode);
	document.documentElement.classList.toggle("dark", resolved === "dark");
	document.documentElement.style.colorScheme = resolved;
};

// Three-state theme control (light / dark / system). Dark is the default (to
// match the marketing site), and the choice persists under the namespaced
// `aglty-theme` key — the SAME key the marketing site reads, so a visitor's
// preference carries across the agilitycms.com / agilitycms.com/docs boundary.
// The no-flash script in app/layout.tsx applies the persisted mode before
// paint; this control only reads/writes it after hydration.
const ThemeControl = () => {
	const [mode, setMode] = useState<string | null>(null);

	useEffect(() => {
		let stored = "dark";
		try {
			stored = localStorage.getItem("aglty-theme") || "dark";
		} catch (e) {}
		setMode(stored);
	}, []);

	useEffect(() => {
		if (!mode || mode !== "system") return;
		const mql = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () => apply("system");
		mql.addEventListener("change", onChange);
		return () => mql.removeEventListener("change", onChange);
	}, [mode]);

	const select = (key: string) => {
		setMode(key);
		try {
			localStorage.setItem("aglty-theme", key);
		} catch (e) {}
		apply(key);
	};

	return (
		<div
			role="group"
			aria-label="Colour theme"
			className="flex gap-0.5 p-[3px] border rounded-xs"
			style={{
				background: "var(--surface)",
				borderColor: "var(--border-strong)",
			}}
		>
			{MODES.map(({ key, label, glyph }) => (
				<button
					key={key}
					type="button"
					title={label}
					aria-label={label}
					aria-pressed={mode === key}
					onClick={() => select(key)}
					className="grid place-items-center w-[30px] h-7 text-sm rounded-xs cursor-pointer transition-colors"
					style={
						mode === key
							? {
									background: "var(--raised)",
									color: "var(--primary-text)",
									boxShadow: "var(--elev-1)",
							  }
							: { background: "transparent", color: "var(--muted)" }
					}
				>
					{glyph}
				</button>
			))}
		</div>
	);
};

export default ThemeControl;
