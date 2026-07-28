"use client";

/*
  Docs topbar — styled to match the marketing site's header (Full port): a 64px
  sticky row that shrinks to 48px on scroll (logo 32px → 28px), centered nav,
  bg-background/95 + backdrop-blur, and shadcn-style CTAs. It keeps the docs'
  own functional content (section nav, ⌘K search, theme toggle, API/SDK
  dropdown) — same chrome and motion as agilitycms.com, docs-specific inside.
*/
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronDownIcon } from "@heroicons/react/solid";
import { MenuIcon } from "@heroicons/react/outline";
import ThemeControl from "../common/ThemeControl";
import { SearchButton } from "./SearchModal";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
} from "components/ui/dropdown-menu";
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
					<div className="w-full min-w-0 max-w-[200px] shrink">
						<SearchButton variant="topbar" />
					</div>
					<ThemeControl />
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
					<div className="hidden w-full max-w-[240px] md:block">
						<SearchButton variant="topbar" />
					</div>
					<div className="hidden sm:block">
						<ThemeControl />
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

const ApiSdkDropdown = ({
	primaryDropdownLinks,
	secondaryDropdownLinks,
}: {
	primaryDropdownLinks?: any[];
	secondaryDropdownLinks?: any[];
}) => (
	<DropdownMenu>
		<DropdownMenuTrigger className="flex items-center gap-1 whitespace-nowrap rounded-(--r-sm) px-2.5 py-2 text-sm font-medium text-(--text-2) transition-colors hover:bg-(--raised) hover:text-(--text) focus:outline-hidden data-[state=open]:bg-(--raised) data-[state=open]:text-(--text)">
			APIs &amp; SDKs
			<ChevronDownIcon className="h-4 w-4 text-(--primary)" aria-hidden="true" />
		</DropdownMenuTrigger>
		<DropdownMenuContent align="start">
			{(primaryDropdownLinks || []).map((l) => (
				<DropdownMenuItem key={l.href} asChild>
					<Link href={l.href}>{l.text}</Link>
				</DropdownMenuItem>
			))}
			{(secondaryDropdownLinks?.length ?? 0) > 0 && <DropdownMenuSeparator />}
			{(secondaryDropdownLinks || []).map((l) => (
				<DropdownMenuItem key={l.href} asChild>
					<Link href={l.href}>{l.text}</Link>
				</DropdownMenuItem>
			))}
		</DropdownMenuContent>
	</DropdownMenu>
);

const MobileMenu = ({
	navigation,
	primaryDropdownLinks,
	secondaryDropdownLinks,
}: {
	navigation: any[];
	primaryDropdownLinks?: any[];
	secondaryDropdownLinks?: any[];
}) => (
	<Sheet>
		<SheetTrigger className="inline-flex items-center justify-center rounded-(--r-sm) p-2 text-(--text-2) hover:bg-(--raised) focus:outline-hidden focus:ring-2 focus:ring-inset focus:ring-(--primary)">
			<span className="sr-only">Open menu</span>
			<MenuIcon className="block h-6 w-6" aria-hidden="true" />
		</SheetTrigger>
		<SheetContent side="left" title="Menu">
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
				<div className="mt-4 border-t border-(--border) pt-4">
					<div className="px-3 pb-2 font-mono text-[.66rem] uppercase tracking-[.14em] text-(--faint)">
						APIs &amp; SDKs
					</div>
					{[...(primaryDropdownLinks || []), ...(secondaryDropdownLinks || [])].map((l) => (
						<SheetClose asChild key={l.href}>
							<Link
								href={l.href}
								className="block rounded-(--r-sm) px-3 py-2 text-sm font-medium text-(--text-2) hover:bg-(--raised) hover:text-(--text)"
							>
								{l.text}
							</Link>
						</SheetClose>
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
