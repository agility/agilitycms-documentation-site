import agility from '@agility/content-fetch'

export async function getServerSideProps({ res }) {

	//create the Agility CMS content fetch client
	const api = agility.getApi({
		guid: process.env.AGILITY_GUID,
		apiKey: process.env.AGILITY_API_FETCH_KEY,
		isPreview: false
	});

	//get the flat sitemap from Agility CMS and output it
	const sitemap = await api.getSitemapFlat({
		channelName: process.env.AGILITY_SITEMAP || "website",
		languageCode: process.env.AGILITY_LOCALES || "en-us"
	})


	const xml = `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">


     ${Object.keys(sitemap).filter(path => {
		const sitemapNode = sitemap[path]

		if (sitemapNode.redirect || sitemapNode.isFolder) {
			//TODO: once we sort out the "visible on sitemap" setting
			//  || (sitemapNode.visible?.sitemap || false) === false) {
			console.log("skipping", sitemapNode)
			return false
		}
		return true

	}).map((path, index) => {

		return `<url>
<loc>${index === 0 ? "https://agilitycms.com/docs" : `https://agilitycms.com/docs${path}`}</loc>
<lastmod>${(new Date()).toISOString()}</lastmod>
<changefreq>daily</changefreq>
<priority>1</priority>
</url>`

	}).join('')}
   </urlset>
 `;
	const lst =


		res.setHeader('Content-Type', 'text/xml');
	// we send the XML to the browser
	res.write(xml);
	res.end();

	return {
		props: {},
	};
}

function SiteMap() {
	// getServerSideProps will do the heavy lifting
}

export default SiteMap;

