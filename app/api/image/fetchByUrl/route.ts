import agilityMgmt from '@agility/content-management'
import { getNewFileName } from '../../../../utils/imageUtils'
import axios from 'axios'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
	try {
		const body = await request.json()

		//set up Agility CMS Management client
		const api = agilityMgmt.getApi({
			location: body.location,
			websiteName: body.websiteName,
			securityKey: body.securityKey
		});

		//download the image from Url
		const imageReq = await axios.get(body.url, { responseType: 'stream' });
		const fileContent = imageReq.data;

		//build a unique filename with timestamp
		let fileName = body.url.substring(body.url.lastIndexOf('/') + 1);
		fileName = getNewFileName(fileName);

		//upload the file to Agility CMS
		const uploadRes = await api.uploadMedia({
			fileName,
			fileContent,
			mediaFolder: body?.assetFolder
		});

		//return the uploaded file details
		return NextResponse.json({
			success: 1,
			file: {
				url: uploadRes.url
			}
		});
	} catch (error) {
		return NextResponse.json({
			success: 0,
			message: 'An error occurred processing the request.'
		}, { status: 500 })
	}
}
