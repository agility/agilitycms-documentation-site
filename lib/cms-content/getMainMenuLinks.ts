import { getSitemapFlat } from '../cms/getSitemapFlat';

interface Props {
  locale: string;
  currentPath?: string;
}

/**
 * Get main menu links from sitemap
 * Note: Accepts locale parameter for future multi-locale support
 */
export async function getMainMenuLinks({ locale, currentPath }: Props) {
  const sitemap = await getSitemapFlat({
    channelName: process.env.AGILITY_SITEMAP || 'website',
    languageCode: locale,
  });

  // Only get the root level links and respect whether they should be visible on menu
  return Object.values(sitemap)
    .filter((node) => {
      return node.visible?.menu && node.path.split("/").length <= 2;
    })
    .map((node) => {
      let path = node.path;
      if (path === "/home") {
        path = "/";
      }
      return {
        name: node.menuText || node.title,
        href: path,
        current:
          currentPath === path ||
          (currentPath && currentPath.split("/").length > 2 &&
            currentPath.indexOf(node.path) > -1),
      };
    });
}
