import { NextApiRequest, NextApiResponse } from "next"

export default function handler(req: NextApiRequest,
	res: NextApiResponse) {
	console.log("req")
	console.log(req.headers)
	const host = req.headers.host || ""
	if (host.includes("agilitycms.com")) {
		//only allow crawling on agility domains
		res.setHeader("Content-Type", "text/plain")
			.setHeader("Cache-Control", "public, max-age=86400")
			.send("User-agent: *\nAllow: /")
	} else {

		//disallow any crawling on non-agility domains
		res
			.setHeader("X-Host", host)
			.setHeader("Content-Type", "text/plain")
			.setHeader("Cache-Control", "public, max-age=86400")
			.send("User-agent: *\nDisallow: /")
	}
}