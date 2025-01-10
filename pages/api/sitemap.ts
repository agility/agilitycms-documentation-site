import { NextApiRequest, NextApiResponse } from 'next';
import { getSitemapFlat } from 'lib/cms/getSitemapFlat';
import fs from 'fs';
import path from 'path';
import { getDynamicPageSitemapMapping } from 'utils/sitemapUtils';



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get the flat sitemap from Agility CMS
  const sitemap = await getSitemapFlat({
    channelName: process.env.AGILITY_SITEMAP || 'website',
    languageCode: process.env.AGILITY_LOCALES || 'en-ca',
  });
  
  // Generate the sitemap XML
  const sitemapXml = generateSitemapXml(sitemap);

  // Write the sitemap to a file
  const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
  fs.writeFileSync(sitemapPath, sitemapXml);

  res.status(200).json({ message: 'Sitemap generated successfully' });
}

function generateSitemapXml(sitemap: any): string {
  const urls = Object.keys(sitemap).map((path, index) => {
    // check to see if it should be visible in the sitemap
    if(sitemap[path].visible){
    return `
      <url>
        <loc>${index === 0 ? 'https://agilitycms.com/docs/' : `https://agilitycms.com/docs${path}`}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
      </url>
    `;
    }
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urls.join('')}
    </urlset>`;
}