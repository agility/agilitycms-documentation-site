"use client";

/* Sidebar navigation UI (client): Disclosure tree + mobile slide-over.
   Data comes from the SideBarNav server component (agility-pageModules). */
import { Disclosure, Dialog, Transition } from "@headlessui/react";
import { Fragment, useState } from "react";
import Link from "next/link";
import { ChevronRightIcon, XIcon } from "@heroicons/react/outline";

function classNames(...classes) {
	return classes.filter(Boolean).join(" ");
}

const SideBarNavClient = ({ navigation }) => {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	const renderNavigation = () => (
		<nav className="flex-1 space-y-1 bg-(--bg)" aria-label="Sidebar">
			{navigation.map((item) =>
				!item.children ? (
					<div key={item.name} className="px-8">
						<Link href={item.href}
							onClick={() => setMobileMenuOpen(false)}
							className={classNames(
								item.current
									? "text-(--text) font-semibold"
									: "text-(--text-2) hover:text-(--primary)",
								"group w-full flex items-center pl-7 pr-2 py-2 text-sm font-medium rounded-md"
							)}
						>
							{item.name}

						</Link>
					</div>
				) : (
					<Disclosure
						as="div"
						key={item.name}
						className="space-y-1"
						defaultOpen={item.children.some((subItem) => subItem.current)}
					>
						{({ open }) => {
							return (
								<>
									<Disclosure.Button
										className={classNames(
											item.current
												? "bg-(--raised) text-(--text)"
												: "text-(--text-2) hover:text-(--primary)",
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
										<span
											className={`${open ? `text-(--text)` : `text-(--text-2)`
												} hover:text-(--primary)`}
										>
											{item.name}
										</span>
									</Disclosure.Button>
									<Disclosure.Panel
										className="py-2 space-y-1 bg-(--surface)"
									>
										{item.children.map((subItem) => {
											return (
												<Link key={subItem.name} href={subItem.href}
													onClick={() => setMobileMenuOpen(false)}
													className={classNames(
														!!subItem.current
															? " text-(--primary)"
															: " text-(--text-2) hover:text-(--primary) ",
														"group w-full flex items-center pl-16 pr-2 py-2 text-sm font-medium rounded-md"
													)}
												>
													{subItem.name}

												</Link>
											);
										})}
									</Disclosure.Panel>
								</>
							);
						}}
					</Disclosure>
				)
			)}
		</nav>
	);

	return (
		<>
			{/* Floating action button - Mobile */}
			<button
				type="button"
				onClick={() => setMobileMenuOpen(true)}
				className="lg:hidden fixed left-2 top-[65px] z-40 flex items-center justify-center w-9 h-9 bg-(--surface) rounded-full shadow-md hover:shadow-lg text-(--muted) hover:text-(--primary) focus:outline-hidden focus:ring-2 focus:ring-(--primary) focus:ring-offset-1 transition-all duration-200"
				aria-label="Open navigation menu"
			>
				<ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
			</button>

			{/* Mobile menu dialog */}
			<Transition.Root show={mobileMenuOpen} as={Fragment}>
				<Dialog as="div" className="fixed inset-0 z-50 lg:hidden" onClose={setMobileMenuOpen}>
					<Transition.Child
						as={Fragment}
						enter="transition-opacity ease-linear duration-300"
						enterFrom="opacity-0"
						enterTo="opacity-100"
						leave="transition-opacity ease-linear duration-300"
						leaveFrom="opacity-100"
						leaveTo="opacity-0"
					>
						<Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50" />
					</Transition.Child>

					<div className="fixed inset-0 flex pointer-events-none">
						<Transition.Child
							as={Fragment}
							enter="transition ease-in-out duration-300 transform"
							enterFrom="-translate-x-full"
							enterTo="translate-x-0"
							leave="transition ease-in-out duration-300 transform"
							leaveFrom="translate-x-0"
							leaveTo="-translate-x-full"
						>
							<div className="relative flex flex-col w-72 max-w-[85vw] bg-(--surface) text-(--text) shadow-2xl pointer-events-auto h-full">
								{/* Close button inside the panel */}
								<div className="flex items-center justify-between px-4 py-3 border-b border-(--border)">
									<span className="text-lg font-semibold text-(--text)">Navigation</span>
									<button
										type="button"
										className="inline-flex items-center justify-center rounded-md p-2 text-(--text-2) hover:bg-(--raised) hover:text-(--text) focus:outline-hidden focus:ring-2 focus:ring-inset focus:ring-(--primary)"
										onClick={() => setMobileMenuOpen(false)}
									>
										<span className="sr-only">Close sidebar</span>
										<XIcon className="h-6 w-6" aria-hidden="true" />
									</button>
								</div>
								<div className="flex-1 overflow-y-auto pt-4 pb-4">
									<div className="flex flex-col grow">
										{renderNavigation()}
									</div>
								</div>
							</div>
						</Transition.Child>
					</div>
				</Dialog>
			</Transition.Root>

			{/* Desktop sidebar */}
			<div
				id="SideNav"
				className="hidden lg:flex z-40 flex-col w-64 pb-4 font-muli pt-[130px] max-h-screen mt-[-124px] overflow-y-auto scrollbar-thin"
			>
				<div className="flex flex-col grow">
					{renderNavigation()}
				</div>
			</div>
		</>
	);
};

export default SideBarNavClient;
