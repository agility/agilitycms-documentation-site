import { NextRequest, NextResponse } from "next/server";
import agilityMgmt from "@agility/content-management";
import { Readable } from "node:stream";
import sizeOf from "image-size";
import { getNewFileName } from "utils/imageUtils";

/**
 * Block editor image tool: multipart file upload into the Agility media
 * library. Route handlers parse multipart natively via req.formData() —
 * no next-connect/middleware needed anymore.
 */
export async function POST(req: NextRequest) {
	const form = await req.formData();

	const image = form.get("image") as File | null;
	if (!image) {
		return NextResponse.json({ success: 0, message: "No image provided." }, { status: 400 });
	}

	const api = agilityMgmt.getApi({
		location: form.get("location") as string,
		websiteName: form.get("websiteName") as string,
		securityKey: form.get("securityKey") as string,
	});

	const buffer = Buffer.from(await image.arrayBuffer());
	const size = sizeOf(buffer);
	const fileContent = Readable.from(buffer);
	const fileName = getNewFileName(image.name);

	const uploadRes = await api.uploadMedia({
		fileName,
		fileContent,
		mediaFolder: (form.get("assetFolder") as string) || undefined,
	});

	return NextResponse.json({
		success: 1,
		file: { url: uploadRes.url, size },
	});
}
