/**
 * Which consent regime a visitor's location calls for — the partner copy of the
 * marketing site's rules (agility-website-nextjs-2026:
 * netlify/edge-functions/consent-region.ts, plans/32 D1, Joel 2026-10-21).
 *
 * ⚠️ KEEP IN STEP with that file. The two sites share one consent cookie on
 * agilitycms.com, and on the apex this site asks the marketing site's endpoint
 * anyway (see consentRegionPath), so these rules only decide on the other hosts.
 *
 * - "opt-in": nothing that tracks loads until the visitor accepts. The EEA, the UK
 *   (with the Crown dependencies and Gibraltar), Switzerland, and Quebec. Unknown
 *   location is opt-in too: the strict model is the safe default.
 * - "opt-out": everything runs from the first page, the same banner shows, and
 *   Decline turns it off. The rest of Canada, the US, and everywhere else.
 */

export type Regime = "opt-in" | "opt-out";

const OPT_IN_COUNTRIES = new Set([
	// EU
	"AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT",
	"LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
	// EEA outside the EU
	"IS", "LI", "NO",
	// UK, its Crown dependencies, Gibraltar
	"GB", "GG", "JE", "IM", "GI",
	// Switzerland
	"CH",
]);

/**
 * `country` is ISO 3166-1 alpha-2; `subdivision` may be bare ("QC") or prefixed
 * ("CA-QC"). A Canadian visitor whose province is unknown is treated as opt-in:
 * we can't rule out Quebec.
 */
export function regimeFor(country?: string | null, subdivision?: string | null): Regime {
	const c = country?.trim().toUpperCase();
	if (!c || c === "XX" || c === "T1") return "opt-in"; // unknown, or Tor
	if (OPT_IN_COUNTRIES.has(c)) return "opt-in";
	if (c === "CA") {
		const s = subdivision?.trim().toUpperCase().replace(/^CA-/, "");
		return !s || s === "QC" ? "opt-in" : "opt-out";
	}
	return "opt-out";
}

/** Hosts where the marketing site answers /api/consent-region (it serves the apex, and proxies /docs to us). */
const APEX_HOSTS = new Set(["agilitycms.com", "www.agilitycms.com"]);

/**
 * Where the browser asks for its regime.
 *
 * On agilitycms.com: the MARKETING site's /api/consent-region (a Netlify edge
 * function). It is the only thing that sees the visitor's real location there:
 * this app sits behind the marketing site's proxy, so Vercel's geo headers
 * describe Netlify, not the visitor, and an EU reader could come out opt-out.
 *
 * Anywhere else (docs.agilitycms.com, Vercel URLs): this app's own route, which
 * reads Vercel's geo headers for a visitor who really is connecting to Vercel.
 */
export function consentRegionPath(hostname: string): string {
	return APEX_HOSTS.has(hostname) ? "/api/consent-region" : "/docs/api/consent-region";
}
