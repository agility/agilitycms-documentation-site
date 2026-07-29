"use client";

/*
  Docs topbar — styled to match the marketing site's header (Full port): a 64px
  sticky row that shrinks to 48px on scroll (logo 32px → 28px), centered nav,
  bg-background/95 + backdrop-blur, and shadcn-style CTAs. It keeps the docs'
  own functional content (section nav, ⌘K search, theme toggle, API/SDK
  dropdown) — same chrome and motion as agilitycms.com, docs-specific inside.
*/
import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronDownIcon } from "@heroicons/react/solid";
import { MenuIcon } from "@heroicons/react/outline";
import ThemeControl from "../common/ThemeControl";
import { SearchButton } from "./SearchModal";
import {
	classifyNav,
	resolveNavIcon,
	type NavCategory,
} from "./navIcons";
import { isNavHidden } from "lib/docs/legacyFrameworks";
import { Sheet, SheetTrigger, SheetContent, SheetClose } from "components/ui/sheet";

function classNames(...classes: string[]) {
	return classes.filter(Boolean).join(" ");
}

const SIGN_IN = { name: "Sign in", href: "https://manager.agilitycms.com/" };
const TRY_FREE = { name: "Try Free", href: "https://agilitycms.com/trial/" };

interface HeaderProps {
	mainMenuLinks: any[];
	primaryDropdownLinks?: any[];
	secondaryDropdownLinks?: any[];
}

export default function Header({
	mainMenuLinks,
	primaryDropdownLinks,
	secondaryDropdownLinks,
}: HeaderProps) {
	// Active section from the first path segment, so a top-level category
	// highlights for any page beneath it.
	const pathname = usePathname() || "/";
	const firstSegment = (p: string) => (p || "").split("/")[1] || "";
	const navigation = (mainMenuLinks || []).map((item: any) => ({
		...item,
		current: firstSegment(pathname) === firstSegment(item.href),
	}));

	// Scroll-shrink: flip a data-scrolled flag past a small threshold; the
	// bar/logo shrink is done purely with `group-data-[scrolled]` CSS variants
	// (matches the marketing site's HeaderScrollShell technique).
	const [scrolled, setScrolled] = useState(false);
	useEffect(() => {
		let raf = 0;
		const onScroll = () => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => setScrolled(window.scrollY > 8));
		};
		onScroll(); // sync on mount (restored scroll position)
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => {
			window.removeEventListener("scroll", onScroll);
			cancelAnimationFrame(raf);
		};
	}, []);

	return (
		<header
			id="Header"
			data-scrolled={scrolled ? "true" : "false"}
			className="group/header sticky top-0 z-50 shrink-0 border-b border-(--border) font-muli backdrop-blur transition-shadow duration-300 ease-out data-[scrolled=true]:shadow-sm"
			style={{ background: "color-mix(in srgb, var(--bg) 95%, transparent)" }}
		>
			<div className="mx-auto flex h-16 max-w-[90rem] items-center gap-3 px-4 transition-[height] duration-300 ease-out group-data-[scrolled=true]/header:h-12 sm:px-6 lg:px-8">
				<Link href="/" title="Agility Docs" className="flex shrink-0 items-center">
					<img
						className="block h-8 w-auto transition-[height] duration-300 ease-out group-data-[scrolled=true]/header:h-7"
						src="/docs/assets/agility-docs-logo.svg"
						alt="Agility CMS documentation"
					/>
				</Link>

				{/* Centered section nav — flexes the middle region and centers the nav
				    between the logo (left) and the actions (right), like the marketing
				    site. Inline nav needs >=xl to fit all sections. */}
				<div className="hidden min-w-0 flex-1 justify-center min-[1340px]:flex">
					<nav className="flex items-center gap-0.5" aria-label="Global">
						{navigation.map((item) => (
							<Link
								key={item.name}
								href={item.href}
								className={classNames(
									item.current
										? "text-(--primary)"
										: "text-(--text-2) hover:bg-(--raised) hover:text-(--text)",
									"whitespace-nowrap rounded-(--r-sm) px-2.5 py-2 text-sm font-medium transition-colors"
								)}
								aria-current={item.current ? "page" : undefined}
							>
								{item.name}
							</Link>
						))}
						<ApiSdkDropdown
							primaryDropdownLinks={primaryDropdownLinks}
							secondaryDropdownLinks={secondaryDropdownLinks}
						/>
					</nav>
				</div>

				{/* Desktop actions (>=1340px) */}
				<div className="hidden items-center gap-2 min-[1340px]:flex">
					<SearchButton variant="topbar" />
					<a
						href={SIGN_IN.href}
						target="_blank"
						rel="noreferrer"
						className="hidden h-8 items-center whitespace-nowrap rounded-(--r-sm) px-2.5 text-sm font-medium text-(--text-2) transition-colors hover:bg-(--raised) hover:text-(--text) min-[1440px]:inline-flex"
					>
						{SIGN_IN.name}
					</a>
					<a
						href={TRY_FREE.href}
						target="_blank"
						rel="noreferrer"
						className="btn-shimmer inline-flex h-8 items-center whitespace-nowrap rounded-(--r-sm) px-2.5 text-sm font-medium transition-[filter] hover:brightness-[.97]"
						style={{ color: "var(--on-color)", backgroundColor: "var(--tertiary)" }}
					>
						{TRY_FREE.name}
					</a>
				</div>

				{/* Compact actions + menu (< 1340px) */}
				<div className="ml-auto flex items-center gap-1 min-[1340px]:hidden">
					<div className="hidden sm:block">
						<SearchButton variant="topbar" />
					</div>
					<MobileMenu
						navigation={navigation}
						primaryDropdownLinks={primaryDropdownLinks}
						secondaryDropdownLinks={secondaryDropdownLinks}
					/>
				</div>
			</div>
		</header>
	);
}

type DropdownLink = { text: string; href: string; icon?: string };

type MegaLinkProps = {
	link: DropdownLink;
	cat: NavCategory;
	active: boolean;
	onNavigate?: () => void;
} & Omit<React.ComponentPropsWithoutRef<"a">, "href" | "className">;

// One mega-panel link row: brand/category icon box + label. The icon comes from
// the CMS (the Link item's `Icon` slug); resolveNavIcon falls back to inferring
// it from the text, then to a category default. Hover lifts both to the brand
// colour; the current page keeps a persistent tinted highlight.
//
// forwardRef so it can be the `asChild` target of Radix's SheetClose in the
// mobile menu (which needs the ref to wire up close-on-navigate).
const MegaLink = React.forwardRef<HTMLAnchorElement, MegaLinkProps>(
	({ link, cat, active, onNavigate, ...props }, ref) => {
		const Icon = resolveNavIcon({ icon: link.icon, text: link.text, category: cat });
		return (
			<Link
				ref={ref}
				href={link.href}
				aria-current={active ? "page" : undefined}
				className={classNames(
					"group/mega flex items-center gap-2.5 rounded-(--r-sm) px-2 py-1.5 text-sm font-medium transition-colors",
					active
						? "bg-(--raised) text-(--primary)"
						: "text-(--text-2) hover:bg-(--raised) hover:text-(--primary)"
				)}
				onClick={onNavigate}
				// Spread last: SheetClose (asChild) injects its own onClick to close
				// the sheet, which must win over onNavigate in the mobile menu.
				{...props}
			>
				<span
					className={classNames(
						"grid size-7 shrink-0 place-items-center rounded-(--r-sm) border transition-colors",
						active
							? "border-(--primary) bg-(--primary) text-(--on-color)"
							: "border-(--border) bg-(--raised) text-(--primary) group-hover/mega:border-(--primary)"
					)}
				>
					<Icon className="h-4 w-4" />
				</span>
				{link.text}
			</Link>
		);
	}
);
MegaLink.displayName = "MegaLink";

/**
 * Group the header's dropdown links into the three ordered categories, dropping
 * empties. Shared by the desktop mega panel and the mobile menu so both stay in
 * lockstep. Secondary links are the API column, so they default to "APIs".
 *
 * Archived/unready frameworks are filtered out here (lib/docs/legacyFrameworks)
 * so a single registry entry removes them from BOTH nav surfaces at once.
 */
const groupNavLinks = (
	primaryDropdownLinks?: DropdownLink[],
	secondaryDropdownLinks?: DropdownLink[]
): { key: NavCategory; links: DropdownLink[] }[] => {
	const grouped: Record<NavCategory, DropdownLink[]> = { APIs: [], SDKs: [], Frameworks: [] };
	for (const l of primaryDropdownLinks || []) {
		if (isNavHidden(l.href)) continue;
		grouped[classifyNav(l.text)].push(l);
	}
	for (const l of secondaryDropdownLinks || []) {
		if (isNavHidden(l.href)) continue;
		grouped.APIs.push(l);
	}
	return (["APIs", "SDKs", "Frameworks"] as NavCategory[])
		.map((key) => ({ key, links: grouped[key] }))
		.filter((c) => c.links.length > 0);
};

/**
 * APIs & SDKs — a mega menu that opens on HOVER (and click/focus for keyboard +
 * touch), ported from the marketing site's NavigationMenu: a floating, bordered,
 * elevated panel with a column per category (APIs · SDKs · Frameworks), each a
 * labelled header over icon rows. Each link's icon comes from its CMS `Icon`
 * slug (see navIcons); the category is still derived from the link text
 * (classifyNav) — secondary links default to APIs. A transparent `pt-2` bridge
 * keeps the trigger→panel hover path unbroken; a short close delay tolerates
 * the pointer crossing it.
 */
const ApiSdkDropdown = ({
	primaryDropdownLinks,
	secondaryDropdownLinks,
}: {
	primaryDropdownLinks?: DropdownLink[];
	secondaryDropdownLinks?: DropdownLink[];
}) => {
	const pathname = usePathname() || "/";
	const [open, setOpen] = useState(false);
	const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	const openNow = () => {
		if (closeTimer.current) clearTimeout(closeTimer.current);
		setOpen(true);
	};
	const closeSoon = () => {
		if (closeTimer.current) clearTimeout(closeTimer.current);
		closeTimer.current = setTimeout(() => setOpen(false), 120);
	};

	const columns = groupNavLinks(primaryDropdownLinks, secondaryDropdownLinks);

	const isActive = (href: string) => href !== "#" && pathname.startsWith(href);

	return (
		<div
			className="relative"
			onMouseEnter={openNow}
			onMouseLeave={closeSoon}
			onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
		>
			<button
				type="button"
				aria-expanded={open}
				aria-haspopup="menu"
				onClick={() => setOpen((o) => !o)}
				onFocus={openNow}
				data-state={open ? "open" : "closed"}
				className="flex items-center gap-1 whitespace-nowrap rounded-(--r-sm) px-2.5 py-2 text-sm font-medium text-(--text-2) transition-colors hover:bg-(--raised) hover:text-(--text) focus:outline-hidden data-[state=open]:bg-(--raised) data-[state=open]:text-(--text)"
			>
				APIs &amp; SDKs
				<ChevronDownIcon
					className={classNames(
						"h-4 w-4 text-(--primary) transition-transform duration-200",
						open ? "rotate-180" : ""
					)}
					aria-hidden="true"
				/>
			</button>

			{open && (
				<div className="absolute right-0 top-full z-50 pt-2">
					<div
						role="menu"
						className="flex w-max max-w-[calc(100vw-2rem)] gap-6 rounded-(--r-lg) border border-(--border) bg-(--surface) p-4 shadow-[var(--elev-3)]"
					>
						{columns.map((col) => (
							<div key={col.key} className="min-w-[12rem]">
								<div className="mb-1.5 px-2 font-mono text-[.66rem] uppercase tracking-[.14em] text-(--faint)">
									{col.key}
								</div>
								<ul className="grid gap-0.5">
									{col.links.map((l) => (
										<li key={l.href}>
											<MegaLink
												link={l}
												cat={col.key}
												active={isActive(l.href)}
												onNavigate={() => setOpen(false)}
											/>
										</li>
									))}
								</ul>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};

const MobileMenu = ({
	navigation,
	primaryDropdownLinks,
	secondaryDropdownLinks,
}: {
	navigation: any[];
	primaryDropdownLinks?: any[];
	secondaryDropdownLinks?: any[];
}) => {
	const pathname = usePathname() || "/";
	const isActive = (href: string) => href !== "#" && pathname.startsWith(href);
	const columns = groupNavLinks(primaryDropdownLinks, secondaryDropdownLinks);

	return (
	<Sheet>
		<SheetTrigger className="inline-flex items-center justify-center rounded-(--r-sm) p-2 text-(--text-2) hover:bg-(--raised) focus:outline-hidden focus:ring-2 focus:ring-inset focus:ring-(--primary)">
			<span className="sr-only">Open menu</span>
			<MenuIcon className="block h-6 w-6" aria-hidden="true" />
		</SheetTrigger>
		{/* Opens from the right so the panel emerges from under the trigger,
		    which sits at the right end of the bar. */}
		<SheetContent side="right" title="Menu">
			<div className="px-4 py-4">
				<div className="mb-4">
					<SearchButton variant="sheet" />
				</div>
				<nav aria-label="Global">
					{navigation.map((item) => (
						<SheetClose asChild key={item.href}>
							<Link
								href={item.href}
								className={classNames(
									item.current
										? "bg-(--raised) text-(--text)"
										: "text-(--text-2) hover:bg-(--raised) hover:text-(--text)",
									"block rounded-(--r-sm) px-3 py-2 text-base font-semibold"
								)}
								aria-current={item.current ? "page" : undefined}
							>
								{item.name}
							</Link>
						</SheetClose>
					))}
				</nav>
				{/* APIs & SDKs — same grouped, icon-led treatment as the desktop mega
				    panel (shared groupNavLinks + MegaLink), stacked for narrow widths. */}
				<div className="mt-4 space-y-4 border-t border-(--border) pt-4">
					{columns.map((col) => (
						<div key={col.key}>
							<div className="px-3 pb-1.5 font-mono text-[.66rem] uppercase tracking-[.14em] text-(--faint)">
								{col.key}
							</div>
							<ul className="m-0 grid list-none gap-0.5 px-1 p-0">
								{col.links.map((l) => (
									<li key={l.href}>
										<SheetClose asChild>
											<MegaLink link={l} cat={col.key} active={isActive(l.href)} />
										</SheetClose>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
				<div className="mt-6 flex items-center justify-between gap-3 px-3">
					<ThemeControl />
					<a
						href={SIGN_IN.href}
						target="_blank"
						rel="noreferrer"
						className="text-sm font-semibold text-(--text-2) hover:text-(--primary)"
					>
						{SIGN_IN.name}
					</a>
				</div>
				<div className="mt-4 px-3">
					<a
						href={TRY_FREE.href}
						target="_blank"
						rel="noreferrer"
						className="block rounded-(--r-sm) py-2 text-center text-[.9rem] font-bold"
						style={{ color: "var(--on-color)", backgroundColor: "var(--tertiary)" }}
					>
						{TRY_FREE.name}
					</a>
				</div>
			</div>
		</SheetContent>
	</Sheet>
	);
};
