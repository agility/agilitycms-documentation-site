'use client'

/* This example requires Tailwind CSS v2.0+ */
import { Disclosure, Dialog, Transition } from "@headlessui/react";
import { Fragment, useState } from "react";
import Link from "next/link";
import { ChevronRightIcon, XIcon } from "@heroicons/react/outline";
import { getDynamicPageSitemapMapping } from "../../utils/sitemapUtils";
import { client, getContext } from "agility-graphql-client";
import { gql } from "@apollo/client";

function classNames(...classes) {
	return classes.filter(Boolean).join(" ");
}

const SideBarNav = ({ module, dynamicPageItem, customData }) => {
	const navigation = customData.navigation;
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	const renderNavigation = () => (
		<nav className="flex-1 space-y-1 bg-white" aria-label="Sidebar">
			{navigation.map((item) =>
				!item.children ? (
					<div key={item.name} className="px-8">
						<Link href={item.href}
							onClick={() => setMobileMenuOpen(false)}
							className={classNames(
								item.current
									? "text-darkestGray"
									: "bg-white text-darkGray hover:text-purple",
								"group w-full flex items-center pl-7 pr-2 py-2 text-sm font-medium rounded-md"
							)}
						>
							{item.name}

						</Link>
					</div>
				) : (
					<Disclosure
						as="div"
						key={item.name}
						className="space-y-1"
						defaultOpen={item.children.some((subItem) => subItem.current)}
					>
						{({ open }) => {
							return (
								<>
									<Disclosure.Button
										className={classNames(
											item.current
												? "bg-gray-100 text-darkestGray"
												: "bg-white text-gray-600 hover:text-purple",
											"group w-full flex items-center pr-2 py-2 text-left text-sm font-medium rounded-md focus:outline-none px-8"
										)}
									>
										<svg
											className={classNames(
												open ? "text-gray-400 rotate-90" : "text-gray-300",
												"mr-2 flex-shrink-0 h-5 w-5 transform group-hover:text-gray-400 transition-colors ease-in-out duration-150"
											)}
											viewBox="0 0 20 20"
											aria-hidden="true"
										>
											<path d="M6 6L14 10L6 14V6Z" fill="currentColor" />
										</svg>
										<span
											className={`${open ? `text-darkestGray` : `text-darkGray`
												} hover:text-purple`}
										>
											{item.name}
										</span>
									</Disclosure.Button>
									<Disclosure.Panel
										className="py-2 space-y-1 bg-lightGray"
									>
										{item.children.map((subItem) => {
											return (
												<Link key={subItem.name} href={subItem.href}
													onClick={() => setMobileMenuOpen(false)}
													className={classNames(
														!!subItem.current
															? " text-purple"
															: " text-darkGray hover:text-purple ",
														"group w-full flex items-center pl-16 pr-2 py-2 text-sm font-medium bg-lightGray text-gray-600 rounded-md"
													)}
												>
													{subItem.name}

												</Link>
											);
										})}
									</Disclosure.Panel>
								</>
							);
						}}
					</Disclosure>
				)
			)}
		</nav>
	);

	return (
		<>
			{/* Floating action button - Mobile */}
			<button
				type="button"
				onClick={() => setMobileMenuOpen(true)}
				className="lg:hidden fixed left-2 top-[65px] z-40 flex items-center justify-center w-9 h-9 bg-gray-50/60 backdrop-blur-sm rounded-full shadow-md hover:shadow-lg text-gray-500 hover:text-purple focus:outline-none focus:ring-2 focus:ring-purple focus:ring-offset-1 transition-all duration-200"
				aria-label="Open navigation menu"
			>
				<ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
			</button>

			{/* Mobile menu dialog */}
			<Transition.Root show={mobileMenuOpen} as={Fragment}>
				<Dialog as="div" className="fixed inset-0 z-50 lg:hidden" onClose={setMobileMenuOpen}>
					<Transition.Child
						as={Fragment}
						enter="transition-opacity ease-linear duration-300"
						enterFrom="opacity-0"
						enterTo="opacity-100"
						leave="transition-opacity ease-linear duration-300"
						leaveFrom="opacity-100"
						leaveTo="opacity-0"
					>
						<Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50" />
					</Transition.Child>

					<div className="fixed inset-0 flex pointer-events-none">
						<Transition.Child
							as={Fragment}
							enter="transition ease-in-out duration-300 transform"
							enterFrom="-translate-x-full"
							enterTo="translate-x-0"
							leave="transition ease-in-out duration-300 transform"
							leaveFrom="translate-x-0"
							leaveTo="-translate-x-full"
						>
							<div className="relative flex flex-col w-72 max-w-[85vw] bg-white shadow-2xl pointer-events-auto h-full">
								{/* Close button inside the panel */}
								<div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
									<span className="text-lg font-semibold text-darkestGray">Navigation</span>
									<button
										type="button"
										className="inline-flex items-center justify-center rounded-md p-2 text-darkGray hover:bg-lightGray hover:text-darkestGray focus:outline-none focus:ring-2 focus:ring-inset focus:ring-purple"
										onClick={() => setMobileMenuOpen(false)}
									>
										<span className="sr-only">Close sidebar</span>
										<XIcon className="h-6 w-6" aria-hidden="true" />
									</button>
								</div>
								<div className="flex-1 overflow-y-auto pt-4 pb-4">
									<div className="flex flex-col flex-grow">
										{renderNavigation()}
									</div>
								</div>
							</div>
						</Transition.Child>
					</div>
				</Dialog>
			</Transition.Root>

			{/* Desktop sidebar */}
			<div
				id="SideNav"
				className="hidden lg:flex z-40 flex-col w-64 pb-4 font-muli pt-[130px] max-h-screen mt-[-124px] overflow-y-auto scrollbar-thin"
			>
				<div className="flex flex-col flex-grow">
					{renderNavigation()}
				</div>
			</div>
		</>
	);
};

SideBarNav.getCustomInitialProps = async ({
	agility,
	channelName,
	languageCode,
	item,
	dynamicPageItem,
	sitemapNode,
}) => {
	//the navigation object we'll pass to the frontend
	const navigation = [];

	//the category of sections/articles to show in the sidebar
	const category = item.fields.category;

	//top level item (category landing page)
	navigation.push({
		name: category.fields.title,
		href: !dynamicPageItem
			? sitemapNode.path
			: getSectionBaseUrl(sitemapNode.path),
		current: !dynamicPageItem ? true : false,
	});

	//get all sections for this category
	const sectionsRefName = category.fields.sections.referencename;

	//get all the articles for this category
	const articlesRefName = category.fields.articles.referencename;

	//validate we have sections AND articles to work with
	if (!sectionsRefName || !articlesRefName) {
		console.log(
			"No `sectionsRefName` or `articlesRef` was found for this category"
		);
		return {
			navigation,
		};
	}

	const { data } = await client.query({
		query: gql`
		{
			${articlesRefName} (sort: "properties.itemOrder") {
				contentID
				fields {
					title
					section_ValueField
				}
			},
			${sectionsRefName} (sort: "properties.itemOrder") {
				contentID
				fields {
					title
					parentSection_ValueField
				}
			}
		}
		`,
	});

	const sections = data[sectionsRefName];
	const articles = data[articlesRefName];

	//validate we have sections AND articles to work with
	if (!sections || !articles) {
		console.log("No `sections` or `articles` were found for this category");
		return {
			navigation,
		};
	}

	//get a dictionary of dynamic page urls by contentID for url resolution (from cache)
	const articleUrls = getDynamicPageSitemapMapping();

	//filter out the child sections
	const topLevelSections = sections.filter((section, idx) => {
		return !section.fields.parentSection_ValueField;
	});

	//loop through top-level sections and add articles in
	topLevelSections.forEach((section) => {
		let articlesInSection = articles.filter((article) => {
			return article.fields.section_ValueField == section.contentID;
		});

		//don't show a section if it has no articles
		if (articlesInSection.length === 0) return;

		navigation.push({
			name: section.fields.title,
			children: articlesInSection.map((article) => {
				const url = articleUrls[article.contentID];
				return {
					name: article.fields.title || null,
					href: articleUrls[article.contentID] || "#",
					current: url === sitemapNode.path || null,
				};
			}),
		});
	});

	return {
		navigation,
	};
};

export default SideBarNav;

const getSectionBaseUrl = (the_url) => {
	var the_arr = the_url.split("/");
	the_arr.pop();
	return the_arr.join("/");
};
