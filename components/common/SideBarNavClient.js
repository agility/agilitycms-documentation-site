"use client";

/* Sidebar navigation UI (client): Radix Collapsible tree + mobile Sheet.
   Data comes from the SideBarNav server component (agility-pageModules). */
import { useState } from "react";
import Link from "next/link";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronRightIcon } from "@heroicons/react/outline";
import { Sheet, SheetTrigger, SheetContent, SheetClose } from "components/ui/sheet";

function classNames(...classes) {
	return classes.filter(Boolean).join(" ");
}

// One collapsible section of the tree. `LinkWrap` lets the mobile Sheet close
// on navigation while the desktop tree renders plain links.
const NavSection = ({ item, LinkWrap }) => {
	const [open, setOpen] = useState(item.children.some((subItem) => subItem.current));

	return (
		<Collapsible.Root open={open} onOpenChange={setOpen} className="space-y-1">
			<Collapsible.Trigger
				className={classNames(
					item.current ? "bg-(--raised) text-(--text)" : "text-(--text-2) hover:text-(--primary)",
					"group w-full flex items-center pr-2 py-2 text-left text-sm font-medium rounded-md focus:outline-hidden px-8"
				)}
			>
				<svg
					className={classNames(
						open ? "text-(--muted) rotate-90" : "text-(--faint)",
						"mr-2 shrink-0 h-5 w-5 transform group-hover:text-(--muted) transition-colors ease-in-out duration-150"
					)}
					viewBox="0 0 20 20"
					aria-hidden="true"
				>
					<path d="M6 6L14 10L6 14V6Z" fill="currentColor" />
				</svg>
				<span className={`${open ? `text-(--text)` : `text-(--text-2)`} hover:text-(--primary)`}>
					{item.name}
				</span>
			</Collapsible.Trigger>
			<Collapsible.Content className="py-2 space-y-1 bg-(--surface)">
				{item.children.map((subItem) => (
					<LinkWrap key={subItem.name}>
						<Link
							href={subItem.href}
							className={classNames(
								subItem.current ? " text-(--primary)" : " text-(--text-2) hover:text-(--primary) ",
								"group w-full flex items-center pl-16 pr-2 py-2 text-sm font-medium rounded-md"
							)}
						>
							{subItem.name}
						</Link>
					</LinkWrap>
				))}
			</Collapsible.Content>
		</Collapsible.Root>
	);
};

const NavTree = ({ navigation, LinkWrap }) => (
	<nav className="flex-1 space-y-1" aria-label="Sidebar">
		{navigation.map((item) =>
			!item.children ? (
				<div key={item.name} className="px-8">
					<LinkWrap>
						<Link
							href={item.href}
							className={classNames(
								item.current
									? "text-(--text) font-semibold"
									: "text-(--text-2) hover:text-(--primary)",
								"group w-full flex items-center pl-7 pr-2 py-2 text-sm font-medium rounded-md"
							)}
						>
							{item.name}
						</Link>
					</LinkWrap>
				</div>
			) : (
				<NavSection key={item.name} item={item} LinkWrap={LinkWrap} />
			)
		)}
	</nav>
);

const PlainWrap = ({ children }) => children;
const CloseWrap = ({ children }) => <SheetClose asChild>{children}</SheetClose>;

const SideBarNavClient = ({ navigation }) => {
	return (
		<>
			{/* Mobile: floating trigger + slide-over sheet */}
			<div className="lg:hidden">
				<Sheet>
					<SheetTrigger
						className="fixed left-2 top-[65px] z-40 flex items-center justify-center w-9 h-9 bg-(--surface) rounded-full shadow-md hover:shadow-lg text-(--muted) hover:text-(--primary) focus:outline-hidden focus:ring-2 focus:ring-(--primary) focus:ring-offset-1 transition-all duration-200"
						aria-label="Open navigation menu"
					>
						<ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
					</SheetTrigger>
					<SheetContent side="left" title="Navigation">
						<div className="pt-4 pb-4">
							<NavTree navigation={navigation} LinkWrap={CloseWrap} />
						</div>
					</SheetContent>
				</Sheet>
			</div>

			{/* Desktop sidebar */}
			<div
				id="SideNav"
				className="hidden lg:flex z-30 flex-col w-64 pb-10 font-muli pt-8 h-[calc(100vh-60px)] overflow-y-auto scrollbar-thin"
			>
				<div className="flex flex-col grow">
					<NavTree navigation={navigation} LinkWrap={PlainWrap} />
				</div>
			</div>
		</>
	);
};

export default SideBarNavClient;
