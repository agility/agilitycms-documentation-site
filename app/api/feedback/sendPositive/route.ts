import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
	const body = await req.json();

	if (!process.env.ENDPOINT_SEND_POSITIVE_FEEDBACK_URL) {
		return NextResponse.json(
			{
				success: false,
				message:
					"The endpoint to send this data is not set up. Add `ENDPOINT_SEND_POSITIVE_FEEDBACK_URL` environment variable to enable this.",
			},
			{ status: 500 }
		);
	}

	await fetch(process.env.ENDPOINT_SEND_POSITIVE_FEEDBACK_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ url: body.url, title: body.title }),
	});

	return NextResponse.json({ success: true, message: "Successfully submitted." });
}
