"use client";

import { useSyncExternalStore } from "react";
import { getConsentSnapshot, SERVER_SNAPSHOT, subscribeConsent, type ConsentSnapshot } from "lib/analytics/consent-store";

/**
 * The visitor's consent state, kept current (see consent-store.ts). On the server
 * and during hydration it is the empty snapshot: no choice, no regime, nothing
 * permitted, so nothing that tracks starts before the browser knows.
 */
export const useConsent = (): ConsentSnapshot =>
	useSyncExternalStore(subscribeConsent, getConsentSnapshot, () => SERVER_SNAPSHOT);
