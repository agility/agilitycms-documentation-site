import agility from '@agility/content-fetch';

/**
 * Get footer content from main Agility site
 * Note: Accepts locale parameter for future multi-locale support
 */
export async function getFooterContent() {

  // Get footer from main Agility site (DIFFERENT FROM THE ONE IN THE ROOT LAYOUT)
  const api = await agility.getApi({
    guid: process.env.MAIN_AGILITY_SITE_GUID,
    apiKey: process.env.MAIN_AGILITY_SITE_API_KEY,
  });

  const mainSiteFooter = await api.getContentItem({
    contentID: 16,
    languageCode: "en-ca",
    expandAllContentLinks: true
  });
  if (!mainSiteFooter?.fields) {
    return null;
  }

  let footerNavigation: any[] = [];

  // Helper function to process column links
  const processColumn = (title: string, links: any[]) => {
    if (!title && (!links || links.length === 0)) return null;

    const column = {
      name: title || '',
      children: [] as any[]
    };

    if (links && Array.isArray(links)) {
      links.forEach((link) => {
        if (link?.fields) {
          const linkData: any = {
            name: link.fields.title,
            title: link.fields.title,
            href: link.fields.uRL?.href || null,
            target: link.fields.uRL?.target || null,
          };
          if (link.fields.header !== undefined) {
            linkData.header = link.fields.header;
          }
          column.children.push(linkData);
        }
      });
    }

    return column;
  };

  // Process columns 1-5
  const columns = [
    { title: mainSiteFooter.fields.column1Title, links: mainSiteFooter.fields.column1Links },
    { title: mainSiteFooter.fields.column2Title, links: mainSiteFooter.fields.column2Links },
    { title: mainSiteFooter.fields.column3Title, links: mainSiteFooter.fields.column3Links },
    { title: mainSiteFooter.fields.column4Title, links: mainSiteFooter.fields.column4Links },
    {
      title: mainSiteFooter.fields.column5Title || mainSiteFooter.fields.Column5Title,
      links: mainSiteFooter.fields.column5Links || mainSiteFooter.fields.Column5Links
    },
  ];

  columns.forEach(({ title, links }) => {
    const column = processColumn(title, links);
    if (column) {
      footerNavigation.push(column);
    }
  });

  const footerBottomNavigation = mainSiteFooter.fields.bottomLinks
    ? mainSiteFooter.fields.bottomLinks.map((link: any) => ({
      name: link.fields.title,
      href: link.fields.uRL?.href || null,
      target: link.fields.uRL?.target || null
    }))
    : [];

  const footerCopyright = mainSiteFooter.fields.copyright || "© Copyright, Agility Inc.";

  return {
    footerNavigation,
    footerBottomNavigation,
    footerCopyright,
  };
}
