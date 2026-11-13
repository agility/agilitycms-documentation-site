/**
 * The browser's consent state, in one place — partner copy of the marketing
 * site's src/lib/analytics/consent-store.ts (form consent stamps left out: this
 * site has no forms). The stored choice (cookie), the region's regime (fetched
 * once per session), and Global Privacy Control. Plain functions for code outside
 * React (the PostHog wrapper) and a subscribe/snapshot pair for `useConsent`.
 *
 * Until the regime is known, nothing that tracks may start: `permissions` is null.
 * The fetch is one small no-store request, made only when there is no stored
 * choice to settle it.
 */
import { CONSENT_EVENT, permissionsFor, readConsent, type Permissions, type StoredConsent } from "lib/analytics/consent";
import { consentRegionPath, type Regime } from "lib/analytics/consent-region";

/** Same key as the marketing site: one sessionStorage origin on agilitycms.com, so one fetch per session for both. */
const REGIME_KEY = "aglty-consent-regime";
const REGIME_EVENT = "agility:consent-regime";
/** Ask the banner to open its Choose panel (the footer's "Cookie settings" link). */
export const OPEN_SETTINGS_EVENT = "agility:consent-open";

export interface ConsentSnapshot {
	/** The stored choice, or null if the visitor hasn't made one. */
	stored: StoredConsent | null;
	/** The region's regime, or null until known. */
	regime: Regime | null;
	/** What may run now, or null while undecided (nothing that tracks starts then). */
	permissions: Permissions | null;
}

let regime: Regime | null = null;
let regimePromise: Promise<Regime> | null = null;

const session = {
	get(key: string): string | null {
		try {
			return sessionStorage.getItem(key);
		} catch {
			return null;
		}
	},
	set(key: string, value: string): void {
		try {
			sessionStorage.setItem(key, value);
		} catch {
			/* private mode: the value just isn't remembered across pages */
		}
	},
};

const gpc = (): boolean =>
	typeof navigator !== "undefined" && !!(navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;

function cachedRegime(): Regime | null {
	if (regime) return regime;
	const r = session.get(REGIME_KEY);
	if (r === "opt-in" || r === "opt-out") regime = r;
	return regime;
}

/** Fetches the regime once per session. A failure counts as opt-in, the strict model. */
export function ensureRegime(): Promise<Regime> {
	const known = cachedRegime();
	if (known) return Promise.resolve(known);
	regimePromise ??= fetch(consentRegionPath(window.location.hostname), { cache: "no-store" })
		.then((res) => (res.ok ? res.json() : null))
		.then((body: { regime?: string } | null) => (body?.regime === "opt-out" ? "opt-out" : "opt-in") as Regime)
		.catch(() => "opt-in" as Regime)
		.then((r) => {
			regime = r;
			session.set(REGIME_KEY, r);
			window.dispatchEvent(new Event(REGIME_EVENT));
			return r;
		});
	return regimePromise;
}

let lastKey = "";
let lastSnapshot: ConsentSnapshot = { stored: null, regime: null, permissions: null };

/** A stable object per state, as useSyncExternalStore requires. */
export function getConsentSnapshot(): ConsentSnapshot {
	const stored = readConsent(document.cookie);
	const r = cachedRegime();
	const g = gpc();
	const key = `${stored ? `${+stored.analytics}${+stored.marketing}` : "-"}|${r}|${+g}`;
	if (key !== lastKey) {
		lastKey = key;
		// A stored choice settles permissions without waiting for the region.
		const permissions = stored ? permissionsFor(stored, r ?? "opt-in", g) : r ? permissionsFor(null, r, g) : null;
		lastSnapshot = { stored, regime: r, permissions };
	}
	return lastSnapshot;
}

export const SERVER_SNAPSHOT: ConsentSnapshot = { stored: null, regime: null, permissions: null };

/** Subscribes to every change, and starts the regime fetch if it's needed. */
export function subscribeConsent(onChange: () => void): () => void {
	const events = [CONSENT_EVENT, REGIME_EVENT];
	for (const e of events) window.addEventListener(e, onChange);
	if (!readConsent(document.cookie)) void ensureRegime();
	return () => {
		for (const e of events) window.removeEventListener(e, onChange);
	};
}

/** Open the banner's Choose panel (the footer's "Cookie settings" link). */
export const openConsentSettings = (): void => {
	window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
};
