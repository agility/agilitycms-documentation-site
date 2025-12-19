import React from "react";
import { getHrefRel, getHrefTarget } from "../../utils/linkUtils";
import Link from "next/link";
import { AgilityPic } from "@agility/nextjs";
import { normalizeListedLinks } from "../../utils/linkUtils";
import getAgilitySDK from "../../lib/cms/getAgilitySDK";

const SDKsFrameworks = async ({ module, languageCode }) => {
  const { fields } = module;

  // Fetch data (original getCustomInitialProps logic)
  const agility = await getAgilitySDK();
  const locale = languageCode || process.env.AGILITY_LOCALES?.split(',')[0] || 'en-us';

  const children = await agility.getContentList({
    referenceName: fields.links.referencename,
    languageCode: locale,
    sort: "properties.itemOrder",
    contentLinkDepth: 3,
  });

  const actions = normalizeListedLinks({ listedLinks: children.items });
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
            title={action.title} className="custom-hover">
            <div
              key={index}
              className="bg-lightGray p-6 flex justify-center items-center"
            >
              <AgilityPic
                image={action.image}
                fallbackWidth={40}
                className="w-10"
                aria-hidden="true"
              />
              <h3 className="ml-8 text-lg font-semibold text-darkerGray">
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
