/**
 * The cookie banner's words — partner copy of the marketing site's
 * src/lib/analytics/consent-copy.ts. Editors change them ONCE, in the marketing
 * instance's CookieConsent item; this site reads that same item
 * (getMainSiteCookieConsent), so both banners say the same thing. These defaults
 * show until it is reachable, and for any field left blank. Keep them identical
 * to the marketing site's.
 */

export interface ConsentCopy {
	/** The banner's one sentence. */
	message: string;
	acceptLabel: string;
	declineLabel: string;
	/** Opens the Choose panel. */
	chooseLabel: string;
	privacyLink: { href: string; text: string; target?: string };
	chooseTitle: string;
	chooseIntro: string;
	necessaryLabel: string;
	necessaryDescription: string;
	analyticsLabel: string;
	analyticsDescription: string;
	marketingLabel: string;
	marketingDescription: string;
	saveLabel: string;
	/** The footer link that reopens the choices. */
	settingsLinkLabel: string;
}

export const DEFAULT_CONSENT_COPY: ConsentCopy = {
	message: "We'd like to learn which pages are worth your time, and which ads are worth ours.",
	acceptLabel: "Accept",
	declineLabel: "Decline",
	chooseLabel: "Choose",
	privacyLink: { href: "https://agilitycms.com/privacy-policy", text: "Privacy policy" },
	chooseTitle: "Your cookie choices",
	chooseIntro:
		"Necessary cookies keep the site working and are always on. The rest are up to you, and you can change your mind any time from the footer.",
	necessaryLabel: "Necessary",
	necessaryDescription: "Remember your choices and keep forms and the booking calendar working.",
	analyticsLabel: "Analytics",
	analyticsDescription:
		"Show us which pages people read and where they get stuck, including recordings of how a page is used, so we know what to fix.",
	marketingLabel: "Marketing",
	marketingDescription:
		"Tell us which ads and campaigns brought you here, let those platforms measure them, and help us recognise the companies that visit.",
	saveLabel: "Save choices",
	settingsLinkLabel: "Cookie settings",
};

/**
 * CMS fields over the defaults, field by field: a blank field keeps its default.
 * `toUrl` makes a site-relative href point at the marketing site: under basePath
 * /docs, a bare "/privacy-policy" would land on a docs 404.
 */
export function mergeConsentCopy(
	cms: Partial<Record<keyof ConsentCopy, unknown>> | null | undefined,
	toUrl: (href: string) => string
): ConsentCopy {
	const out: ConsentCopy = { ...DEFAULT_CONSENT_COPY, privacyLink: { ...DEFAULT_CONSENT_COPY.privacyLink } };
	if (!cms) return out;
	for (const key of Object.keys(DEFAULT_CONSENT_COPY) as (keyof ConsentCopy)[]) {
		if (key === "privacyLink") continue;
		const value = cms[key];
		if (typeof value === "string" && value.trim()) (out[key] as string) = value.trim();
	}
	const link = cms.privacyLink as { href?: unknown; text?: unknown; target?: unknown } | undefined;
	if (link && typeof link.href === "string" && link.href.trim()) {
		out.privacyLink = {
			href: toUrl(link.href.trim()),
			text: typeof link.text === "string" && link.text.trim() ? link.text.trim() : out.privacyLink.text,
			// "_self" is the CMS default; only a real new-tab choice is kept.
			target: link.target === "_blank" ? "_blank" : undefined,
		};
	}
	return out;
}
