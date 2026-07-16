import { NextRequest, NextResponse } from "next/server";
import agilityMgmt from "@agility/content-management";
import { Readable } from "node:stream";
import { getNewFileName } from "utils/imageUtils";

/**
 * Block editor image tool: download an image from a URL and upload it to the
 * Agility media library (management API credentials come from the editor).
 */
export async function POST(req: NextRequest) {
	const body = await req.json();

	const api = agilityMgmt.getApi({
		location: body.location,
		websiteName: body.websiteName,
		securityKey: body.securityKey,
	});

	//download the image and stream it into the upload
	const imageRes = await fetch(body.url);
	if (!imageRes.ok || !imageRes.body) {
		return NextResponse.json({ success: 0, message: "Could not download image." }, { status: 400 });
	}
	const fileContent = Readable.fromWeb(imageRes.body as any);

	//build a unique filename with timestamp
	let fileName = body.url.substring(body.url.lastIndexOf("/") + 1);
	fileName = getNewFileName(fileName);

	const uploadRes = await api.uploadMedia({
		fileName,
		fileContent,
		mediaFolder: body?.assetFolder,
	});

	return NextResponse.json({
		success: 1,
		file: { url: uploadRes.url },
	});
}
