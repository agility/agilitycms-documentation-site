import React, { useState, useEffect } from "react";
import {
	LinkIcon,
	AdjustmentsIcon,
	PencilAltIcon,
	MinusIcon,
} from "@heroicons/react/outline";
import nextConfig from "next.config";

function classNames(...classes) {
	return classes.filter(Boolean).join(" ");
}

const AgilityLogo = () => (
	<svg width="20" height="18" viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path
			d="M11.7251 14.8743H4.71989L10 5.82228L15.2805 14.8743L16.8207 17.5714H20L10 0.428558L0 17.5714H12.9528L11.7251 14.8743Z"
			fill="#FFCB28"
		/>
	</svg>
);

const AgilityLogoLarge = () => (
	<svg width="95" height="24" viewBox="0 0 95 24" fill="none" xmlns="http://www.w3.org/2000/svg">
		<g clipPath="url(#clip0_15_967)">
			<path
				d="M16.4152 20.2241H6.60785L14 7.55122L21.3927 20.2241L23.549 24H28L14 0L0 24H18.1339L16.4152 20.2241Z"
				fill="#FFCB28"
			/>
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M38.4602 18.1147C39.359 18.1252 40.2531 17.9858 41.1058 17.7023V15.2007C40.2047 14.8026 39.2273 14.6058 38.242 14.624C36.8216 14.624 35.8147 15.0823 35.8147 16.2548C35.8147 17.3662 36.6876 18.1033 38.4602 18.1033V18.1147ZM42.8324 12.8291V18.6838C41.4597 19.334 39.9607 19.6755 38.4411 19.6844C35.2902 19.6844 34 18.2484 34 16.3541C34 14.265 35.8377 13.0926 38.242 13.0926C39.2212 13.0806 40.1935 13.257 41.1058 13.612V12.8291C41.1058 11.3014 40.1027 10.4612 38.288 10.4612C37.2358 10.456 36.2091 10.7836 35.3553 11.3969C35.1233 11.2855 34.9212 11.1208 34.7654 10.9163C34.6097 10.7118 34.5048 10.4734 34.4594 10.2206C35.1141 9.56753 36.6225 8.82662 38.3722 8.82662C40.8454 8.82662 42.8324 9.97235 42.8324 12.8291ZM53.6978 16.8315V11.1028C53.0175 10.6339 52.2041 10.3956 51.3777 10.423C49.1916 10.423 47.6832 11.9239 47.6832 14.0779C47.6832 16.2319 49.1916 17.5801 51.3777 17.5801C52.2178 17.6107 53.041 17.3397 53.6978 16.8162V16.8315ZM55.4666 10.1404V19.1153C55.4666 21.6818 53.4796 23.641 50.5469 23.641C48.7322 23.641 47.1012 23.0758 46.0446 21.8575C46.143 21.59 46.2959 21.3457 46.4935 21.14C46.6912 20.9343 46.9294 20.7716 47.1931 20.6621C47.6128 21.1331 48.1329 21.5045 48.7152 21.7491C49.2975 21.9936 49.9273 22.105 50.5584 22.0752C52.7445 22.0752 53.7093 20.769 53.7093 19.1153V18.531C52.9444 18.9253 52.0969 19.1333 51.2361 19.1383C48.3072 19.1383 45.8761 17.2287 45.8761 14.0932C45.8761 11.0379 48.1732 8.82662 51.3854 8.82662C52.8628 8.81476 54.3042 9.2811 55.4934 10.1557L55.4666 10.1404ZM59.2836 19.5163V9.25054C59.5784 9.1907 59.8786 9.16126 60.1795 9.1627C60.4741 9.15938 60.7682 9.18884 61.0562 9.25054V19.5202C60.4706 19.6309 59.8693 19.6309 59.2836 19.5202V19.5163ZM58.9008 6.24871C58.9 6.00312 58.9721 5.76281 59.108 5.558C59.2439 5.35318 59.4374 5.19303 59.6643 5.09768C59.8912 5.00232 60.1412 4.97603 60.3831 5.02211C60.6249 5.06819 60.8476 5.18459 61.0233 5.35665C61.199 5.52871 61.3197 5.74875 61.3703 5.9891C61.4209 6.22944 61.3991 6.47934 61.3077 6.70737C61.2163 6.9354 61.0593 7.13136 60.8565 7.2706C60.6537 7.40985 60.4142 7.48616 60.168 7.48992C60.0028 7.49245 59.8388 7.46224 59.6854 7.40105C59.532 7.33985 59.3923 7.24888 59.2744 7.13342C59.1566 7.01796 59.0628 6.88031 58.9987 6.72844C58.9345 6.57657 58.9013 6.41351 58.9008 6.24871ZM65.0264 19.3865V5.09533C65.6113 4.97692 66.2141 4.97692 66.799 5.09533V19.3903C66.5028 19.4489 66.2013 19.4771 65.8993 19.4743C65.6062 19.477 65.3136 19.4489 65.0264 19.3903V19.3865ZM70.7692 19.5202V9.25054C71.064 9.1907 71.3642 9.16126 71.6651 9.1627C71.9597 9.15938 72.2538 9.18884 72.5418 9.25054V19.5202C71.9562 19.6309 71.3549 19.6309 70.7692 19.5202ZM70.3864 6.24871C70.3856 6.00312 70.4577 5.76281 70.5936 5.558C70.7294 5.35318 70.923 5.19303 71.1499 5.09768C71.3767 5.00232 71.6268 4.97603 71.8686 5.02211C72.1105 5.06819 72.3332 5.18459 72.5089 5.35665C72.6846 5.52871 72.8053 5.74875 72.8559 5.9891C72.9065 6.22944 72.8847 6.47934 72.7933 6.70737C72.7019 6.9354 72.5449 7.13136 72.3421 7.2706C72.1393 7.40985 71.8998 7.48616 71.6536 7.48992C71.4884 7.49245 71.3244 7.46224 71.171 7.40105C71.0176 7.33985 70.8779 7.24888 70.76 7.13342C70.6421 7.01796 70.5484 6.88031 70.4843 6.72844C70.4201 6.57657 70.3869 6.41351 70.3864 6.24871ZM83.6943 18.7411C82.8931 19.4359 81.8692 19.8219 80.8076 19.8295C78.7326 19.8295 77.2203 18.848 77.2203 16.3923V10.8049H75.4515C75.3897 10.5707 75.3601 10.3291 75.3635 10.0869C75.3602 9.85102 75.3898 9.61579 75.4515 9.38803H77.2203V6.62298C77.5084 6.56128 77.8024 6.53182 78.097 6.53514C78.384 6.53182 78.6705 6.56129 78.9508 6.62298V9.38803H83.0205C83.081 9.61467 83.1093 9.84863 83.1047 10.0831C83.1097 10.3264 83.0814 10.5693 83.0205 10.8049H78.9355V16.0409C78.9355 17.8894 79.8084 18.2828 80.9225 18.2828C81.6435 18.2448 82.3333 17.9771 82.8904 17.5189C83.3038 17.8158 83.5864 18.2605 83.679 18.7602L83.6943 18.7411ZM95 9.44532C93.2963 15.9378 91.3476 19.8448 87.5229 24C87.243 23.9385 86.9827 23.8091 86.765 23.6232C86.5473 23.4373 86.3789 23.2008 86.2748 22.9345C87.3125 21.8278 88.2432 20.6258 89.0543 19.3445C87.2042 16.2381 85.8117 12.8823 84.9195 9.38039C85.2746 9.2744 85.6438 9.22289 86.0144 9.22763C86.2774 9.22821 86.5398 9.24992 86.7993 9.29255C87.5378 12.1436 88.5947 14.903 89.9502 17.5189L90.1224 17.8474C90.1684 17.7366 90.2335 17.6488 90.2756 17.5419C91.598 14.9211 92.5833 12.1443 93.2082 9.27727C93.446 9.23656 93.6867 9.21485 93.928 9.21235C94.2956 9.21939 94.6589 9.29316 95 9.43004"
				fill="#6B7280"
			/>
		</g>
		<defs>
			<clipPath id="clip0_15_967">
				<rect width="95" height="24" fill="white" />
			</clipPath>
		</defs>
	</svg>
);

/**
 * Floating preview/edit bar for editors — same style as the main site's
 * PreviewBar (vertical pill, expandable options panel). Combines the old
 * PreviewWidget (preview-mode indicator/exit) and CMSWidget (Edit Page deep
 * link). Visible by default in preview/dev mode; Ctrl/Cmd+Q toggles it anywhere.
 */
const PreviewBar = ({ isPreview, isDevelopmentMode, page, dynamicPageItem }) => {
	const [visible, setVisible] = useState(isPreview || isDevelopmentMode);
	const [isSelecting, setIsSelecting] = useState(false);

	useEffect(() => {
		function onKey(e) {
			if ((e.metaKey || e.ctrlKey) && e.code === "KeyQ") {
				setVisible((v) => !v);
			}
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	const modeLabel = isDevelopmentMode
		? "Development mode"
		: isPreview
			? "Preview mode"
			: "Live";

	const editPage = () => {
		let itemPath = null;
		if (dynamicPageItem) {
			itemPath = `content/listitem-${dynamicPageItem.contentID}`;
		} else {
			itemPath = `pages/page-${page.pageID}`;
		}
		const cmsURL = `https://manager.agilitycms.com/instance/${process.env.NEXT_PUBLIC_AGILITY_GUID}/en-us/${itemPath}`;
		window.open(cmsURL);
	};

	const exitPreview = () => {
		if (isDevelopmentMode) {
			alert(
				"You are currently in Development Mode, Live Mode is unavailable. Use `yarn build && yarn start` to run a production build locally in Live Mode."
			);
			return;
		}
		const exit = confirm("Would you like to exit Preview Mode?");
		if (exit === true) {
			window.location.href = `${nextConfig.basePath}/api/exitPreview?slug=${window.location.pathname}`;
		}
	};

	if (!visible) return null;

	const iconButtonClass =
		"flex p-1 text-(--muted) hover:text-(--text) focus:outline-hidden";

	return !isSelecting ? (
		<ul className="fixed top-1/2 left-0 z-50 ml-4 flex -translate-y-1/2 transform flex-col items-center gap-y-[10px] rounded-lg border border-(--border) bg-(--surface) p-2 shadow-xl">
			<li>
				<AgilityLogo />
			</li>
			<li>
				<button
					type="button"
					onClick={() => navigator.clipboard.writeText(window.location.href)}
					title="Copy Link"
					className={iconButtonClass}
				>
					<LinkIcon className="h-5 w-5" aria-hidden="true" />
				</button>
			</li>
			<li>
				<button
					type="button"
					onClick={editPage}
					title="Edit this page in Agility (Ctrl+Q toggles this bar)"
					className={iconButtonClass}
				>
					<PencilAltIcon className="h-5 w-5" aria-hidden="true" />
				</button>
			</li>
			<li>
				<button
					type="button"
					onClick={() => setIsSelecting(true)}
					title="Preview Options"
					className={iconButtonClass}
				>
					<AdjustmentsIcon className="h-5 w-5" aria-hidden="true" />
				</button>
			</li>
		</ul>
	) : (
		<div className="fixed top-1/2 left-0 z-50 ml-4 flex w-[368px] -translate-y-1/2 transform flex-col rounded-lg border border-(--border) bg-(--surface) p-6 shadow-xl">
			<div className="mb-6 flex w-full items-center justify-between border-b border-b-(--border) pb-6">
				<div className="flex items-end gap-x-3">
					<AgilityLogoLarge />
					<div className="h-full text-xs font-medium text-(--muted)">
						{modeLabel}
					</div>
				</div>
				<button
					type="button"
					onClick={() => setIsSelecting(false)}
					title="Minimize"
					className={iconButtonClass}
				>
					<MinusIcon className="h-5 w-5" aria-hidden="true" />
				</button>
			</div>

			<div className="text-sm text-(--text-2)">
				{isDevelopmentMode
					? "You are currently in Development Mode."
					: isPreview
						? "You are in Preview Mode."
						: "You are viewing the Live site."}
			</div>

			<div className="mt-6 flex w-full items-center gap-2 border-t border-t-(--border) pt-6">
				<button
					type="button"
					onClick={editPage}
					className={classNames(
						"w-full rounded-md border border-(--border) bg-(--surface) py-1.5 text-sm text-(--text-2) hover:text-(--primary) hover:border-(--primary)"
					)}
				>
					Edit in CMS
				</button>
				{(isPreview || isDevelopmentMode) && (
					<button
						type="button"
						onClick={exitPreview}
						className="w-full rounded-md border border-(--border) bg-(--surface) py-1.5 text-sm text-(--text-2) hover:text-(--primary) hover:border-(--primary)"
					>
						Exit Preview
					</button>
				)}
				<button
					type="button"
					onClick={() => {
						setIsSelecting(false);
						setVisible(false);
					}}
					className="w-full rounded-md border border-(--border) bg-(--surface) py-1.5 text-sm text-(--text-2) hover:text-(--primary) hover:border-(--primary)"
				>
					Hide
				</button>
			</div>
		</div>
	);
};

export default PreviewBar;
