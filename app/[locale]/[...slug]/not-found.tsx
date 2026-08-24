import Link from "next/link";

export default function NotFound() {
	return (
		<div className="grow flex items-center justify-center bg-(--bg) text-(--text) px-6 py-24">
			<div className="text-center max-w-xl">
				<p
					className="uppercase m-0 mb-4"
					style={{
						fontFamily: "var(--mono)",
						fontSize: ".76rem",
						letterSpacing: ".24em",
						color: "var(--muted)",
					}}
				>
					404 · Not Found
				</p>
				<h1
					className="m-0 mb-4"
					style={{
						fontFamily: "var(--serif)",
						fontSize: "clamp(1.8rem,4vw,2.6rem)",
						letterSpacing: "-.03em",
						lineHeight: 1.1,
					}}
				>
					We couldn&apos;t find that page.
				</h1>
				<p className="m-0 mb-8" style={{ color: "var(--text-2)" }}>
					It may have moved — try the docs home or search from the header.
				</p>
				<Link
					href="/"
					className="inline-block border-2 pt-2 pb-1.5 px-4 font-bold"
					style={{
						color: "var(--primary-text)",
						borderColor: "var(--primary)",
						borderRadius: "var(--r-sm)",
					}}
				>
					Back to Docs home
				</Link>
			</div>
		</div>
	);
}
