import agility from '@agility/content-fetch';

interface Props {
  locale: string;
}

/**
 * Get marketing content from main Agility site
 * Note: Accepts locale parameter for future multi-locale support
 */
export async function getMarketingContent({ locale }: Props) {
  const api = await agility.getApi({
    guid: process.env.MAIN_AGILITY_SITE_GUID,
    apiKey: process.env.MAIN_AGILITY_SITE_API_KEY,
  });

  const mainSiteHeader = await api.getContentItem({
    contentID: 22,
    languageCode: locale,
  });

  return mainSiteHeader?.fields?.marketingBanner || null;
}
