"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import clsx from "clsx";
import { writeConsent, type ConsentChoices } from "lib/analytics/consent";
import type { ConsentCopy } from "lib/analytics/consent-copy";
import { OPEN_SETTINGS_EVENT } from "lib/analytics/consent-store";
import { useConsent } from "lib/analytics/use-consent";

/**
 * The cookie banner — partner of the marketing site's
 * src/components/analytics/cookie-consent-banner.client.tsx. Same behaviour, same
 * words (from the marketing instance), same cookie; styled with this site's
 * tokens. What the choice does is in lib/analytics/consent.ts.
 *
 * - A card, never a modal: bottom-left from `sm` up (~380 px), a bottom sheet
 *   inside the 16 px gutter on phones. While it shows, the scrolling element gets
 *   matching bottom padding, so nothing is stuck under it. Here that is
 *   #ScrollContainer, not the window: this site scrolls a nested container.
 * - One sentence, then Accept and Decline, identical in size and style (equal
 *   prominence is the legal line in the EEA/UK). "Choose" and the policy are
 *   links in the sentence.
 * - Choose expands the card into switches for Analytics and Marketing, starting
 *   at what is currently permitted, so nothing is pre-ticked in an opt-in region.
 *   The footer's "Cookie settings" opens straight into it.
 * - Not modal, so it never takes focus on its own. Opening Choose moves focus
 *   into the panel, and Escape goes back.
 * - Shown when the region is known and there's no stored choice (one made on the
 *   marketing site counts: same cookie), or when asked from the footer. Hidden in
 *   iframes (Web Studio).
 * - Client-only: the choice is a cookie, and `position: fixed` means appearing
 *   after hydration shifts nothing.
 */
export default function CookieConsentBanner({ copy }: { copy: ConsentCopy }) {
	const { stored, regime, permissions } = useConsent();
	const inFrame = useSyncExternalStore(noSubscribe, () => window.self !== window.top, () => true);
	const [requested, setRequested] = useState(false);
	const [view, setView] = useState<"banner" | "choose">("banner");
	const ref = useRef<HTMLElement>(null);
	const chooseHeading = useRef<HTMLHeadingElement>(null);

	const needed = !stored && !!regime && !inFrame;
	const open = needed || requested;

	// The footer's "Cookie settings" link.
	useEffect(() => {
		const onOpen = () => {
			setRequested(true);
			setView("choose");
		};
		window.addEventListener(OPEN_SETTINGS_EVENT, onOpen);
		return () => window.removeEventListener(OPEN_SETTINGS_EVENT, onOpen);
	}, []);

	// Keep the page clear of the banner while it shows.
	useEffect(() => {
		const el = ref.current;
		if (!open || !el) return;
		const scroller = document.getElementById("ScrollContainer") ?? document.body;
		const reserve = () => {
			// The card floats above the viewport edge; reserve that gap too.
			const space = `${Math.ceil(window.innerHeight - el.getBoundingClientRect().top)}px`;
			scroller.style.paddingBottom = space;
			scroller.style.scrollPaddingBottom = space;
		};
		reserve();
		const observer = new ResizeObserver(reserve);
		observer.observe(el);
		window.addEventListener("resize", reserve);
		return () => {
			observer.disconnect();
			window.removeEventListener("resize", reserve);
			scroller.style.paddingBottom = "";
			scroller.style.scrollPaddingBottom = "";
		};
	}, [open]);

	useEffect(() => {
		if (view === "choose") chooseHeading.current?.focus();
	}, [view]);

	const close = useCallback(() => {
		setRequested(false);
		setView("banner");
	}, []);

	if (!open) return null;

	// writeConsent notifies useConsent, which closes the banner.
	const decide = (choices: ConsentChoices) => {
		writeConsent(choices);
		close();
	};

	return (
		<section
			ref={ref}
			aria-label="Cookie consent"
			onKeyDown={(e) => {
				if (e.key === "Escape" && view === "choose") setView("banner");
			}}
			className="fixed inset-x-4 bottom-4 z-[55] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-md border border-(--border) bg-(--raised) p-3 font-muli text-(--text) shadow-(--elev-3) sm:inset-x-auto sm:left-4 sm:w-[380px] sm:p-4"
		>
			{view === "banner" ? (
				<>
					<p className="text-sm leading-snug">
						{copy.message}{" "}
						<button type="button" onClick={() => setView("choose")} className={LINK}>
							{copy.chooseLabel}
						</button>
						<span aria-hidden="true"> · </span>
						<a
							href={copy.privacyLink.href}
							target={copy.privacyLink.target}
							rel={copy.privacyLink.target === "_blank" ? "noreferrer" : undefined}
							className={LINK}
						>
							{copy.privacyLink.text}
						</a>
					</p>
					<div className="mt-2.5 flex gap-2 sm:mt-3">
						<button type="button" className={clsx(BUTTON, "flex-1")} onClick={() => decide({ analytics: true, marketing: true })}>
							{copy.acceptLabel}
						</button>
						<button type="button" className={clsx(BUTTON, "flex-1")} onClick={() => decide({ analytics: false, marketing: false })}>
							{copy.declineLabel}
						</button>
					</div>
				</>
			) : (
				<ChoosePanel
					copy={copy}
					initial={stored ?? permissions ?? { analytics: false, marketing: false }}
					headingRef={chooseHeading}
					onSave={decide}
				/>
			)}
		</section>
	);
}

/** Accept and Decline (and Save) share one style: equal prominence. */
const BUTTON =
	"inline-flex h-10 items-center justify-center rounded-md border border-(--border-strong) bg-(--surface) px-4 text-sm font-semibold text-(--text) transition-colors hover:border-(--primary) hover:text-(--primary-text) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)";
const LINK = "whitespace-nowrap underline underline-offset-2 hover:text-(--primary-text)";

function ChoosePanel({
	copy,
	initial,
	headingRef,
	onSave,
}: {
	copy: ConsentCopy;
	initial: ConsentChoices;
	headingRef: React.RefObject<HTMLHeadingElement | null>;
	onSave: (choices: ConsentChoices) => void;
}) {
	const [choices, setChoices] = useState<ConsentChoices>({ analytics: initial.analytics, marketing: initial.marketing });
	return (
		<div>
			<h2 ref={headingRef} tabIndex={-1} className="text-base font-semibold outline-none">
				{copy.chooseTitle}
			</h2>
			<p className="mt-1 text-xs leading-snug text-(--muted) sm:text-sm">{copy.chooseIntro}</p>
			<ul className="mt-2.5 space-y-2.5 sm:mt-3 sm:space-y-3">
				<CategoryRow label={copy.necessaryLabel} description={copy.necessaryDescription} checked disabled />
				<CategoryRow
					label={copy.analyticsLabel}
					description={copy.analyticsDescription}
					checked={choices.analytics}
					onChange={(analytics) => setChoices((c) => ({ ...c, analytics }))}
				/>
				<CategoryRow
					label={copy.marketingLabel}
					description={copy.marketingDescription}
					checked={choices.marketing}
					onChange={(marketing) => setChoices((c) => ({ ...c, marketing }))}
				/>
			</ul>
			<button type="button" className={clsx(BUTTON, "mt-3 w-full sm:mt-4")} onClick={() => onSave(choices)}>
				{copy.saveLabel}
			</button>
		</div>
	);
}

function CategoryRow({
	label,
	description,
	checked,
	disabled,
	onChange,
}: {
	label: string;
	description: string;
	checked: boolean;
	disabled?: boolean;
	onChange?: (on: boolean) => void;
}) {
	const id = `consent-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
	return (
		<li className="flex items-start justify-between gap-3">
			<div>
				<span id={id} className="text-sm font-medium">
					{label}
				</span>
				<p className="text-xs leading-snug text-(--muted)">{description}</p>
			</div>
			<button
				type="button"
				role="switch"
				aria-checked={checked}
				aria-labelledby={id}
				disabled={disabled}
				onClick={() => onChange?.(!checked)}
				className={clsx(
					"relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary) disabled:opacity-60",
					checked ? "bg-(--primary)" : "bg-(--border-strong)"
				)}
			>
				<span
					aria-hidden="true"
					className={clsx(
						"inline-block size-4 rounded-full bg-(--on-primary) shadow transition-transform",
						checked ? "translate-x-[18px]" : "translate-x-0.5"
					)}
				/>
			</button>
		</li>
	);
}

const noSubscribe = () => () => {};
