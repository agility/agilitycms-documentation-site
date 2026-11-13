import { getMainSiteCookieConsent } from "lib/cms/getMainSiteContent";
import { getAgilityContext } from "lib/cms/getAgilityContext";
import CookieConsentBanner from "components/common/CookieConsentBanner";

/**
 * Server half of the cookie banner: its words from the marketing instance's
 * CookieConsent item (the one the marketing site's banner reads), handed to the
 * client banner, which decides in the browser whether to show at all.
 *
 * Pass `preview` where the request context isn't wanted (the static not-found
 * page); otherwise it comes from getAgilityContext, so render this inside a
 * <Suspense> boundary.
 */
export default async function CookieConsent({ requestedLocale, preview }: { requestedLocale?: string; preview?: boolean }) {
	const isPreview = preview ?? (await getAgilityContext(requestedLocale)).isPreview;
	const copy = await getMainSiteCookieConsent({ preview: isPreview });
	return <CookieConsentBanner copy={copy} />;
}
