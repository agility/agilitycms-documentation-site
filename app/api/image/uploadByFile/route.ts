import agilityMgmt from '@agility/content-management'
import { getNewFileName } from '../../../../utils/imageUtils'
import sizeOf from 'image-size'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData()
		const file = formData.get('image') as File
		const location = formData.get('location') as string
		const websiteName = formData.get('websiteName') as string
		const securityKey = formData.get('securityKey') as string
		const assetFolder = formData.get('assetFolder') as string | undefined

		if (!file) {
			return NextResponse.json({
				success: 0,
				message: 'No file provided.'
			}, { status: 400 })
		}

		//set up Agility CMS Management client
		const api = agilityMgmt.getApi({
			location,
			websiteName,
			securityKey
		});

		//get the contents of the image
		const arrayBuffer = await file.arrayBuffer()
		const buffer = Buffer.from(arrayBuffer)

		//get the dimensions of the image
		const size = sizeOf(buffer);

		//build a unique filename with a timestamp
		const fileName = getNewFileName(file.name);

		//upload the file to Agility CMS
		const uploadRes = await api.uploadMedia({
			fileName,
			fileContent: buffer,
			mediaFolder: assetFolder
		});

		//return the uploaded file details
		return NextResponse.json({
			success: 1,
			file: {
				url: uploadRes.url,
				size,
			}
		});
	} catch (error) {
		return NextResponse.json({
			success: 0,
			message: 'An error occurred processing the request.'
		}, { status: 500 })
	}
}
