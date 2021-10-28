import React from "react";
import { getHrefRel, getHrefTarget } from "../../utils/linkUtils";
import Link from "next/link";

const SDKsFrameworks = ({ module, customData }) => {
  const { fields } = module;
  const { actions } = customData;
  return (
    <div className="max-w-2xl lg:max-w-5xl mx-auto my-20 text-center px-8 font-muli">
      <h2 className="mb-5 text-3xl font-medium tracking-normal text-darkerGray">
        {fields.title}
      </h2>
      <p className="text-darkGray font-normal mb-12">{fields.subtitle}</p>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        {actions.map((action, index) => (
          <Link
            href={action.href}
            target={action.target}
            rel={action.rel}
            key={action.title}
          >
            <a title={action.title}>
              <div
                key={index}
                className="bg-lightGray p-6 flex justify-center items-center"
              >
                <img
                  src={`${action.image}?w=40`}
                  className="w-10"
                  aria-hidden="true"
                />
                <h3 className="ml-8 text-lg font-semibold text-darkerGray">
                  {action.title}
                </h3>
              </div>
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SDKsFrameworks;

SDKsFrameworks.getCustomInitialProps = async ({
  agility,
  channelName,
  languageCode,
  item,
  dynamicPageItem,
  sitemapNode,
}) => {
  let actions = [];

  if (item.fields.links && item.fields.links.referencename) {
    const children = await agility.getContentList({
      referenceName: item.fields.links.referencename,
      languageCode,
      sort: "properties.itemOrder",
      contentLinkDepth: 1,
    });

    if (children && children.items) {
      actions = children.items.map((item) => {
        return {
          title: item.fields.uRL?.text,
          href: item.fields.uRL?.href,
          image: item.fields.image?.url,
          imageAlt: item.fields.image?.label,
          target: getHrefTarget(item.fields.uRL?.href),
          rel: getHrefRel(item.fields.uRL?.href),
        };
      });
    }
  }

  return {
    actions,
  };
};
