"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/outline";

import algoliasearch from "algoliasearch/lite";
import { createAutocomplete } from "@algolia/autocomplete-core";
import { getAlgoliaResults } from "@algolia/autocomplete-preset-algolia";
import { renderHTML } from "@agility/nextjs";

// Lazily create the Algolia client: algoliasearch() shuffles its host list
// with Math.random() at construction, which Cache Components forbids during
// prerender/SSR. All call sites run at event time (user typing), never SSR.
let _searchClient = null;
const getSearchClient = () => {
  if (!_searchClient) {
    _searchClient = algoliasearch(
      process.env.NEXT_PUBLIC_ALGOLIA_APP_ID,
      process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY
    );
  }
  return _searchClient;
};

const HITS_PER_PAGE = 10;

const getDescription = (item) => {
  if (item._snippetResult?.body && item._snippetResult.body.matchLevel !== "none") {
    return item._snippetResult.body.value;
  }
  return item._highlightResult?.description?.value || null;
};

const SearchResultItem = ({ item, description }) => (
  <Link href={item.url} className="SearchResult px-5 py-2 block w-full hover:bg-(--raised)">
    <span
      className="SearchResult__title block text-(--primary) text-sm font-bold"
      dangerouslySetInnerHTML={renderHTML(item._highlightResult.title.value)}
    ></span>
    {description && (
      <span
        className="SearchResult__description block text-sm mb-2 text-(--text-2)"
        dangerouslySetInnerHTML={renderHTML(description)}
      ></span>
    )}
    <span className="SearchResult__category-section block text-xs text-(--muted)">
      {item.category} <ChevronRightIcon className="inline w-2" /> {item.section}
    </span>
  </Link>
);

const Search = () => {
  const inputRef = useRef(null);
  const sentinelRef = useRef(null);
  const listRef = useRef(null);
  const [autocompleteState, setAutocompleteState] = useState({});
  const [extraItems, setExtraItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const hasMoreRef = useRef(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalHits, setTotalHits] = useState(0);
  const queryRef = useRef("");

  const autocomplete = React.useMemo(
    () =>
      createAutocomplete({
        onStateChange({ state }) {
          setAutocompleteState(state);
        },
        getSources() {
          return [
            {
              sourceId: "articles",
              getItemInputValue({ item }) {
                return item.query;
              },
              getItems({ query }) {
                return getAlgoliaResults({
                  searchClient: getSearchClient(),
                  queries: [
                    {
                      indexName: "doc_site",
                      query,
                      params: {
                        hitsPerPage: HITS_PER_PAGE,
                        page: 0,
                        highlightPreTag: "<mark>",
                        highlightPostTag: "</mark>",
                        attributesToSnippet: ["body:30"],
                        snippetEllipsisText: "\u2026",
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

  // Reset pagination and fetch total hit count when query changes
  const initialItems = autocompleteState.collections?.[0]?.items || [];
  const currentQuery = autocompleteState.query || "";
  useEffect(() => {
    const isNewQuery = currentQuery !== queryRef.current;
    if (isNewQuery) {
      queryRef.current = currentQuery;
      setExtraItems([]);
      setCurrentPage(0);
      setHasMore(false);
      hasMoreRef.current = false;
      setTotalHits(0);
    }
    if (currentQuery && initialItems.length > 0) {
      const more = initialItems.length >= HITS_PER_PAGE;
      setHasMore(more);
      hasMoreRef.current = more;
      if (isNewQuery) {
        getSearchClient()
          .search([{ indexName: "doc_site", query: currentQuery, params: { hitsPerPage: 0 } }])
          .then((response) => {
            if (queryRef.current === currentQuery) {
              setTotalHits(response.results[0].nbHits);
            }
          })
          .catch(() => {});
      }
    }
  }, [currentQuery, initialItems.length]);

  const loadMore = useCallback(async () => {
    const query = queryRef.current;
    if (isLoadingMore || !hasMoreRef.current || !query) return;
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    try {
      const response = await getSearchClient().search([
        {
          indexName: "doc_site",
          query,
          params: {
            hitsPerPage: HITS_PER_PAGE,
            page: nextPage,
            highlightPreTag: "<mark>",
            highlightPostTag: "</mark>",
            attributesToSnippet: ["body:30"],
            snippetEllipsisText: "\u2026",
          },
        },
      ]);
      const result = response.results[0];
      setExtraItems((prev) => [...prev, ...result.hits]);
      setCurrentPage(nextPage);
      const more = nextPage < result.nbPages - 1;
      setHasMore(more);
      hasMoreRef.current = more;
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentPage, isLoadingMore]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const list = listRef.current;
    if (!sentinel || !list || !autocompleteState.isOpen || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { root: list, rootMargin: "100px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [autocompleteState.isOpen, hasMore, loadMore]);

  return (
    <div className="aa-Autocomplete" {...autocomplete.getRootProps({})}>
      <form
        className="aa-Form"
        {...autocomplete.getFormProps({ inputElement: inputRef.current })}
      >
        <input
          className="block w-full border border-(--border) pt-2 pb-1.5 pl-10 pr-3 text-sm placeholder-(--muted) bg-(--raised) text-(--text) focus:outline-hidden focus:border-(--primary) focus:ring-1 focus:ring-(--primary) sm:text-sm"
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
                className="aa-Source absolute bg-(--surface) text-(--text) z-50 border border-(--border) w-full"
              >
                {items.length > 0 && (
                  <ul
                    ref={listRef}
                    className="aa-List custom-shadow max-h-[70vh] overflow-y-auto"
                    {...autocomplete.getListProps()}
                  >
                    {totalHits > 0 && (
                      <li className="px-5 py-2 text-xs text-(--muted) border-b border-(--border) sticky top-0 bg-(--surface)">
                        Showing {items.length + extraItems.length} of {totalHits} results
                      </li>
                    )}
                    {items.map((item) => (
                      <li
                        key={item.objectID}
                        className="aa-Item"
                        {...autocomplete.getItemProps({ item, source })}
                      >
                        <SearchResultItem
                          item={item}
                          description={getDescription(item)}
                        />
                      </li>
                    ))}
                    {extraItems.map((item) => (
                      <li key={item.objectID} className="aa-Item">
                        <SearchResultItem
                          item={item}
                          description={getDescription(item)}
                        />
                      </li>
                    ))}
                    {hasMore && (
                      <li
                        ref={sentinelRef}
                        className="py-3 text-center text-xs text-(--faint)"
                      >
                        {isLoadingMore ? "Loading more..." : ""}
                      </li>
                    )}
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
