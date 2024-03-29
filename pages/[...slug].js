import Layout from "components/common/Layout";
import { getAgilityPageProps, getAgilityPaths } from "@agility/nextjs/node";
import { getModule } from "components/agility-pageModules";
import { client } from "agility-graphql-client";
import { gql } from "@apollo/client";
import { global } from "@apollo/client/utilities/globals";
import { READ_SITEMAP_FOR_HEADER } from "utils/sitemapUtils";
const agility = require("@agility/content-fetch");

const cacheSitemapInGraphQL = ({ sitemap, isPreview, isDevelopmentMode }) => {
  //a hook that can be used to cache the sitemap so we don't need to request it up again within the app

  //convert to array which can be safely written to GraphQL
  const sitemapFlat = Object.keys(sitemap).map((item) => {
    if (!sitemap[item].contentID) sitemap[item].contentID = -1;
    return sitemap[item];
  });

  //write the sitemap to graphQL cache... you can freely use it later - does not support any filtering
  client.writeQuery({
    query: gql`
      query WriteSitemapFlat {
        sitemap {
          title
          menuText
          name
          path
          pageID
          isFolder
          redirect
          visible {
            menu
            sitemap
          }
          contentID
        }
      }
    `,
    data: {
      sitemap: sitemapFlat,
    },
    variables: {},
  });
};

// getStaticProps function fetches data for all of your Agility Pages and Next.js will pre-render these pages at build time
export async function getStaticProps({
  preview,
  params,
  locale,
  defaultLocale,
  locales,
}) {
  // set a global variable that our GraphQL client can read to determine whether we are in preview or not...
  global.IS_PREVIEW = process.env.NODE_ENV === "development" || preview;

  const agilityProps = await getAgilityPageProps({
    preview,
    params,
    locale,
    getModule,
    defaultLocale,
    apiOptions: {
      expandAllContentLinks: false, //override this so that we don't get too much data back in GetPage API calls
      contentLinkDepth: 2,
      onSitemapRetrieved: cacheSitemapInGraphQL, //cache the sitemap in GraphQL so we can access it again from any component
    },
  });

  if (!agilityProps || agilityProps.notFound) {
    // We throw to make sure this fails at build time as this is never expected to happen
    return {
      notFound: true,
    };
  }

  //do any other data lookups we need for global components like Header/Footer that aren't Page Modules
  //get sitemap from cache
  const { sitemap } = client.readQuery({
    query: READ_SITEMAP_FOR_HEADER, //does not support filtering
  });

  //only get the top and second level links and respsect whether they should be visible on menu
  const mainMenuLinks = sitemap
    .filter((node) => {
      return node.visible.menu && node.path.split("/").length < 4;
    })
    .map((node, idx) => {
      let path = node.path;
      let currentNodePath = agilityProps.sitemapNode.path;
      if (path === "/home") {
        path = "/";
        if (currentNodePath === "/home") {
          currentNodePath = "/";
        }
      }
      return {
        name: node.menuText,
        href: path,
        current:
          currentNodePath === path ||
          (currentNodePath.split("/").length > 2 &&
            currentNodePath.indexOf(node.path) > -1),
      };
    });

  const { data } = await client.query({
    query: gql`
      {
        header {
          fields {
            showPreHeader
            signInLink {
              text
              href
              target
            }
            documentationLink {
              text
              href
              target
            }
            primaryDropdownLinks(sort: "properties.itemOrder") {
              fields {
                link {
                  text
                  href
                }
              }
            }
            secondaryDropdownLinks(sort: "properties.itemOrder") {
              fields {
                link {
                  text
                  href
                }
              }
            }
          }
        }
      }
    `,
  });

  const primaryDropdownLinks = data.header[0].fields.primaryDropdownLinks.map(
    (link) => link.fields.link
  );

  const secondaryDropdownLinks =
    data.header[0].fields.secondaryDropdownLinks.map(
      (link) => link.fields.link
    );

  // preheader content from main agility site
  const api = await agility.getApi({
    guid: process.env.MAIN_AGILITY_SITE_GUID,
    apiKey: process.env.MAIN_AGILITY_SITE_API_KEY,
  });

  const mainSiteHeader = await api.getContentItem({
    contentID: 22,
    languageCode: "en-ca",
  });

  const marketingContent = mainSiteHeader.fields.marketingBanner;

  const preHeader = {
    showPreHeader: data.header[0].fields.showPreHeader,
    signInLink: data.header[0].fields.signInLink,
    documentationLink: data.header[0].fields.documentationLink,
  };

  // get the footer links from the main site
  const mainSiteFooter = await api.getContentItem({
    contentID: 16,
    languageCode: "en-ca",
    expandAllContentLinks: true
  })

  let footerNavigation = [];

  footerNavigation.push({
    name: mainSiteFooter.fields.column1Title,
    children: []
  })

  mainSiteFooter.fields.column1Links.forEach((link) => {
    footerNavigation[0].children.push({
      name: link.fields.title,
      href: link.fields.uRL.href,
      target: link.fields.uRL?.target
    })
  })

  footerNavigation.push({
    name: mainSiteFooter.fields.column2Title,
    children: []
  })

  mainSiteFooter.fields.column2Links.forEach((link) => {
    footerNavigation[1].children.push({
      name: link.fields.title,
      href: link.fields.uRL.href,
      target: link.fields.uRL?.target
    })
  })

  footerNavigation.push({
    name: mainSiteFooter.fields.column3Title,
    children: []
  })

  mainSiteFooter.fields.column3Links.forEach((link) => {
    footerNavigation[2].children.push({
      name: link.fields.title,
      href: link.fields.uRL.href,
      target: link.fields.uRL?.target
    })
  })

  const footerBottomNavigation = mainSiteFooter.fields.bottomLinks.map((link, idx) => {
    return {
      name: link.fields.title,
      href: link.fields.uRL.href,
      target: link.fields.uRL.target
    }
  });

  const additionalPageProps = {
    mainMenuLinks,
    primaryDropdownLinks,
    secondaryDropdownLinks,
    marketingContent,
    preHeader,
    footerNavigation,
    footerBottomNavigation
  };



  return {
    // return all props
    props: { ...agilityProps, ...additionalPageProps },

    // Next.js will attempt to re-generate the page when a request comes in, at most once every 10 seconds
    // Read more on Incremental Static Regenertion here: https://nextjs.org/docs/basic-features/data-fetching#incremental-static-regeneration
    revalidate: 10,
  };
}

// Next.js will statically pre-render all the paths from Agility CMS
export async function getStaticPaths({ locales, defaultLocale }) {
  //get the paths configured in agility
  let agilityPaths = await getAgilityPaths({
    preview: false,
    locales,
    defaultLocale,
  });

  //remove the 404 and 500 page out of the paths to build as part of this slug
  const filteredPaths = agilityPaths.filter(p => p !== "/404" && p !== "/500")

  return {
    paths: filteredPaths,
    fallback: true,
  };
}

const AgilityPage = (props) => {
  return <Layout {...props} />;
};


export default AgilityPage;
