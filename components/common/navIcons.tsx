import type { ComponentType } from "react";
import {
	CubeIcon,
	TemplateIcon,
	ServerIcon,
	DownloadIcon,
	PencilAltIcon,
	RefreshIcon,
	CodeIcon,
	DatabaseIcon,
} from "@heroicons/react/outline";
import {
	SiNextdotjs,
	SiNuxtdotjs,
	SiGatsby,
	SiAstro,
	SiEleventy,
	SiAngular,
	SiSvelte,
	SiReact,
	SiVuedotjs,
	SiRemix,
	SiSolid,
	SiHugo,
	SiJekyll,
	SiBlazor,
	SiFlutter,
	SiIonic,
	SiDocusaurus,
	SiVite,
	SiDotnet,
	SiSharp,
	SiJavascript,
	SiTypescript,
	SiNodedotjs,
	SiPython,
	SiPhp,
	SiGo,
	SiRuby,
	SiRubyonrails,
	SiOpenjdk,
	SiKotlin,
	SiSwift,
	SiWebcomponentsdotorg,
	SiGraphql,
	SiSwagger,
	SiPostman,
} from "react-icons/si";

export type IconCmp = ComponentType<{ className?: string }>;
export type NavCategory = "APIs" | "SDKs" | "Frameworks";

/**
 * Nav-icon registry. Each slug is a choice on the `Icon` DropdownList field of
 * the `Link` content model — an editor picks one per dropdown link, and the nav
 * renders the matching (mostly brand) logo. KEEP THIS IN SYNC WITH THE CMS
 * DROPDOWN: the exact slugs live in NAV_ICON_CHOICES below, which is the list
 * pushed to the Link model. Brand marks come from react-icons/si (Simple
 * Icons); Agility-specific and generic entries fall back to heroicons.
 */
export const NAV_ICONS: Record<string, IconCmp> = {
	// Frameworks
	nextjs: SiNextdotjs,
	nuxt: SiNuxtdotjs,
	gatsby: SiGatsby,
	astro: SiAstro,
	eleventy: SiEleventy,
	angular: SiAngular,
	sveltekit: SiSvelte,
	svelte: SiSvelte,
	react: SiReact,
	vue: SiVuedotjs,
	remix: SiRemix,
	solidjs: SiSolid,
	hugo: SiHugo,
	jekyll: SiJekyll,
	blazor: SiBlazor,
	flutter: SiFlutter,
	ionic: SiIonic,
	docusaurus: SiDocusaurus,
	vite: SiVite,
	// SDKs / languages
	dotnet: SiDotnet,
	csharp: SiSharp,
	javascript: SiJavascript,
	typescript: SiTypescript,
	nodejs: SiNodedotjs,
	python: SiPython,
	php: SiPhp,
	go: SiGo,
	ruby: SiRuby,
	rails: SiRubyonrails,
	java: SiOpenjdk,
	kotlin: SiKotlin,
	swift: SiSwift,
	webcomponents: SiWebcomponentsdotorg,
	webstudio: CubeIcon, // Agility Web Studio SDK — no brand mark
	// APIs
	graphql: SiGraphql,
	swagger: SiSwagger,
	postman: SiPostman,
	"content-fetch": DownloadIcon,
	"content-management": PencilAltIcon,
	"content-sync": RefreshIcon,
	rest: ServerIcon,
	// Generic
	framework: TemplateIcon,
	sdk: CubeIcon,
	api: ServerIcon,
	code: CodeIcon,
	database: DatabaseIcon,
};

/**
 * The choices we push to the Link model's `Icon` DropdownList, in display
 * order. `value` is the slug (matches NAV_ICONS keys); `label` is what editors
 * see. Grouped by comment only — Agility DropdownLists are flat.
 */
export const NAV_ICON_CHOICES: { label: string; value: string }[] = [
	// Frameworks
	{ label: "Next.js", value: "nextjs" },
	{ label: "Nuxt", value: "nuxt" },
	{ label: "Gatsby", value: "gatsby" },
	{ label: "Astro", value: "astro" },
	{ label: "Eleventy (11ty)", value: "eleventy" },
	{ label: "Angular", value: "angular" },
	{ label: "SvelteKit / Svelte", value: "sveltekit" },
	{ label: "React", value: "react" },
	{ label: "Vue", value: "vue" },
	{ label: "Remix", value: "remix" },
	{ label: "SolidJS", value: "solidjs" },
	{ label: "Hugo", value: "hugo" },
	{ label: "Jekyll", value: "jekyll" },
	{ label: "Blazor", value: "blazor" },
	{ label: "Flutter", value: "flutter" },
	{ label: "Ionic", value: "ionic" },
	{ label: "Docusaurus", value: "docusaurus" },
	{ label: "Vite", value: "vite" },
	// SDKs / languages
	{ label: ".NET", value: "dotnet" },
	{ label: "C#", value: "csharp" },
	{ label: "JavaScript", value: "javascript" },
	{ label: "TypeScript", value: "typescript" },
	{ label: "Node.js", value: "nodejs" },
	{ label: "Python", value: "python" },
	{ label: "PHP", value: "php" },
	{ label: "Go", value: "go" },
	{ label: "Ruby", value: "ruby" },
	{ label: "Ruby on Rails", value: "rails" },
	{ label: "Java", value: "java" },
	{ label: "Kotlin", value: "kotlin" },
	{ label: "Swift", value: "swift" },
	{ label: "Web Components", value: "webcomponents" },
	{ label: "Web Studio SDK", value: "webstudio" },
	// APIs
	{ label: "GraphQL API", value: "graphql" },
	{ label: "OpenAPI / Swagger", value: "swagger" },
	{ label: "Postman", value: "postman" },
	{ label: "Content Fetch API", value: "content-fetch" },
	{ label: "Content Management API", value: "content-management" },
	{ label: "Content Sync API", value: "content-sync" },
	{ label: "REST API", value: "rest" },
	// Generic fallbacks
	{ label: "Generic — Framework", value: "framework" },
	{ label: "Generic — SDK", value: "sdk" },
	{ label: "Generic — API", value: "api" },
	{ label: "Generic — Code", value: "code" },
	{ label: "Generic — Database", value: "database" },
];

// Category is derived from the link text (the model has no category field yet):
// anything ending in "API" → APIs; a known framework name → Frameworks; else
// an SDK/language. Extend this set as new frameworks appear (e.g. Blazor).
const FRAMEWORKS = new Set([
	"next.js",
	"nextjs",
	"nuxt",
	"gatsby",
	"astro",
	"eleventy",
	"angular",
	"sveltekit",
	"svelte",
	"react",
	"vue",
	"vue.js",
	"remix",
	"solidjs",
	"solid",
	"hugo",
	"jekyll",
	"blazor",
	"flutter",
	"ionic",
	"docusaurus",
]);

// Back-compat: infer an icon slug from the link text when no Icon is set on the
// CMS item. Keyed by the text stripped to [a-z0-9] ("Next.js" → "nextjs").
const NAME_TO_SLUG: Record<string, string> = {
	nextjs: "nextjs",
	net: "dotnet",
	dotnet: "dotnet",
	gatsby: "gatsby",
	nuxt: "nuxt",
	eleventy: "eleventy",
	angular: "angular",
	javascript: "javascript",
	typescript: "typescript",
	python: "python",
	php: "php",
	astro: "astro",
	webstudiosdk: "webstudio",
	sveltekit: "sveltekit",
	svelte: "svelte",
	react: "react",
	vue: "vue",
	blazor: "blazor",
	graphqlapi: "graphql",
	graphql: "graphql",
	contentfetchapi: "content-fetch",
	contentmanagementapi: "content-management",
	contentsyncapi: "content-sync",
};

const CATEGORY_FALLBACK: Record<NavCategory, IconCmp> = {
	APIs: ServerIcon,
	SDKs: CubeIcon,
	Frameworks: TemplateIcon,
};

export const classifyNav = (text: string): NavCategory => {
	const t = (text || "").toLowerCase().trim();
	if (t.endsWith("api")) return "APIs";
	if (FRAMEWORKS.has(t)) return "Frameworks";
	return "SDKs";
};

/**
 * Resolve the icon for a nav link. Preference order:
 *  1. the `icon` slug the editor set on the CMS item,
 *  2. an inference from the link text (back-compat / unset items),
 *  3. the category's generic fallback.
 */
export const resolveNavIcon = ({
	icon,
	text,
	category,
}: {
	icon?: string | null;
	text: string;
	category: NavCategory;
}): IconCmp => {
	if (icon) {
		const bySlug = NAV_ICONS[icon.toLowerCase().trim()];
		if (bySlug) return bySlug;
	}
	const key = (text || "").toLowerCase().replace(/[^a-z0-9]/g, "");
	const slug = NAME_TO_SLUG[key];
	if (slug && NAV_ICONS[slug]) return NAV_ICONS[slug];
	return CATEGORY_FALLBACK[category];
};
