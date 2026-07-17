import React from "react";
import { getHrefRel, getHrefTarget } from "../../utils/linkUtils";
import Link from "next/link";
import { AgilityPic } from "@agility/nextjs";
import { getContentList } from "lib/cms/getContentList";

// Server component: fetches its own links (was getCustomInitialProps).
const SDKsFrameworks = async ({ module, languageCode, isPreview }) => {
  const { fields } = module;
  const actions = await getSDKActions({ fields, languageCode, isPreview });
  return (
    <div className="max-w-2xl lg:max-w-5xl mx-auto my-20 text-center px-8 font-muli">
      <h2 className="mb-5 text-3xl font-medium tracking-normal text-(--text-2)">
        {fields.title}
      </h2>
      <p className="text-(--text-2) font-normal mb-12">{fields.subtitle}</p>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        {actions.map((action, index) => (
          <Link
            href={action.href}
            target={action.target}
            rel={action.rel}
            key={action.title}
            title={action.title} className="custom-hover">
            <div
              key={index}
              className="bg-(--raised) p-6 flex justify-center items-center"
            >
              <AgilityPic
                image={action.image}
                fallbackWidth={40}
                className="w-10"
                aria-hidden="true"
              />
              <h3 className="ml-8 text-lg font-semibold text-(--text-2)">
                {action.title}
              </h3>
            </div>

          </Link>
        ))}
      </div>
    </div >
  );
};

export default SDKsFrameworks;

const getSDKActions = async ({ fields, languageCode, isPreview }) => {
  let actions = [];

  if (fields.links && fields.links.referencename) {
    const children = await getContentList({
      referenceName: fields.links.referencename,
      locale: languageCode,
      preview: !!isPreview,
      sort: "properties.itemOrder",
      contentLinkDepth: 1,
      take: 50,
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

  return actions;
};
