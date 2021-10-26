/* This example requires Tailwind CSS v2.0+ */
import { Disclosure } from "@headlessui/react";
import Link from "next/link";
import { getDynamicPageSitemapMapping } from "../../utils/sitemapUtils";
import { client, getContext } from "agility-graphql-client";
import { gql } from "@apollo/client";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

const SideBarNav = ({ module, dynamicPageItem, customData }) => {
  const navigation = customData.navigation;

  return (
    <div
      id="SideNav"
      className="flex flex-col w-64 border-r border-gray-200 pt-4 pb-4 z-40 h-full"
    >
      <div className="flex-grow flex flex-col">
        <nav className="flex-1 space-y-1 bg-white" aria-label="Sidebar">
          {navigation.map((item) =>
            !item.children ? (
              <div key={item.name} className="px-8">
                <Link href={item.href}>
                  <a
                    className={classNames(
                      item.current
                        ? "text-darkestGray"
                        : "bg-white text-darkGray hover:text-purple",
                      "group w-full flex items-center pl-7 pr-2 py-2 text-sm font-medium rounded-md"
                    )}
                  >
                    {item.name}
                  </a>
                </Link>
              </div>
            ) : (
              <Disclosure as="div" key={item.name} className="space-y-1">
                {({ open }) => {
                  item.children.forEach((subItem) => {
                    if (subItem.current) open = true;
                  });

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
                          className={`${
                            open ? `text-darkestGray` : `text-darkGray`
                          }`}
                        >
                          {item.name}
                        </span>
                      </Disclosure.Button>
                      {open && (
                        <Disclosure.Panel
                          static
                          className="space-y-1 bg-lightGray py-2"
                        >
                          {item.children.map((subItem) => {
                            return (
                              <Link key={subItem.name} href={subItem.href}>
                                <a
                                  className={classNames(
                                    subItem.current
                                      ? "bg-gray-100 text-darkestGray"
                                      : "bg-white text-darkGray hover:text-purple",
                                    "group w-full flex items-center pl-16 pr-2 py-2 text-sm font-medium bg-lightGray text-gray-600 rounded-md"
                                  )}
                                >
                                  {subItem.name}
                                </a>
                              </Link>
                            );
                          })}
                        </Disclosure.Panel>
                      )}
                    </>
                  );
                }}
              </Disclosure>
            )
          )}
        </nav>
      </div>
    </div>
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
          name: article.fields.title,
          href: articleUrls[article.contentID],
          current: url === sitemapNode.path,
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
