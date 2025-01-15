import { NextApiRequest, NextApiResponse } from "next"

export default function handler(req: NextApiRequest,
	res: NextApiResponse) {

	const cdnLoop = req.headers["cdn-loop"] || ""
	const host = req.headers.host || ""
	if (cdnLoop && cdnLoop.indexOf("netlify") !== -1) {
		//only allow crawling on agility domains
		res.setHeader("Content-Type", "text/plain")
			.setHeader("Vary", "cdn-loop")
			.setHeader("Cache-Control", "no-store")
			.send("sitemap: https://agilitycms.com/docs/sitemap.xml\n\n User-agent: *\nAllow: /")
	} else {

		//disallow any crawling on non-agility domains
		res
			.setHeader("Vary", "cdn-loop")
			.setHeader("X-CDN-Loop", cdnLoop)
			.setHeader("X-Host", host)
			.setHeader("Content-Type", "text/plain")
			.setHeader("Cache-Control", "no-store")
			.send("User-agent: *\nDisallow: /")
	}
}