import { GetServerSideProps } from 'next';
import { getSitemapFlat } from 'lib/cms/getSitemapFlat';

const Sitemap = () => null;

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  try {
    // Get the flat sitemap from Agility CMS
    const sitemap = await getSitemapFlat({
      channelName: process.env.AGILITY_SITEMAP || 'website',
      languageCode: process.env.AGILITY_LOCALES || 'en-ca',
    });

    // Generate the sitemap XML
    const sitemapXml = generateSitemapXml(sitemap);

    // Set the response content type to XML
    res.setHeader('Content-Type', 'application/xml');
    res.write(sitemapXml);
    res.end();

    return {
      props: {},
    };
  } catch (error) {
    res.statusCode = 500;
    res.end('Failed to generate sitemap.');
    return {
      props: {},
    };
  }
};

function generateSitemapXml(sitemap: any): string {
  const urls = Object.keys(sitemap).map((path, index) => {
    // check to see if it should be visible in the sitemap
    if (sitemap[path].visible) {
      return `
        <url>
          <loc>${index === 0 ? 'https://agilitycms.com/docs/' : `https://agilitycms.com/docs${path}`}</loc>
          <lastmod>${new Date().toISOString()}</lastmod>
          <changefreq>daily</changefreq>
          <priority>1.0</priority>
        </url>
      `;
    }
    return '';
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urls}
    </urlset>`;
}

export default Sitemap;