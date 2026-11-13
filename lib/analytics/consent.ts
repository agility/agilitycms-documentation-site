/**
 * Cookie consent: what the visitor chose, and what that permits — the partner
 * copy of the marketing site's src/lib/analytics/consent.ts (plans/32 there).
 *
 * ⚠️ KEEP IN STEP with that file. Both sites read and write the SAME cookie on
 * agilitycms.com (Path=/), so a choice made on either side holds on both, and the
 * format must stay identical. Left out here: the HubSpot consent API (this site
 * loads no HubSpot code).
 *
 * Two categories beyond the necessary ones, matching the banner's Choose panel:
 *   - analytics: GA4, PostHog (incl. replay), Clarity, Mouseflow;
 *   - marketing: Google Ads, Microsoft UET, LinkedIn, Meta and the other pixels
 *     in GTM-NJW8WMX.
 *
 * What runs BEFORE a choice depends on the visitor's region (consent-region.ts):
 * opt-out regions run both (marketing off if the browser sends Global Privacy
 * Control), opt-in regions run neither. An explicit choice always wins, and a
 * choice made to HubSpot's old banner on the same domain carries over.
 */
import type { Regime } from "lib/analytics/consent-region";

export interface ConsentChoices {
	analytics: boolean;
	marketing: boolean;
}

/** A choice the visitor made. `at` is when, in ms; 0 if not recorded (older formats). */
export interface StoredConsent extends ConsentChoices {
	at: number;
}

export type Permissions = ConsentChoices;

/** Our own record of the choice. First-party, readable by the client only. Shared with the marketing site. */
export const CONSENT_COOKIE = "agility_cookie_consent";

/** Fired on `window` when the visitor makes a choice. `detail` is the ConsentChoices. */
export const CONSENT_EVENT = "agility:consent";

const DAY_MS = 24 * 60 * 60 * 1000;
/** A choice that grants anything is remembered a year. */
const KEEP_GRANTED_S = 365 * 24 * 60 * 60;
/** A full Decline is asked again after six months (the ICO's suggested gap). */
export const DECLINE_REASK_MS = 182 * DAY_MS;

/** HubSpot's old banner's answer, `1:true_2:true_3:true` (1 analytics, 2 advertisement). */
const HUBSPOT_PREF_COOKIE = "__hs_cookie_cat_pref";

const cookieValue = (cookies: string, name: string): string | undefined => {
	for (const part of cookies.split(";")) {
		const eq = part.indexOf("=");
		if (eq > 0 && part.slice(0, eq).trim() === name) {
			try {
				return decodeURIComponent(part.slice(eq + 1).trim());
			} catch {
				return part.slice(eq + 1).trim();
			}
		}
	}
	return undefined;
};

/** `v2.a1.m0.<seconds>`: compact, and versioned so the format can change. */
export const encodeConsent = (c: StoredConsent): string =>
	`v2.a${c.analytics ? 1 : 0}.m${c.marketing ? 1 : 0}.${Math.floor(c.at / 1000)}`;

/** The visitor's choice from a `document.cookie` string, or null if there is none (or it has lapsed). */
export function readConsent(cookies: string, now = Date.now()): StoredConsent | null {
	const stored = parse(cookies);
	if (!stored) return null;
	const declinedAll = !stored.analytics && !stored.marketing;
	if (declinedAll && stored.at > 0 && now - stored.at > DECLINE_REASK_MS) return null;
	return stored;
}

function parse(cookies: string): StoredConsent | null {
	const ours = cookieValue(cookies, CONSENT_COOKIE);
	if (ours) {
		const m = /^v2\.a([01])\.m([01])\.(\d+)$/.exec(ours);
		if (m) return { analytics: m[1] === "1", marketing: m[2] === "1", at: Number(m[3]) * 1000 };
		// The marketing site's first format, one choice for everything
		if (ours === "accepted") return { analytics: true, marketing: true, at: 0 };
		if (ours === "declined") return { analytics: false, marketing: false, at: 0 };
	}
	const hubspot = cookieValue(cookies, HUBSPOT_PREF_COOKIE);
	if (hubspot) {
		const cat = (n: number) => hubspot.match(new RegExp(`(?:^|_)${n}:(true|false)`))?.[1];
		const analytics = cat(1);
		if (analytics) {
			const ads = cat(2) ?? analytics;
			return { analytics: analytics === "true", marketing: ads === "true", at: 0 };
		}
	}
	return null;
}

/**
 * What may run now. A stored choice wins. Without one, the region decides: opt-out
 * regions run everything except marketing for a Global Privacy Control browser,
 * opt-in regions run nothing.
 */
export function permissionsFor(stored: StoredConsent | null, regime: Regime, gpc: boolean): Permissions {
	if (stored) return { analytics: stored.analytics, marketing: stored.marketing };
	if (regime === "opt-out") return { analytics: true, marketing: !gpc };
	return { analytics: false, marketing: false };
}

/** Path=/ on purpose: the marketing site reads the same cookie. */
export function writeConsent(choices: ConsentChoices): void {
	const stored: StoredConsent = { ...choices, at: Date.now() };
	const maxAge = choices.analytics || choices.marketing ? KEEP_GRANTED_S : Math.floor(DECLINE_REASK_MS / 1000);
	const secure = window.location.protocol === "https:" ? "; Secure" : "";
	document.cookie = `${CONSENT_COOKIE}=${encodeConsent(stored)}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
	window.dispatchEvent(new CustomEvent<ConsentChoices>(CONSENT_EVENT, { detail: choices }));
}
