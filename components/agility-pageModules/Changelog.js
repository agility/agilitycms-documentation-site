import { normalizeListedArticles } from "utils/linkUtils";
import Link from "next/link";
import { DateTime } from "luxon"
import { client } from 'agility-graphql-client';
import { gql } from "@apollo/client";
import Blocks from "../common/blocks/index";




const Changelog = ({ module, customData }) => {

	const { changelog: changeLogItems } = customData;

	const { fields } = module;


	const getChangeDate = (dateStr) => {
		const d = new Date(dateStr)
		const dt = DateTime.fromJSDate(d)
		return dt.toFormat("LLLL dd, yyyy")
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
							<h3 className="p-3 text-2xl bg-lightGray">{getChangeDate(item.fields.date)}</h3>
							<div className="px-6 border border-lightGray">
								<div className="py-3">
									{item.fields.description}
								</div>
								<ul className="pl-6 list-disc">
									{item.fields.changes.map((change) => (
										<li key={change.contentID} className="pl-6 ">
											<div>{change.fields.component} {change.fields.type}</div>
											<div>{change.fields.title}</div>
											<ChangeBlock content={change.fields.content} />

											{/* component: "Platform"
										title: "Updated version of Tiny MCE"
										type: "Improvement" */}
										</li>
									))}

								</ul>
							</div>
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


const ChangeBlock = ({ content }) => {

	if (!content) return null

	const blocks = JSON.parse(content).blocks;
	return (
		<Blocks blocks={blocks} proseSize="sm" />
	)
}

export default Changelog;
