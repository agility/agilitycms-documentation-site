import { generatePreviewKey } from "@agility/nextjs/node";
import { NextResponse } from "next/server";

export async function GET() {
	//TODO: Only generate the preview link if you are already in Preview!
	const previewKey = generatePreviewKey();

	//Return a valid preview key
	return new NextResponse(previewKey, {
		headers: {
			'Content-Type': 'text/plain',
		},
	});
}
