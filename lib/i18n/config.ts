/**
 * Locale configuration (pattern from demosite2025).
 *
 * Locales come from the AGILITY_LOCALES env var (comma-separated). The FIRST
 * locale is the default and is served WITHOUT a URL prefix — proxy.ts rewrites
 * unprefixed paths to /{defaultLocale}/... internally, so URLs stay clean.
 * Non-default locales are prefixed (e.g. /fr-ca/...).
 *
 * The docs site is en-us-only today; this structure makes multi-language docs
 * a config change instead of a routing rewrite.
 */
const envLocales = (process.env.AGILITY_LOCALES || "en-us")
	.split(",")
	.map((l) => l.trim())
	.filter(Boolean);

export const locales: readonly string[] = envLocales;
export const defaultLocale = envLocales[0] || "en-us";

export function isValidLocale(locale: string): boolean {
	return locales.includes(locale);
}

/** Returns the locale prefix of a pathname, or null if unprefixed. */
export function getLocaleFromPathname(pathname: string): string | null {
	const seg = pathname.split("/")[1];
	return seg && isValidLocale(seg) ? seg : null;
}

/**
 * Prefix a site-relative path with the locale segment — except for the
 * default locale, which serves clean, unprefixed URLs (proxy.ts rewrite).
 * Use for any internal link built from sitemap paths.
 */
export function localizeUrl(path: string, locale: string): string {
	if (!path.startsWith("/")) return path;
	if (locale === defaultLocale) return path;
	return `/${locale}${path === "/" ? "" : path}`;
}
