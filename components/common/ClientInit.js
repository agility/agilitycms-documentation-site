"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Intercom } from "@intercom/messenger-js-sdk";

/**
 * Client-side bootstraps that used to live in the Pages-Router Layout.js:
 * Intercom messenger + scroll-to-top on route change (the site scrolls a
 * nested #ScrollContainer, not the window, so the browser doesn't reset it).
 */
export default function ClientInit() {
	const pathname = usePathname();

	useEffect(() => {
		Intercom({ app_id: "fj9g3mkl" });
	}, []);

	useEffect(() => {
		const scrollContainer = document.getElementById("ScrollContainer");
		if (scrollContainer) scrollContainer.scrollTop = 0;
	}, [pathname]);

	return null;
}
