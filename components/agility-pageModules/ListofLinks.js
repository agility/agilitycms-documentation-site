import icons from "../common/Icons";
import Link from "next/link";
import { normalizeListedLinks } from "../../utils/linkUtils";
import { getContentList } from "lib/cms/getContentList";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

// Server component: fetches its own child links (was getCustomInitialProps).
const ListofLinks = async ({ module, languageCode, isPreview }) => {
  const { fields } = module;
  const actions = await getListedLinkActions({ fields, languageCode, isPreview });
  const darkTheme = fields.darkTheme;
  return (
    <div
      className={`mx-auto px-6 font-muli ${darkTheme === "true"
          ? `bg-(--n-900) text-(--n-50) pt-14 pb-10`
          : `bg-(--bg) text-(--text) my-20`
        }`}
    >
      {fields.title && (
        <h2
          className={`mb-10 text-center text-3xl font-medium tracking-normal ${darkTheme === "true" ? `text-(--n-50)` : `text-(--text)`
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
                  ? `bg-(--n-900) hover:bg-(--n-800)`
                  : `bg-(--surface) hover:bg-(--raised)`
                }  border-transparent border-l-2 hover:border-(--primary)`}
            >
              <div className="flex">
                <div>
                  {ActionIcon && (
                    <div className="bg-(--n-50) p-2 rounded-full mr-4">
                      <ActionIcon
                        className="h-6 w-6 text-(--primary)"
                        aria-hidden="true"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <h3
                    className={`text-lg font-bold ${darkTheme === "true" ? `text-(--n-50)` : `text-(--text) group-hover:text-(--primary)`
                      }`}
                  >
                    <Link href={action.href} className="focus:outline-hidden"
                      target={action.target}
                      rel={action.rel}
                    >
                      {/* Extend touch target to entire panel */}
                      <span className="absolute inset-0" aria-hidden="true" />
                      {action.title}

                    </Link>
                  </h3>
                  <p
                    className={`mt-2 ${darkTheme === "true" ? `text-(--n-300)` : `text-(--text-2)`
                      }`}
                  >
                    {action.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const getListedLinkActions = async ({ fields, languageCode, isPreview }) => {
  let actions = [];

  if (fields.children && fields.children.referencename) {
    const children = await getContentList({
      referenceName: fields.children.referencename,
      locale: languageCode,
      preview: !!isPreview,
      sort: "properties.itemOrder",
      contentLinkDepth: 3,
      take: 50,
    });

    if (children && children.items) {
      actions = await normalizeListedLinks({
        listedLinks: children.items,
        locale: languageCode,
        preview: !!isPreview,
      });
    }
  }

  return actions;
};

export default ListofLinks;
