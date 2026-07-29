"use client";

/*
  ⌘K search modal (Stripe/Vercel docs pattern). A rich, centered command
  palette over the Algolia index: debounced search, grouped result cards
  with highlighted matches, full keyboard navigation, infinite scroll.

  Structured for the future "Ask AI" agent experience (rebuild plan Phase
  5b): `mode` switches the panel body — an 'ask' mode can stream an agent
  answer over the docs MCP tools without touching the shell.
*/
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SearchIcon } from "@heroicons/react/solid";
import { ChevronRightIcon } from "@heroicons/react/outline";
import algoliasearch from "algoliasearch/lite";
import { renderHTML } from "@agility/nextjs";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "components/ui/dialog";
import { track } from "lib/analytics/posthog";
import { sendAlgoliaClick } from "lib/analytics/algoliaInsights";

// Lazily create the Algolia client: algoliasearch() shuffles its host list
// with Math.random() at construction, which Cache Components forbids during
// prerender/SSR. All call sites run at event time (user typing), never SSR.
let _searchClient: any = null;
const getSearchClient = () => {
	if (!_searchClient) {
		_searchClient = algoliasearch(
			process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
			process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY!
		);
	}
	return _searchClient;
};

const HITS_PER_PAGE = 15;

const SEARCH_PARAMS = {
	hitsPerPage: HITS_PER_PAGE,
	highlightPreTag: "<mark>",
	highlightPostTag: "</mark>",
	attributesToSnippet: ["body:26"],
	snippetEllipsisText: "…",
	// Returns a queryID with each response so result clicks can be attributed
	// in Algolia's click analytics (see lib/analytics/algoliaInsights.ts).
	clickAnalytics: true,
};

// Shown before the user types — the front doors of the docs.
const QUICK_LINKS = [
	{ title: "Introduction to Agility", url: "/docs/editors/introduction-to-agility-cms", crumb: "Editors" },
	{ title: "Getting Started with Web Studio", url: "/docs/overview/web-studio", crumb: "Overview" },
	{ title: "Agility CMS MCP Server", url: "/docs/developers/agility-cms-mcp-server", crumb: "Developers" },
	{ title: "Developer Changelog", url: "/docs/changelog", crumb: "Platform" },
];

const getSnippet = (item: any) => {
	if (item._snippetResult?.body && item._snippetResult.body.matchLevel !== "none") {
		return item._snippetResult.body.value;
	}
	return item._highlightResult?.description?.value || null;
};

export const SearchButton = ({ variant = "topbar" }: { variant?: "topbar" | "sheet" }) => {
	const [open, setOpen] = useState(false);
	const [isMac, setIsMac] = useState(true);

	useEffect(() => {
		setIsMac(!/windows/i.test(navigator.userAgent));
		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				setOpen((o) => !o);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			{variant === "topbar" ? (
				// Collapsed to just the icon; expands to the full field on hover or
				// keyboard focus. The relative w-9 wrapper reserves only the icon's
				// footprint, and the trigger expands as an absolute overlay (grows
				// leftward, right-anchored) so the expansion never reflows the header.
				<div className="relative h-9 w-9 shrink-0">
					<DialogTrigger
						aria-label="Search docs"
						className="group/search absolute right-0 top-0 z-10 flex h-9 w-9 items-center gap-2 overflow-hidden rounded-(--r-sm) border border-(--border-strong) bg-(--surface) px-2.5 text-[.82rem] text-(--muted) transition-[width,padding,border-color] duration-200 ease-out hover:w-48 hover:border-(--primary) hover:px-3 focus-visible:w-48 focus-visible:border-(--primary) focus:outline-hidden"
					>
						<SearchIcon className="h-4 w-4 shrink-0 text-(--faint)" aria-hidden="true" />
						<span className="min-w-0 flex-1 truncate whitespace-nowrap text-left opacity-0 transition-opacity duration-150 group-hover/search:opacity-100 group-focus-visible/search:opacity-100">
							Search docs...
						</span>
						<kbd className="shrink-0 rounded-(--r-xs) border border-(--border) bg-(--raised) px-1.5 py-px font-mono text-[.68rem] text-(--muted) opacity-0 transition-opacity duration-150 group-hover/search:opacity-100 group-focus-visible/search:opacity-100">
							{isMac ? "⌘K" : "Ctrl K"}
						</kbd>
					</DialogTrigger>
				</div>
			) : (
				<DialogTrigger
					className="flex w-full items-center gap-2 rounded-(--r-sm) border border-(--border-strong) bg-(--surface) px-3 py-2.5 text-sm text-(--muted) focus:outline-hidden"
					aria-label="Search docs"
				>
					<SearchIcon className="h-4 w-4 text-(--faint)" aria-hidden="true" />
					<span className="truncate">Search docs...</span>
					<kbd className="ml-auto rounded-(--r-xs) border border-(--border) bg-(--raised) px-1.5 py-px font-mono text-[.68rem] text-(--muted)">
						{isMac ? "⌘K" : "Ctrl K"}
					</kbd>
				</DialogTrigger>
			)}
			{open && <SearchPanel close={() => setOpen(false)} />}
		</Dialog>
	);
};

const SearchPanel = ({ close }: { close: () => void }) => {
	const router = useRouter();
	const pathname = usePathname();
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const sentinelRef = useRef<HTMLLIElement>(null);
	const queryRef = useRef("");
	const [query, setQuery] = useState("");
	const [hits, setHits] = useState<any[]>([]);
	const [totalHits, setTotalHits] = useState(0);
	const [page, setPage] = useState(0);
	const [hasMore, setHasMore] = useState(false);
	const [activeIndex, setActiveIndex] = useState(0);
	// Future agent experience switches on this — 'search' today, 'ask' next.
	const [mode] = useState("search");

	// Close on client-side navigation completing.
	const startPathname = useRef(pathname);
	useEffect(() => {
		if (pathname !== startPathname.current) close();
	}, [pathname, close]);

	// Debounced search.
	useEffect(() => {
		queryRef.current = query;
		if (!query) {
			setHits([]);
			setTotalHits(0);
			setHasMore(false);
			setActiveIndex(0);
			return;
		}
		const t = setTimeout(async () => {
			try {
				const response = await getSearchClient().search([
					{ indexName: "doc_site", query, params: { ...SEARCH_PARAMS, page: 0 } },
				]);
				if (queryRef.current !== query) return;
				const result = response.results[0];
				// Stamp each hit with the queryID so a later click can be attributed
				// to the search that surfaced it (Algolia click analytics).
				setHits(result.hits.map((h: any) => ({ ...h, __queryID: result.queryID })));
				setTotalHits(result.nbHits);
				setPage(0);
				setHasMore(result.nbPages > 1);
				setActiveIndex(0);
				if (query.trim().length >= 2) {
					track("docs_search", { query, results: result.nbHits });
				}
			} catch (e) {
				// network hiccup — keep the previous results on screen
			}
		}, 150);
		return () => clearTimeout(t);
	}, [query]);

	const loadMore = useCallback(async () => {
		const q = queryRef.current;
		if (!q || !hasMore) return;
		const nextPage = page + 1;
		const response = await getSearchClient().search([
			{ indexName: "doc_site", query: q, params: { ...SEARCH_PARAMS, page: nextPage } },
		]);
		if (queryRef.current !== q) return;
		const result = response.results[0];
		setHits((prev) => [
			...prev,
			...result.hits.map((h: any) => ({ ...h, __queryID: result.queryID })),
		]);
		setPage(nextPage);
		setHasMore(nextPage < result.nbPages - 1);
	}, [page, hasMore]);

	// Infinite scroll inside the panel.
	useEffect(() => {
		const sentinel = sentinelRef.current;
		const list = listRef.current;
		if (!sentinel || !list || !hasMore) return;
		const observer = new IntersectionObserver(
			(entries) => entries[0].isIntersecting && loadMore(),
			{ root: list, rootMargin: "120px" }
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [hasMore, loadMore]);

	const items: any[] = query
		? hits.map((h) => ({ title: null, hit: h, url: h.url }))
		: QUICK_LINKS.map((q) => ({ quick: q, url: q.url }));

	const go = (url: string) => {
		if (!url) return;
		close();
		// index URLs are absolute site paths including /docs
		router.push(url.replace(/^https?:\/\/[^/]+/, "").replace(/^\/docs/, "") || "/");
	};

	// Fire analytics for the chosen item, then navigate. Position is the
	// 1-based rank in the accumulated result list (matches Algolia's absolute
	// position across pages).
	const onSelect = (item: any, idx: number) => {
		if (item?.hit) {
			track("docs_search_result_click", {
				query: queryRef.current,
				object_id: item.hit.objectID,
				position: idx + 1,
				url: item.hit.url,
				category: item.hit.category,
				section: item.hit.section,
			});
			sendAlgoliaClick({
				objectID: item.hit.objectID,
				position: idx + 1,
				queryID: item.hit.__queryID,
			});
		} else if (item?.quick) {
			track("docs_quicklink_click", { title: item.quick.title, url: item.quick.url });
		}
		go(item.url);
	};

	// Arrow keys move real DOM focus (like Tab), not just the highlight —
	// the button's onFocus keeps activeIndex in sync for both.
	const focusItem = (idx: number) => {
		listRef.current?.querySelector<HTMLButtonElement>(`[data-index="${idx}"] button`)?.focus();
	};

	const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			focusItem(0);
		} else if (e.key === "Enter") {
			e.preventDefault();
			onSelect(items[activeIndex], activeIndex);
		}
	};

	const onListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			focusItem(Math.min(activeIndex + 1, items.length - 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			if (activeIndex <= 0) {
				inputRef.current?.focus();
			} else {
				focusItem(activeIndex - 1);
			}
		} else if (e.key === "Backspace") {
			e.preventDefault();
			setQuery((q) => q.slice(0, -1));
			inputRef.current?.focus();
		} else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
			// Typing while a result is focused resumes the search.
			e.preventDefault();
			setQuery((q) => q + e.key);
			inputRef.current?.focus();
		}
	};

	return (
		<DialogContent
			className="search-modal top-[10vh] max-w-2xl translate-y-0 overflow-hidden p-0 font-muli"
			onOpenAutoFocus={(e) => {
				e.preventDefault();
				inputRef.current?.focus();
			}}
		>
			<DialogTitle className="sr-only">Search documentation</DialogTitle>

			{/* Input row */}
			<div className="flex items-center gap-3 border-b border-(--border) px-4 py-3.5">
				<SearchIcon className="h-5 w-5 flex-none text-(--faint)" aria-hidden="true" />
				<input
					ref={inputRef}
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onKeyDown={onInputKeyDown}
					onFocus={() => setActiveIndex(0)}
					placeholder="Search the docs..."
					aria-label="Search the docs"
					className="w-full bg-transparent text-[1.05rem] text-(--text) placeholder-(--muted)"
				/>
				{query && totalHits > 0 && (
					<span className="flex-none whitespace-nowrap font-mono text-[.68rem] text-(--faint)">
						{totalHits} results
					</span>
				)}
			</div>

			{/* Results */}
			{mode === "search" && (
				<div
					ref={listRef}
					onKeyDown={onListKeyDown}
					className="max-h-[55vh] overflow-y-auto overscroll-contain"
				>
					{!query && (
						<div className="px-4 pb-1 pt-3 font-mono text-[.66rem] uppercase tracking-[.14em] text-(--faint)">
							Start here
						</div>
					)}
					{query && hits.length === 0 && (
						<div className="px-4 py-10 text-center text-sm text-(--muted)">
							No results for “{query}”
						</div>
					)}
					<ul className="m-0 list-none p-2">
						{items.map((item, idx) => (
							<li key={item.hit?.objectID || item.quick?.url} data-index={idx}>
								<button
									type="button"
									onClick={() => onSelect(item, idx)}
									onMouseMove={() => setActiveIndex(idx)}
									onFocus={() => setActiveIndex(idx)}
									className={`block w-full rounded-(--r-sm) px-3 py-2.5 text-left focus:outline-hidden ${
										idx === activeIndex ? "bg-(--raised)" : ""
									}`}
								>
									{item.hit ? (
										<>
											<span
												className="block text-[.95rem] font-bold text-(--primary)"
												dangerouslySetInnerHTML={renderHTML(
													item.hit._highlightResult?.title?.value || item.hit.title
												)}
											/>
											{getSnippet(item.hit) && (
												<span
													className="mt-0.5 block text-sm leading-normal text-(--text-2)"
													dangerouslySetInnerHTML={renderHTML(getSnippet(item.hit))}
												/>
											)}
											<span className="mt-1 flex items-center gap-1 font-mono text-[.66rem] uppercase tracking-[.12em] text-(--faint)">
												{item.hit.category}
												<ChevronRightIcon className="inline h-2.5 w-2.5" />
												{item.hit.section}
											</span>
										</>
									) : (
										<>
											<span className="block text-[.95rem] font-bold text-(--primary)">
												{item.quick.title}
											</span>
											<span className="mt-0.5 block font-mono text-[.66rem] uppercase tracking-[.12em] text-(--faint)">
												{item.quick.crumb}
											</span>
										</>
									)}
								</button>
							</li>
						))}
						{hasMore && (
							<li ref={sentinelRef} className="py-3 text-center text-xs text-(--faint)">
								Loading more…
							</li>
						)}
					</ul>
				</div>
			)}

			{/* Footer: keyboard hints + the future agent affordance */}
			<div className="flex items-center justify-between border-t border-(--border) bg-(--raised) px-4 py-2.5">
				<div className="flex items-center gap-3 font-mono text-[.68rem] text-(--muted)">
					<span>
						<Kbd>↑</Kbd> <Kbd>↓</Kbd> navigate
					</span>
					<span>
						<Kbd>↵</Kbd> open
					</span>
					<span>
						<Kbd>esc</Kbd> close
					</span>
				</div>
				<span
					className="flex items-center gap-1.5 font-mono text-[.68rem] text-(--faint)"
					title="Ask the docs with AI — coming soon"
				>
					<span aria-hidden="true" style={{ color: "var(--tertiary-dim)" }}>✦</span>
					Ask AI — coming soon
				</span>
			</div>
		</DialogContent>
	);
};

const Kbd = ({ children }: { children: React.ReactNode }) => (
	<kbd className="rounded-(--r-xs) border border-(--border) bg-(--surface) px-1 py-px">
		{children}
	</kbd>
);

export default SearchButton;
