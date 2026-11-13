import { NextResponse } from "next/server";
import { regimeFor } from "lib/analytics/consent-region";

/**
 * GET /docs/api/consent-region → `{ "regime": "opt-in" | "opt-out" }`, from
 * Vercel's geo headers. Used only OFF the apex (docs.agilitycms.com, Vercel
 * URLs): on agilitycms.com the browser asks the marketing site instead, because
 * behind its proxy these headers describe Netlify, not the visitor. See
 * lib/analytics/consent-region.ts. Never cached: it depends on who asks.
 */
export function GET(request: Request) {
	const country = request.headers.get("x-vercel-ip-country");
	const region = request.headers.get("x-vercel-ip-country-region");
	return NextResponse.json(
		{ regime: regimeFor(country, region) },
		{ headers: { "Cache-Control": "private, no-store" } }
	);
}
