import Link from "next/link";

/** Root-level 404 (outside the [locale] segment). */
export default function NotFound() {
	return (
		<div className="h-full flex items-center justify-center px-6 py-24">
			<div className="text-center max-w-xl">
				<h1 className="text-3xl font-bold mb-4">404 — Page not found</h1>
				<p className="mb-8">
					We couldn&apos;t find that page. Try the docs home instead.
				</p>
				<Link href="/" className="font-bold underline">
					Back to Docs home
				</Link>
			</div>
		</div>
	);
}
