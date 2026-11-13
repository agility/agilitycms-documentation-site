"use client";

import { openConsentSettings } from "lib/analytics/consent-store";

/** The footer's "Cookie settings": reopens the banner's choices (CookieConsentBanner). */
export default function CookieSettingsLink({ label, className }: { label: string; className?: string }) {
	return (
		<button type="button" onClick={openConsentSettings} className={className}>
			{label}
		</button>
	);
}
