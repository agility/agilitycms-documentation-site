import { normalizeListedArticles } from "utils/linkUtils";
import Link from "next/link";
import { DateTime } from "luxon"
import { client } from 'agility-graphql-client';
import { gql } from "@apollo/client";


const Changelog = ({ module, customData }) => {

	const { changelog: changeLogItems } = customData;

	const { fields } = module;


	const getChangeDate = (dateStr) => {
		const d = new Date(dateStr)
		const dt = DateTime.fromJSDate(d)
		return dt.toFormat("LLLL yyyy")
	}

	return (
		<div className="relative px-4 my-20 sm:px-6 lg:px-8 font-muli">
			<div className="absolute inset-0">
				<div className="bg-white h-1/3 sm:h-2/3" />
			</div>
			<div className="relative mx-auto max-w-7xl">
				<div className="text-center">
					<h2 className="text-3xl font-medium tracking-normal text-gray-900 sm:text-4xl">
						{fields.title}
					</h2>
					<p className="my-6 text-darkGray">
						{fields.description}
					</p>
				</div>
				<div className="mt-12">
					{changeLogItems.map((item, index) => (
						<div key={item.contentID} className="mt-6">
							<h3 className="py-3 text-2xl border-b border-lightGray">{getChangeDate(item.fields.date)}</h3>
							<div className="py-3">
								{item.fields.description}
							</div>
							<ul className="list-disc">
								{item.fields.changes.map((change) => (
									<li key={change.contentID} className="ml-5">
										<div>{change.fields.component} {change.fields.type}</div>
										<div>{change.fields.title}</div>

										{/* component: "Platform"
										title: "Updated version of Tiny MCE"
										type: "Improvement" */}
									</li>
								))}

							</ul>


							{/* <div className="flex flex-col justify-between flex-1 p-6 bg-white">
								<div className="flex-1">
									<span className="block mt-2">
										<p className="text-xl font-semibold text-darkerGray group-hover:text-brightPurple">
											{article.title}
										</p>
										<p className="mt-3 text-base text-darkGray">
											{article.description}
										</p>
									</span>
								</div>
								{article.concept && (
									<div className="flex items-center mt-6">
										<span className="bg-gray-100 text-darkerGray group-hover:text-brightPurple inline-flex items-center px-3 py-0.5 rounded-sm text-sm font-normal">
											{article.concept}
										</span>
									</div>
								)}
							</div> */}
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

Changelog.getCustomInitialProps = async ({
	agility,
	channelName,
	languageCode,
	item,
	dynamicPageItem,
	sitemapNode,
}) => {


	// const items = await agility.getContentList({
	// 	referenceName: item.fields.changelog.referencename,
	// 	languageCode,
	// 	sort: "fields.date",
	// 	direction: "desc",
	// 	contentLinkDepth: 3,
	// 	expandAllContentLinks: true,
	// 	take: 50
	// });




	// return items;



	const { data } = await client.query({
		query: gql`
        {
				changelog (take: 50, sort: "fields.date", direction:"desc") {
					contentID,
					fields {
						date,
						description,
						changes (take: 50, filter: "fields.internalOnly[ne]true") {
						contentID,
						properties {
							itemOrder
						},
						fields {
							title,
							type,
							component,
							content
						}
						}
					}
				}
		}`,
	});

	return data

};

export default Changelog;
