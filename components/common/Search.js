import React from "react";
import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/outline";

import algoliasearch from "algoliasearch/lite";
import { createAutocomplete } from "@algolia/autocomplete-core";
import { getAlgoliaResults } from "@algolia/autocomplete-preset-algolia";
import { renderHTML } from "@agility/nextjs";

const searchClient = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY
);

const Search = () => {
  // (1) Create a React state.
  const inputRef = React.useRef(null);
  const [autocompleteState, setAutocompleteState] = React.useState({});
  const autocomplete = React.useMemo(
    () =>
      createAutocomplete({
        onStateChange({ state }) {
          // (2) Synchronize the Autocomplete state with the React state.
          setAutocompleteState(state);
        },
        getSources() {
          return [
            // (3) Use an Algolia index source.
            {
              sourceId: "articles",
              getItemInputValue({ item }) {
                return item.query;
              },
              getItems({ query }) {
                return getAlgoliaResults({
                  searchClient,
                  queries: [
                    {
                      indexName: "doc_site",
                      query,
                      params: {
                        hitsPerPage: 4,
                        highlightPreTag: "<mark>",
                        highlightPostTag: "</mark>",
                      },
                    },
                  ],
                });
              },
              getItemUrl({ item }) {
                return item.url;
              },
            },
          ];
        },
      }),
    []
  );

  return (
    <div className="aa-Autocomplete" {...autocomplete.getRootProps({})}>
      <form
        className="aa-Form"
        {...autocomplete.getFormProps({ inputElement: inputRef.current })}
      >
        <input
          className="block w-full border-none pt-2 pb-1.5 pl-10 pr-3 text-sm placeholder-darkGray bg-lightGray focus:outline-none focus:text-gray-900 focus:placeholder-gray-400 focus:border-purple focus:ring-1 focus:ring-purple sm:text-sm"
          {...autocomplete.getInputProps({})}
          placeholder="Search docs..."
        />
      </form>

      <div className="aa-Panel relative" {...autocomplete.getPanelProps({})}>
        {autocompleteState.isOpen &&
          autocompleteState.collections.map((collection, index) => {
            const { source, items } = collection;

            return (
              <div
                key={`source-${index}`}
                className="aa-Source absolute bg-white z-50 border border-gray-300 w-full"
              >
                {items.length > 0 && (
                  <ul
                    className="aa-List custom-shadow"
                    {...autocomplete.getListProps()}
                  >
                    {items.map((item) => {
                      let description = null;
                      if (
                        item._snippetResult?.content &&
                        item._snippetResult.content.length > 0
                      ) {
                        let snippetBlock = item._snippetResult.content.find(
                          (block) => {
                            return block.data.text.matchLevel === "full";
                          }
                        );

                        if (snippetBlock) {
                          description = snippetBlock.data.text.value;
                        }
                      }

                      if (!description) {
                        description = item._highlightResult.description?.value;
                      }

                      return (
                        <li
                          key={item.objectID}
                          className="aa-Item"
                          {...autocomplete.getItemProps({
                            item,
                            source,
                          })}
                        >
                          <Link href={item.url} className="SearchResult px-5 py-2 block w-full hover:bg-lightGray">
                            <span
                              className="SearchResult__titlee block text-purple text-sm font-bold"
                              dangerouslySetInnerHTML={renderHTML(
                                item._highlightResult.title.value
                              )}
                            ></span>

                            {description && (
                              <span
                                className="SearchResult__description block text-sm mb-2 text-darkestGray"
                                dangerouslySetInnerHTML={renderHTML(
                                  description
                                )}
                              ></span>
                            )}
                            <span className="SearchResult__category-section block text-xs text-darkerGray">
                              {item.category}{" "}
                              <ChevronRightIcon className="inline w-2" />{" "}
                              {item.section}
                            </span>

                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default Search;
