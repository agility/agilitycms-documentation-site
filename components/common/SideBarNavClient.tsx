"use client";

/* Sidebar navigation UI (client), mockup `.sidebar` style: mono uppercase
   group eyebrows (collapsible — categories are large), quiet links, and a
   primary-tinted current state. Data comes from the SideBarNav server
   component (agility-pageModules). */
import { useState } from "react";
import Link from "next/link";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronRightIcon } from "@heroicons/react/outline";
import { Sheet, SheetTrigger, SheetContent, SheetClose } from "components/ui/sheet";

function classNames(...classes: string[]) {
	return classes.filter(Boolean).join(" ");
}

type LinkWrapComponent = React.ComponentType<{ children: React.ReactNode }>;

const itemClass = (current: boolean) =>
	classNames(
		current
			? "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] font-bold text-(--primary-text)"
			: "font-medium text-(--text-2) hover:bg-(--raised) hover:text-(--text)",
		"block rounded-(--r-sm) px-3 py-1.5 text-[.9rem]"
	);

// One collapsible group. `LinkWrap` lets the mobile Sheet close on
// navigation while the desktop tree renders plain links.
const NavSection = ({ item, LinkWrap }: { item: any; LinkWrap: LinkWrapComponent }) => {
	const [open, setOpen] = useState(item.children.some((subItem: any) => subItem.current));

	return (
		<Collapsible.Root open={open} onOpenChange={setOpen}>
			<Collapsible.Trigger className="group mb-1 mt-5 flex w-full items-center gap-2 text-left font-mono text-[.66rem] uppercase tracking-[.14em] text-(--faint) transition-colors hover:text-(--text) focus:outline-hidden">
				<span className="whitespace-nowrap">{item.name}</span>
				<span
					aria-hidden="true"
					className="h-px flex-1 bg-(--border) transition-colors group-hover:bg-(--border-strong)"
				/>
				<ChevronRightIcon
					className={classNames(
						open ? "rotate-90" : "",
						"h-3 w-3 shrink-0 text-(--faint) transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-(--primary-text)"
					)}
					aria-hidden="true"
				/>
			</Collapsible.Trigger>
			<Collapsible.Content className="space-y-0.5">
				{item.children.map((subItem: any) => (
					<LinkWrap key={subItem.name}>
						<Link
							href={subItem.href}
							className={itemClass(!!subItem.current)}
							aria-current={subItem.current ? "page" : undefined}
						>
							{subItem.name}
						</Link>
					</LinkWrap>
				))}
			</Collapsible.Content>
		</Collapsible.Root>
	);
};

const NavTree = ({ navigation, LinkWrap }: { navigation: any[]; LinkWrap: LinkWrapComponent }) => (
	<nav className="flex-1" aria-label="Sidebar">
		{navigation.map((item: any) =>
			!item.children ? (
				<LinkWrap key={item.name}>
					<Link
						href={item.href}
						className={itemClass(!!item.current)}
						aria-current={item.current ? "page" : undefined}
					>
						{item.name}
					</Link>
				</LinkWrap>
			) : (
				<NavSection key={item.name} item={item} LinkWrap={LinkWrap} />
			)
		)}
	</nav>
);

const PlainWrap = ({ children }: { children: React.ReactNode }) => children;
const CloseWrap = ({ children }: { children: React.ReactNode }) => <SheetClose asChild>{children}</SheetClose>;

const SideBarNavClient = ({ navigation }: { navigation: any[] }) => {
	return (
		<>
			{/* Mobile: floating trigger + slide-over sheet */}
			<div className="lg:hidden">
				<Sheet>
					<SheetTrigger
						className="fixed left-2 top-[65px] z-40 flex items-center justify-center w-9 h-9 bg-(--surface) rounded-full shadow-md hover:shadow-lg text-(--muted) hover:text-(--primary-text) focus:outline-hidden focus:ring-2 focus:ring-(--primary) focus:ring-offset-1 transition-all duration-200"
						aria-label="Open navigation menu"
					>
						<ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
					</SheetTrigger>
					<SheetContent side="left" title="Navigation">
						<div className="px-4 pt-4 pb-8">
							<NavTree navigation={navigation} LinkWrap={CloseWrap} />
						</div>
					</SheetContent>
				</Sheet>
			</div>

			{/* Desktop sidebar (mockup .sidebar: sticky under the 60px topbar) */}
			<div
				id="SideNav"
				className="hidden lg:block sticky top-[60px] h-[calc(100vh-60px)] overflow-y-auto scrollbar-thin font-muli pt-8 pb-10 pr-2"
			>
				<NavTree navigation={navigation} LinkWrap={PlainWrap} />
			</div>
		</>
	);
};

export default SideBarNavClient;
