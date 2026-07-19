"use client";

/*
  Ocean docs topbar (mockup `.topbar`): ONE lean 60px sticky row — logo,
  section nav inline, search, theme control, quiet CTAs. Follows the
  Stripe/Vercel docs pattern: same brand tokens as marketing, but a
  functional, denser chrome — no marketing banner, no mega-menu.
*/
import React from "react";
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

	return (
		<header
			id="Header"
			className="sticky top-0 z-40 shrink-0 border-b border-(--border) font-muli backdrop-blur-[10px]"
			style={{ background: "color-mix(in srgb, var(--bg) 82%, transparent)" }}
		>
			<div className="mx-auto flex h-[60px] max-w-[1400px] items-center gap-1.5 px-4 lg:px-5 min-[1340px]:gap-3 min-[1340px]:px-6">
				{/* Mobile/compact menu (inline nav needs >=xl to fit) */}
				<div className="xl:hidden">
					<MobileMenu
						navigation={navigation}
						primaryDropdownLinks={primaryDropdownLinks}
						secondaryDropdownLinks={secondaryDropdownLinks}
					/>
				</div>

				<Link href="/" title="Agility Docs" className="flex shrink-0 items-center">
					<img
						className="block h-7 w-auto"
						src="/docs/assets/agility-docs-logo.svg"
						alt="Agility CMS documentation"
					/>
				</Link>

				{/* Section nav (mockup .topnav) */}
				<nav className="hidden items-center gap-0.5 xl:flex min-[1340px]:ml-2 min-[1340px]:gap-1" aria-label="Global">
					{navigation.map((item) => (
						<Link
							key={item.name}
							href={item.href}
							className={classNames(
								item.current
									? "text-(--primary)"
									: "text-(--text-2) hover:bg-(--raised) hover:text-(--text)",
								"whitespace-nowrap rounded-(--r-sm) px-2.5 py-1.5 text-[.9rem] font-semibold min-[1340px]:px-3"
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

				<div className="flex-1" />

				{/* Search opens the ⌘K modal */}
				<div className="hidden w-full min-w-[100px] max-w-[280px] shrink md:block">
					<SearchButton variant="topbar" />
				</div>

				<div className="hidden sm:block">
					<ThemeControl />
				</div>

				<a
					href={SIGN_IN.href}
					target="_blank"
					rel="noreferrer"
					className="hidden whitespace-nowrap rounded-(--r-sm) px-3 py-1.5 text-[.9rem] font-semibold text-(--text-2) hover:bg-(--raised) hover:text-(--text) min-[1440px]:block"
				>
					{SIGN_IN.name}
				</a>
				<a
					href={TRY_FREE.href}
					target="_blank"
					rel="noreferrer"
					className="hidden whitespace-nowrap rounded-(--r-sm) px-3 py-1.5 text-[.875rem] font-bold custom-hover sm:block min-[1340px]:px-3.5"
					style={{ color: "var(--on-color)", backgroundColor: "var(--tertiary)" }}
				>
					{TRY_FREE.name}
				</a>
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
		<DropdownMenuTrigger className="flex items-center gap-1 whitespace-nowrap rounded-(--r-sm) px-2.5 py-1.5 min-[1340px]:px-3 text-[.9rem] font-semibold text-(--text-2) hover:bg-(--raised) hover:text-(--text) focus:outline-hidden data-[state=open]:bg-(--raised) data-[state=open]:text-(--text)">
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
