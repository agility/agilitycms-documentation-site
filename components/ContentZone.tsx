import type { ContentZoneProps } from "@agility/nextjs"
import type { FC } from "react"


export const ContentZone: FC<ContentZoneProps> = ({
	name,
	page,
	sitemapNode,
	dynamicPageItem,
	languageCode,
	channelName,
	getModule,
	isDevelopmentMode,
	isPreview,
	globalData,
}) => {
	console.log("ContentZone name:", name);
	console.log("ContentZone page:", page);
	console.log("ContentZone sitemapNode:", sitemapNode);
	console.log("ContentZone dynamicPageItem:", dynamicPageItem);
	console.log("ContentZone languageCode:", languageCode);
	console.log("ContentChannel name:", channelName);

	if (!page) return null

	const modules = page.zones[name]
	if (!modules) {
		console.warn(`Agility CMS => WARNING: No modules found for zone called '${name}'`)
		return null
	}

	return (
		<>
			{modules.map((m, index) => {
				let contentItemOrReference = m.item as any

				const moduleName = m.module ?? contentItemOrReference.properties?.definitionName

				let AgilityModule: any = null
				let props = {
					page,
					sitemapNode,
					dynamicPageItem,
					module: m.item,
					languageCode,
					channelName,
					isDevelopmentMode,
					isPreview,
					globalData: globalData,
				}

				if (moduleName) {
					AgilityModule = getModule(moduleName)
				}

				if (AgilityModule) {
					return <AgilityModule key={contentItemOrReference.contentID || contentItemOrReference.contentid || index} {...props} />
				} else {
					if (isPreview || isDevelopmentMode) {
						return (
							<div key={index}>
								The component for{" "}
								<em>
									<strong>{m.module}</strong>
								</em>{" "}
								was not found in the Agility Modules list.
							</div>
						)
					}

					throw new Error(`Component for ${m.module} was not found in the Agility Modules list.`)
				}
			})}
		</>
	)
}
