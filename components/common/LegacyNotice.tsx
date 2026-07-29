import React from "react";
import Link from "next/link";
import type { LegacyEntry } from "lib/docs/legacyFrameworks";

/**
 * "Legacy — no longer maintained" banner shown at the top of archived framework
 * articles (content refresh plan §4). Styled to match the ocean CalloutBlock's
 * `caution` variant (--warn) so it reads as part of the design system rather
 * than a bolted-on warning.
 *
 * Driven entirely by lib/docs/legacyFrameworks.ts — no per-article CMS edit.
 */
const LegacyNotice = ({ entry }: { entry: LegacyEntry }) => (
	<div
		role="note"
		className="mb-8 flex gap-3 px-4 py-3.5"
		style={{
			background: "color-mix(in srgb, var(--warn) 10%, var(--surface))",
			border: "1px solid color-mix(in srgb, var(--warn) 40%, transparent)",
			borderRadius: "var(--r-md)",
		}}
	>
		<span
			aria-hidden="true"
			className="grid h-6 w-6 flex-none place-items-center text-sm font-extrabold"
			style={{
				borderRadius: "var(--r-sm)",
				background: "var(--warn)",
				color: "var(--on-color)",
			}}
		>
			!
		</span>
		<p className="m-0" style={{ fontSize: ".92rem", color: "var(--text-2)" }}>
			<b className="font-extrabold" style={{ color: "var(--text)" }}>
				Legacy — {entry.name} docs are no longer actively maintained.{" "}
			</b>
			{entry.reason}
			{entry.successor && (
				<>
					{" "}
					<Link
						href={entry.successor.href}
						className="underline underline-offset-2"
						style={{ color: "var(--primary)" }}
					>
						{entry.successor.text}
					</Link>
					.
				</>
			)}
		</p>
	</div>
);

export default LegacyNotice;
