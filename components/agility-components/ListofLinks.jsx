import icons from "../common/Icons";
import Link from "next/link";
import { normalizeListedLinks } from "../../utils/linkUtils";
import getAgilitySDK from "../../lib/cms/getAgilitySDK";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

const ListofLinks = async ({ module, languageCode }) => {
  const { fields } = module;
  const darkTheme = fields.darkTheme;

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
      className={`mx-auto px-6 font-muli ${darkTheme === "true"
        ? `bg-black text-white pt-14 pb-10`
        : `bg-white text-darkerGray my-20`
        }`}
    >
      {fields.title && (
        <h2
          className={`mb-10 text-center text-3xl font-medium tracking-normal ${darkTheme === "true" ? `text-offWhite` : `text-darkerGray`
            }`}
        >
          {fields.title}
        </h2>
      )}
      <div
        className={classNames(
          darkTheme !== "true" ? "custom-shadow" : "",
          "m-auto mb-8 max-w-5xl overflow-hidden sm:grid sm:grid-cols-2 sm:gap-px"
        )}
      >
        {actions.map((action, actionIdx) => {
          const ActionIcon = icons[action.icon];
          return (
            <div
              key={action.title}
              className={`relative group p-6 ${darkTheme === "true"
                ? `bg-black hover:bg-darkestGray`
                : `bg-offWhite hover:bg-lightGray hover:text-brightPurple`
                }  border-transparent border-l-2 hover:border-brightPurple`}
            >
              <div className="flex">
                <div>
                  {ActionIcon && (
                    <div className="bg-white p-2 rounded-full mr-4">
                      <ActionIcon
                        className="h-6 w-6 text-brightPurple"
                        aria-hidden="true"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-bold text-offWhite">
                    <Link href={action.href} className="focus:outline-none"
                      target={action.target}
                      rel={action.rel}
                    >
                      {/* Extend touch target to entire panel */}
                      <span className="absolute inset-0" aria-hidden="true" />
                      {action.title}

                    </Link>
                  </h3>
                  <p className="mt-2 text-darkGray">{action.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ListofLinks;
