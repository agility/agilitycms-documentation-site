import { NextApiRequest, NextApiResponse } from "next"

export default function handler(req: NextApiRequest,
	res: NextApiResponse) {
	console.log("req")
	console.log(req.headers)
	const cdnLoop = req.headers["cdn-loop"] || ""
	const host = req.headers.host || ""
	if (cdnLoop === "netlify") {
		//only allow crawling on agility domains
		res.setHeader("Content-Type", "text/plain")
			.setHeader("Vary", "cdn-loop")
			.setHeader("Cache-Control", "public, max-age=86400")
			.send("User-agent: *\nAllow: /")
	} else {

		//disallow any crawling on non-agility domains
		res
			.setHeader("Vary", "cdn-loop")
			.setHeader("X-CDN-Loop", cdnLoop)
			.setHeader("X-Host", host)
			.setHeader("Content-Type", "text/plain")
			.setHeader("Cache-Control", "public, max-age=86400")
			.send("User-agent: *\nDisallow: /")
	}
}