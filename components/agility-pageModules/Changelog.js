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
						<section key={item.contentID} className="mt-6">
							<header className="flex items-center">
								<div className="text-purple font-semibold min-w-[200px] text-right pr-4">{getChangeDate(item.fields.date)}</div>
								<h3 className="p-3 text-2xl text-[16px] font-bold border-gray border-l-2">{item.fields.description}</h3>
							</header>
							
							<div className="border-lightGray">
								<ul className="list-disc ml-[200px] border-l-1 border-gray border-l-2 list-inside">
									{item.fields.changes.map((change) => (
										<li key={change.contentID} className="relative pl-6 mb-2">
											<div className="absolute w-[200px] top-0 left-[-200px] flex justify-end pr-4">
												<span className="bg-[#ECE5F6] ml-2 inline-block py-1 px-3 text-purple font-bold text-[11px] rounded-full">{change.fields.component}</span>
												<span className="bg-[#ECE5F6] ml-2 inline-block py-1 px-3 text-purple font-bold text-[11px] rounded-full">{change.fields.type}</span>
											</div>
											
											<h4 className="inline">{change.fields.title}
												<span className="inline-block">{change.fields.description}</span>
											</h4>
											

											{/* component: "Platform"
										title: "Updated version of Tiny MCE"
										type: "Improvement" */}
										</li>
									))}

								</ul>
							</div>
						</section>
					))}
				</div>
			</div>
		</div>
	);
};

Changelog.getCustomInitialProps = async () => {

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
						component
						description,
						linkURL
					}
					}
				}
			}
		}
		`,
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
