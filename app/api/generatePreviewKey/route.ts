import { generatePreviewKey } from "@agility/nextjs/node";

/** Returns a valid Agility preview key (used by the CMS preview setup). */
export async function GET() {
	const previewKey = await generatePreviewKey();
	return new Response(previewKey, { status: 200 });
}
