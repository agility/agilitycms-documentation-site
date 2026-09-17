"use client";

/* shadcn-style Sheet (slide-over panel) on Radix Dialog, ocean tokens. */
import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "@heroicons/react/outline";
import { cn } from "lib/utils";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
	React.ElementRef<typeof SheetPrimitive.Overlay>,
	React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
	<SheetPrimitive.Overlay
		ref={ref}
		className={cn(
			"fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
			className
		)}
		{...props}
	/>
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sideClasses: Record<string, string> = {
	left: "inset-y-0 left-0 h-full w-80 max-w-[85vw] border-r border-(--border) data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
	right: "inset-y-0 right-0 h-full w-80 max-w-[85vw] border-l border-(--border) data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
};

const SheetContent = React.forwardRef<
	React.ElementRef<typeof SheetPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> & {
		side?: "left" | "right";
		title: string;
	}
>(({ side = "left", title, className, children, ...props }, ref) => (
	<SheetPortal>
		<SheetOverlay />
		<SheetPrimitive.Content
			ref={ref}
			className={cn(
				"fixed z-50 flex flex-col bg-(--surface) text-(--text) shadow-2xl transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:duration-300",
				sideClasses[side],
				className
			)}
			{...props}
		>
			<div className="flex items-center justify-between px-4 py-3 border-b border-(--border)">
				<SheetPrimitive.Title className="text-lg font-semibold text-(--text)">
					{title}
				</SheetPrimitive.Title>
				<SheetPrimitive.Close className="inline-flex items-center justify-center rounded-(--r-sm) p-2 text-(--text-2) hover:bg-(--raised) hover:text-(--text) focus:outline-hidden focus:ring-2 focus:ring-inset focus:ring-(--primary)">
					<span className="sr-only">Close</span>
					<XIcon className="h-6 w-6" aria-hidden="true" />
				</SheetPrimitive.Close>
			</div>
			<div className="flex-1 overflow-y-auto">{children}</div>
		</SheetPrimitive.Content>
	</SheetPortal>
));
SheetContent.displayName = SheetPrimitive.Content.displayName;

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetPortal, SheetOverlay };
