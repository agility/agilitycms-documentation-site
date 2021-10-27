/*
  This example requires Tailwind CSS v2.0+ 
  
  This example requires some changes to your config:
  
  ```
  // tailwind.config.js
  const colors = require('tailwindcss/colors')
  
  module.exports = {
    // ...
    theme: {
      extend: {
        colors: {
          sky: colors.sky,
          teal: colors.teal,
          rose: colors.rose,
        },
      },
    },
  }
  ```
*/
import icons from "../common/Icons";
import Link from "next/link";
import { normalizeListedLinks } from "../../utils/linkUtils";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

const RightOrLeftAlignedLinks = ({ module, customData }) => {
  const { fields } = module;
  const { actions } = customData;

  return (
    <div
      className={classNames(
        fields.rightAlignLinks === "true"
          ? "lg:flex-row"
          : "lg:flex-row-reverse",
        "flex flex-col max-w-2xl lg:max-w-5xl mx-auto my-10 px-4 font-muli"
      )}
    >
      <div className="lg:w-2/5 text-center lg:text-left mb-5 lg:mb-0">
        <h2 className="mb-5 text-3xl font-medium tracking-normal text-darkerGray">
          {fields.title}
        </h2>
        <p className="text-darkerGray font-normal">{fields.subTitle}</p>
      </div>
      <div
        className={classNames(
          fields.rightAlignLinks === "true" ? "lg:ml-auto" : "lg:mr-auto",
          "lg:w-1/2 mb-10 overflow-hidden sm:grid sm:grid-cols-1 sm:gap-px"
        )}
      >
        {actions.map((action, actionIdx) => {
          const ActionIcon = icons[action.icon];
          return (
            <div
              key={action.title}
              className={classNames("relative group bg-white group")}
            >
              <div className="flex flex-row">
                <div className="border-transparent border-l-2 p-6 group-hover:border-brightPurple group-hover:bg-lightGray w-full transition duration-150 ease-in-out">
                  <div className="flex">
                    <div className="mr-6 mt-1">
                      {ActionIcon && (
                        <span>
                          <ActionIcon
                            className="h-6 w-6 text-brightPurple"
                            aria-hidden="true"
                          />
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-darkerGray group-hover:text-brightPurple text-lg font-bold">
                        <Link href={action.href}>
                          <a
                            className="focus:outline-none"
                            target={action.target}
                            rel={action.rel}
                          >
                            {/* Extend touch target to entire panel */}
                            <span
                              className="absolute inset-0"
                              aria-hidden="true"
                            />
                            {action.title}
                          </a>
                        </Link>
                      </h3>
                      <p className="mt-2 text-darkGray">{action.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

RightOrLeftAlignedLinks.getCustomInitialProps = async ({
  agility,
  channelName,
  languageCode,
  item,
  dynamicPageItem,
  sitemapNode,
}) => {
  let actions = [];

  if (item.fields.children && item.fields.children.referencename) {
    const children = await agility.getContentList({
      referenceName: item.fields.children.referencename,
      languageCode,
      sort: "properties.itemOrder",
      contentLinkDepth: 3,
    });

    if (children && children.items) {
      actions = normalizeListedLinks({
        listedLinks: children.items,
      });
    }
  }

  return {
    actions,
  };
};

export default RightOrLeftAlignedLinks;
