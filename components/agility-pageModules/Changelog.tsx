import React from "react";
import { gql } from "lib/cms/gql";
import ChangelogClient from "components/common/ChangelogClient";

/**
 * Changelog (server component): fetches releases + tags from the Agility
 * GraphQL API (cached under agility-graphql-{locale}); the filtering UI is
 * client-side in components/common/ChangelogClient.
 */
const Changelog = async ({ languageCode, isPreview }: any): Promise<React.JSX.Element> => {
	const data = await gql({
		query: `
			{
				changelog(take: 50, sort: "fields.date", direction: "desc") {
					contentID
					fields {
						date
						description
						changes(take: 50, filter: "fields.internalOnly[ne]true") {
							contentID
							properties {
								itemOrder
							}
							fields {
								tags {
									contentID
									fields {
										title
									}
								}
								title
								description
								linkURL
							}
						}
					}
				}
				changelogtags(sort: "fields.title") {
					contentID
					fields {
						title
					}
				}
			}
		`,
		locale: languageCode,
		preview: !!isPreview,
	});

	return <ChangelogClient changelog={data.changelog || []} changelogtags={data.changelogtags || []} />;
};

export default Changelog;
