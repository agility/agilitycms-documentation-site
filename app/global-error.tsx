"use client";

/** Last-resort error boundary (replaces pages/500.jsx). */
export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<html lang="en-US">
			<body>
				<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
					<div style={{ textAlign: "center", maxWidth: "36rem", padding: "2rem" }}>
						<h1 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>Something went wrong</h1>
						<p style={{ marginBottom: "2rem" }}>
							An unexpected error occurred. Try reloading the page.
						</p>
						<button
							onClick={() => reset()}
							style={{ padding: ".5rem 1.25rem", fontWeight: 700, cursor: "pointer" }}
						>
							Reload
						</button>
					</div>
				</div>
			</body>
		</html>
	);
}
