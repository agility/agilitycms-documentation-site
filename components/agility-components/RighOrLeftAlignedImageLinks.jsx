import Link from "next/link";
import { getHrefRel, getHrefTarget } from "../../utils/linkUtils";
import { AgilityPic } from "@agility/nextjs";
import { normalizeListedLinks } from "../../utils/linkUtils";
import getAgilitySDK from "../../lib/cms/getAgilitySDK";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

const RightOrLeftAlignedImageLinks = async ({ module, languageCode }) => {
  const { fields } = module;

  // Fetch data (original getCustomInitialProps logic)
  const agility = await getAgilitySDK();
  const locale = languageCode || process.env.AGILITY_LOCALES?.split(',')[0] || 'en-us';

  const children = await agility.getContentList({
    referenceName: fields.children.referencename,
    languageCode: locale,
    sort: "properties.itemOrder",
    contentLinkDepth: 3,
  });

  const actions = normalizeListedLinks({ listedLinks: children.items });
  return (
    <div
      className={classNames(
        fields.rightAlignLinks === "true"
          ? "lg:flex-row"
          : "lg:flex-row-reverse",
        "flex flex-col max-w-2xl lg:max-w-5xl mx-auto my-20 font-muli"
      )}
    >
      <div className="lg:w-2/5 text-center lg:text-left mb-5 lg:mb-0">
        <h2 className="mb-5 text-3xl font-extrabold text-gray-900">
          {fields.title}
        </h2>
        <p className="text-gray-500">{fields.subTitle}</p>
      </div>
      <div
        className={classNames(
          fields.rightAlignLinks === "true" ? "lg:ml-auto" : "lg:mr-auto",
          "lg:w-1/2 rounded-lg mb-10 bg-gray-200 overflow-hidden shadow-xl divide-y divide-gray-200 sm:divide-y-0 sm:grid sm:grid-cols-2 sm:gap-px"
        )}
      >
        {actions.map((action, actionIdx) => {
          return (
            <div
              key={action.title}
              className={classNames(
                "relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500"
              )}
            >
              <div className="flex flex-row items-center">
                <div className="mr-6">
                  <span
                    className={classNames(
                      "bg-white",
                      "text-white",
                      "rounded-lg inline-flex p-3 ring-4 ring-white"
                    )}
                  >
                    <AgilityPic
                      image={action.image}
                      fallbackWidth={40}
                      className="w-10"
                      aria-hidden="true"
                    />
                  </span>
                </div>

                <div className="">
                  <h3 className="text-lg font-medium">
                    <Link
                      href={action.href}
                      target={action.target}
                      rel={action.rel}
                      className="focus:outline-none">
                      {/* Extend touch target to entire panel */}
                      <span className="absolute inset-0" aria-hidden="true" />
                      {action.title}

                    </Link>
                  </h3>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RightOrLeftAlignedImageLinks;
