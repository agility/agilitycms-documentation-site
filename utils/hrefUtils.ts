/**
 * Pure href helpers — client-safe (no server-only imports). External links
 * open in a new tab with noopener; internal links stay in-tab.
 */
const getHrefTarget = (href: string | null | undefined): string => {
    if (!href) return "_self";
    if (href && href.indexOf('://') > 0 || href.indexOf("//") === 0) {
        return '_blank';
    }
    return '_self';
}

const getHrefRel = (href: string | null | undefined): string | null => {
    if (getHrefTarget(href) === '_blank') {
        return 'noopener';
    }
    return null;
}

export { getHrefTarget, getHrefRel };
