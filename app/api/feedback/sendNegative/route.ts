import axios from 'axios'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
	try {
		const body = await request.json()

		if (process.env.ENDPOINT_SEND_NEGATIVE_FEEDBACK_URL) {
			const endpointRes = await axios.post(process.env.ENDPOINT_SEND_NEGATIVE_FEEDBACK_URL, {
				url: body.url,
				title: body.title,
				text: body.text
			})
			return NextResponse.json({
				success: true,
				message: 'Successfully submitted.'
			})
		} else {
			return NextResponse.json({
				success: false,
				message: 'The endpoint to send this data is not set up. Add `ENDPOINT_SEND_NEGATIVE_FEEDBACK_URL` environment variable to enable this.'
			}, { status: 500 })
		}
	} catch (error) {
		return NextResponse.json({
			success: false,
			message: 'An error occurred processing the request.'
		}, { status: 500 })
	}
}
