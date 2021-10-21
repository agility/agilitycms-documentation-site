import icons from "../common/Icons";
import Link from "next/link";
import { normalizeListedLinks } from "../../utils/linkUtils";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

const ListofLinks = ({ module, customData }) => {
  const { fields } = module;
  const { actions } = customData;
  return (
    <div className="mx-auto my-10 py-20 sm:px-6 bg-darkerGray text-white">
      {fields.title && (
        <h2 className="mb-10 text-center text-3xl font-normal tracking-normal text-offWhite">
          {fields.title}
        </h2>
      )}
      <div className="m-auto  mb-8 max-w-5xl overflow-hidden sm:grid sm:grid-cols-2 sm:gap-px">
        {actions.map((action, actionIdx) => {
          const ActionIcon = icons[action.icon];
          return (
            <div
              key={action.title}
              className="relative group bg-darkerGray p-6 hover:bg-darkestGray border-transparent border-l-2 hover:border-brightPurple"
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
                  <h3 className="text-lg font-medium text-offWhite">
                    <Link href={action.href}>
                      <a
                        className="focus:outline-none"
                        target={action.target}
                        rel={action.rel}
                      >
                        {/* Extend touch target to entire panel */}
                        <span className="absolute inset-0" aria-hidden="true" />
                        {action.title}
                      </a>
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

ListofLinks.getCustomInitialProps = async ({
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

export default ListofLinks;
