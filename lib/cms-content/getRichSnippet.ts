import { cacheLife } from "next/cache";

import { AgilityPageData } from "lib/cms/getAgilityPage";
import { getSitemapFlat } from "lib/cms/getSitemapFlat";
import { ORG_ID, SITE_URL, WEBSITE_ID, graph, organizationNode, ref, webSiteNode } from "lib/seo/schema";

/**
 * JSON-LD for docs pages (principles from the marketing site's
 * getRichSnippet: string-returning builder, injected as an in-body
 * <script type="application/ld+json"> — NOT via the Metadata API).
 *
 * Emits ONE `@graph` per page rather than a list of standalone schemas, so
 * that the organization, the site and the page are connected nodes instead of
 * repeated anonymous ones — see lib/seo/schema.ts for why that matters.
 *
 * Every page gets: Organization + WebSite + WebPage (+ BreadcrumbList when
 * nested). Doc articles add a TechArticle and a VideoObject per embedded video.
 */
export const getRichSnippet = async ({
	sitemapNode,
	dynamicPageItem,
	languageCode,
	isPreview,
}: AgilityPageData): Promise<string | null> => {
	if (!sitemapNode) return null;

	const isHomepage = sitemapNode.path === "/" || sitemapNode.path === "/home";
	const pageUrl = isHomepage ? SITE_URL : `${SITE_URL}${sitemapNode.path}`;
	const webPageId = `${pageUrl}#webpage`;
	const breadcrumbId = `${pageUrl}#breadcrumb`;

	const nodes: any[] = [organizationNode(), webSiteNode()];

	const webPage: any = {
		"@type": "WebPage",
		"@id": webPageId,
		url: pageUrl,
		name: sitemapNode.title,
		isPartOf: ref(WEBSITE_ID),
		inLanguage: toBcp47(languageCode),
	};
	nodes.push(webPage);

	// Breadcrumbs from the path segments (Docs -> section -> article).
	//
	// Intermediate names come from the SITEMAP, not from the slug. Slugifying
	// back produced real published errors — /javascript/management-sdk/assets
	// advertised "Javascript" and "Management Sdk" to Google (verified live
	// 2026-09-20). humanize() survives only as the fallback for a segment that
	// has no sitemap node of its own (a folder, say).
	const segments = isHomepage ? [] : sitemapNode.path.split("/").filter(Boolean);

	// Fetched once and shared by the breadcrumb names and articleSection below.
	// This is the same cached read getAgilityPage already made for this request,
	// so it costs nothing extra — but it MUST stay a cached read: an uncached
	// fetch reached from here postpones the whole article body (see vimeoOEmbed).
	const sitemap =
		segments.length > 0
			? await getSitemapFlat({ locale: languageCode, preview: isPreview })
			: null;

	if (segments.length > 0 && sitemap) {
		const crumbName = (idx: number) => {
			if (idx === segments.length - 1) return sitemapNode.title;
			const path = `/${segments.slice(0, idx + 1).join("/")}`;
			const node = sitemap[path];
			const title = node?.title || node?.menuText;
			// A CMS title that IS the slug is an unedited page title, not a name —
			// /javascript/management-sdk is titled "management-sdk" (1 of 345 nodes,
			// checked 2026-09-20). Publishing that as a breadcrumb label would be
			// worse than the humanized slug, so fall through when they match.
			//
			// The comparison is case-SENSITIVE on purpose. Case is exactly what
			// distinguishes an edited title from an unedited one here: /javascript
			// is correctly titled "JavaScript" and must be kept, while
			// "management-sdk" matches its segment byte for byte. Comparing
			// case-insensitively threw the good title away too.
			if (title && title !== segments[idx]) return title;
			return humanize(segments[idx]);
		};

		nodes.push({
			"@type": "BreadcrumbList",
			"@id": breadcrumbId,
			itemListElement: [
				{ "@type": "ListItem", position: 1, name: "Docs", item: SITE_URL },
				...segments.map((seg, idx) => ({
					"@type": "ListItem",
					position: idx + 2,
					name: crumbName(idx),
					item: `${SITE_URL}/${segments.slice(0, idx + 1).join("/")}`,
				})),
			],
		});
		webPage.breadcrumb = ref(breadcrumbId);
	}

	if (dynamicPageItem?.properties?.definitionName === "DocArticle") {
		const datePublished =
			dynamicPageItem.fields.date || dynamicPageItem.properties.modified;

		// The top-level segment is the section the article belongs to
		// ("Developers", "Editors", …) — articleSection is how a crawler learns
		// that grouping without having to infer it from the URL.
		const sectionNode = segments.length > 1 ? sitemap?.[`/${segments[0]}`] : undefined;
		const sectionTitle = sectionNode?.title || sectionNode?.menuText;

		nodes.push({
			"@type": "TechArticle",
			"@id": `${pageUrl}#article`,
			mainEntityOfPage: ref(webPageId),
			isPartOf: ref(webPageId),
			headline: dynamicPageItem.fields.title,
			description: dynamicPageItem.fields.description || undefined,
			url: pageUrl,
			inLanguage: toBcp47(languageCode),
			articleSection: sectionTitle || undefined,
			publisher: ref(ORG_ID),
			// No per-article byline exists in the CMS, so the organization is the
			// author. That is a truthful claim and still an authorship signal —
			// an omitted author is not.
			author: ref(ORG_ID),
			datePublished,
			dateModified: dynamicPageItem.properties.modified,
		});

		// One VideoObject per video embedded in the article body, so pages that
		// carry a video are eligible for video rich results / the Video tab.
		// YouTube ids yield a derivable thumbnail; Vimeo embeds are enriched with
		// a real thumbnail/title/duration via Vimeo's oEmbed API (in a 'use cache'
		// scope — see vimeoOEmbed, it must stay there),
		// falling back gracefully if that lookup fails. uploadDate isn't tracked
		// per video, so it falls back to the article's publish date.
		const videos = extractVideos(dynamicPageItem);
		await enrichVimeoThumbnails(videos);
		videos.forEach((v, i) => {
			const fallbackName =
				videos.length > 1
					? `${dynamicPageItem.fields.title} — Video ${i + 1}`
					: dynamicPageItem.fields.title;
			nodes.push({
				"@type": "VideoObject",
				"@id": `${pageUrl}#video-${i + 1}`,
				name: v.name || fallbackName,
				description:
					v.description ||
					dynamicPageItem.fields.description ||
					dynamicPageItem.fields.title,
				thumbnailUrl: v.thumbnailUrl || undefined,
				uploadDate: datePublished,
				duration: v.duration || undefined,
				contentUrl: v.contentUrl || undefined,
				embedUrl: v.embedUrl || undefined,
			});
		});
	}

	return graph(nodes);
};

/**
 * Slug -> readable label, with the acronyms that actually appear in these docs
 * kept upper-case. Plain title-casing renders "management-sdk" as "Management
 * Sdk", which reads as a typo in a breadcrumb.
 */
const ACRONYMS = new Set([
	"sdk", "api", "apis", "cms", "url", "urls", "html", "css", "js", "ai", "mcp",
	"seo", "cli", "json", "rest", "ui", "cdn", "dns", "ssr", "ssg", "id",
]);

const humanize = (slug: string) =>
	slug
		.split("-")
		.filter(Boolean)
		.map((word) =>
			ACRONYMS.has(word.toLowerCase())
				? word.toUpperCase()
				: word.charAt(0).toUpperCase() + word.slice(1)
		)
		.join(" ");

/**
 * Agility locale codes are lowercase (`en-us`); schema.org's `inLanguage`
 * wants a BCP 47 tag, whose region subtag is uppercase (`en-US`).
 */
const toBcp47 = (locale: string): string => {
	const [lang, region] = (locale || "en-us").split("-");
	return region ? `${lang.toLowerCase()}-${region.toUpperCase()}` : lang.toLowerCase();
};

// ---- Video extraction for VideoObject JSON-LD ----------------------------
// The article body is either EditorJS JSON (`content`/`classicContent`, with
// `embed` and raw-HTML blocks) or Markdown (`markdownContent`, whose raw
// <iframe>/<video> tags pass through rehypeRaw). We scan both for the video
// hosts that actually appear in the docs: Vimeo, YouTube, and self-hosted files.

interface ExtractedVideo {
	embedUrl?: string;
	contentUrl?: string;
	name?: string;
	description?: string;
	thumbnailUrl?: string;
	duration?: string; // ISO 8601, e.g. "PT2M30S"
}

// Seconds → ISO 8601 duration for VideoObject.duration.
const iso8601Duration = (seconds: number): string => {
	const s = Math.round(seconds);
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	return `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}${sec || (!h && !m) ? `${sec}S` : ""}`;
};

// Look up a public Vimeo video's thumbnail/title/duration via the oEmbed API.
//
// MUST stay inside a 'use cache' scope. Cache Components treats an uncached
// fetch as request-time IO, which postpones the render — and because
// getRichSnippet is awaited in the page (inside the layout's <Suspense>), that
// postponed the WHOLE article body. The eleven articles that embed a Vimeo
// video were shipping a header-only shell and resuming the render on every
// request, while every other page prerendered in full. `next: { revalidate }`
// did not save us: under Cache Components that option is replaced by the cache
// scope, so it cached nothing here.
//
// Failures resolve to {} so the VideoObject falls back to whatever the body
// already provided — note that an empty result is cached like any other, so a
// Vimeo outage costs a thumbnail until the entry revalidates, not a render.
const vimeoOEmbed = async (id: string): Promise<Partial<ExtractedVideo>> => {
	"use cache";
	// Matches the 86400s this fetch asked for before: revalidate daily.
	cacheLife("days");
	try {
		// width=1280 makes Vimeo return a large (1280px) thumbnail rather than the
		// ~295px default — Google prefers high-res thumbnails for video results.
		const res = await fetch(
			`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${id}&width=1280`,
		);
		if (!res.ok) return {};
		const j: any = await res.json();
		const out: Partial<ExtractedVideo> = {};
		if (typeof j.thumbnail_url === "string" && j.thumbnail_url.trim())
			out.thumbnailUrl = j.thumbnail_url.trim();
		if (typeof j.title === "string" && j.title.trim()) out.name = j.title.trim();
		if (typeof j.duration === "number" && j.duration > 0) out.duration = iso8601Duration(j.duration);
		return out;
	} catch {
		return {};
	}
};

// Fill in thumbnails (and title/duration when missing) for Vimeo embeds that
// don't already carry them — the common case, since docs embed Vimeo as bare
// iframes. Runs all lookups in parallel and mutates the videos in place.
const enrichVimeoThumbnails = async (videos: ExtractedVideo[]): Promise<void> => {
	await Promise.all(
		videos.map(async (v) => {
			if (v.thumbnailUrl || !v.embedUrl) return;
			const id = vimeoId(v.embedUrl);
			if (!id) return;
			const meta = await vimeoOEmbed(id);
			if (meta.thumbnailUrl) v.thumbnailUrl = meta.thumbnailUrl;
			if (!v.name && meta.name) {
				v.name = meta.name;
				if (!v.description) v.description = meta.name;
			}
			if (!v.duration && meta.duration) v.duration = meta.duration;
		}),
	);
};

// YouTube video id from any common URL shape (embed / watch / youtu.be / nocookie).
const youTubeId = (url: string): string | null => {
	const m = url.match(
		/(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?(?:.*&)?v=)|youtu\.be\/)([\w-]{11})/i,
	);
	return m ? m[1] : null;
};

// Vimeo numeric id from a player or share URL.
const vimeoId = (url: string): string | null => {
	const m = url.match(/(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)/i);
	return m ? m[1] : null;
};

// Turn a recognized video URL into a VideoObject-ready shape, or null if it
// isn't a video host we understand.
const normalizeVideoUrl = (url: string): ExtractedVideo | null => {
	const yt = youTubeId(url);
	if (yt) {
		return {
			embedUrl: `https://www.youtube.com/embed/${yt}`,
			thumbnailUrl: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`,
		};
	}
	const vm = vimeoId(url);
	if (vm) return { embedUrl: `https://player.vimeo.com/video/${vm}` };
	if (/\.(mp4|webm|ogg|mov)(?:[?#]|$)/i.test(url)) return { contentUrl: url };
	return null;
};

// Read an HTML attribute value out of a single opening tag string.
const attr = (tag: string, name: string): string | undefined => {
	const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"));
	return m ? m[1] : undefined;
};

// The legacy "VimeoVideo" custom field (public/custom-fields.js) stores a JSON
// blob straight from Vimeo's oEmbed API — { video_id, title, html,
// thumbnail_url, duration (seconds), ... }. Unlike a bare iframe embed it
// carries a real thumbnail, title, and duration, so we lift all three.
const videoFromVimeoJson = (obj: any): ExtractedVideo | null => {
	if (!obj || typeof obj !== "object") return null;
	const html = typeof obj.html === "string" ? obj.html : "";
	const idFromHtml = html ? vimeoId(attr(html.match(/<iframe\b[^>]*>/i)?.[0] || "", "src") || "") : null;
	const id = obj.video_id != null && `${obj.video_id}`.trim() ? `${obj.video_id}`.trim() : idFromHtml;
	if (!id) return null;
	const v: ExtractedVideo = { embedUrl: `https://player.vimeo.com/video/${id}` };
	if (typeof obj.thumbnail_url === "string" && obj.thumbnail_url.trim())
		v.thumbnailUrl = obj.thumbnail_url.trim();
	if (typeof obj.title === "string" && obj.title.trim()) {
		v.name = obj.title.trim();
		v.description = v.name;
	}
	if (typeof obj.duration === "number" && obj.duration > 0) v.duration = iso8601Duration(obj.duration);
	return v;
};

// Pull videos out of a raw HTML string (<iframe> embeds and <video> tags).
const videosFromHtml = (html: string): ExtractedVideo[] => {
	const out: ExtractedVideo[] = [];
	if (!html) return out;

	const iframeRe = /<iframe\b[^>]*>/gi;
	let m: RegExpExecArray | null;
	while ((m = iframeRe.exec(html))) {
		const src = attr(m[0], "src");
		if (!src) continue;
		const v = normalizeVideoUrl(src);
		if (!v) continue;
		const title = attr(m[0], "title");
		out.push({ ...v, name: title, description: title });
	}

	const videoRe = /<video\b[^>]*>([\s\S]*?)<\/video>/gi;
	while ((m = videoRe.exec(html))) {
		const openTag = m[0].match(/<video\b[^>]*>/i)?.[0] || "";
		let src = attr(openTag, "src");
		if (!src) src = attr(m[1].match(/<source\b[^>]*>/i)?.[0] || "", "src");
		if (!src) continue;
		out.push({ contentUrl: src, thumbnailUrl: attr(openTag, "poster") });
	}

	return out;
};

// Pull videos out of EditorJS blocks (embed blocks + raw-HTML blocks).
const videosFromBlocks = (blocks: any[]): ExtractedVideo[] => {
	const out: ExtractedVideo[] = [];
	for (const block of blocks) {
		if (!block || typeof block !== "object") continue;
		if (block.type === "embed") {
			const data = block.data || {};
			const v = normalizeVideoUrl(data.source || "") || normalizeVideoUrl(data.embed || "");
			if (!v) continue;
			const caption =
				typeof data.caption === "string" && data.caption.trim()
					? data.caption.trim()
					: undefined;
			// An embed block may also carry oEmbed JSON fields (thumbnail_url,
			// duration) when it was populated from Vimeo — use them if present.
			if (typeof data.thumbnail_url === "string" && data.thumbnail_url.trim())
				v.thumbnailUrl = data.thumbnail_url.trim();
			if (typeof data.duration === "number" && data.duration > 0)
				v.duration = iso8601Duration(data.duration);
			out.push({ ...v, name: caption, description: caption });
		} else if (block.type === "raw" && typeof block.data?.html === "string") {
			out.push(...videosFromHtml(block.data.html));
		}
	}
	return out;
};

// Extract every distinct video embedded in a DocArticle item, from either body
// field. Deduped by the URL that identifies the video (a classic/new content
// pair often repeats the same embed).
const extractVideos = (item: any): ExtractedVideo[] => {
	const found: ExtractedVideo[] = [];

	for (const field of ["content", "classicContent"]) {
		const raw = item.fields?.[field];
		if (typeof raw !== "string" || !raw.trim()) continue;
		try {
			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed?.blocks)) found.push(...videosFromBlocks(parsed.blocks));
		} catch {
			/* not valid EditorJS JSON — skip */
		}
	}

	const md = item.fields?.markdownContent;
	if (typeof md === "string" && md.trim()) found.push(...videosFromHtml(md));

	// Any field holding a VimeoVideo custom-field blob (a JSON string carrying
	// both `video_id` and `thumbnail_url` — a signature EditorJS content never
	// matches). This is where a real Vimeo thumbnail/duration comes from.
	for (const val of Object.values(item.fields || {})) {
		if (typeof val !== "string" || !val.trim().startsWith("{")) continue;
		let obj: any;
		try {
			obj = JSON.parse(val);
		} catch {
			continue;
		}
		if (obj && "video_id" in obj && "thumbnail_url" in obj) {
			const v = videoFromVimeoJson(obj);
			if (v) found.push(v);
		}
	}

	// Dedupe by the URL that identifies the video, merging so a VimeoVideo blob's
	// thumbnail/title/duration enriches a bare iframe embed of the same video.
	const byKey = new Map<string, ExtractedVideo>();
	for (const v of found) {
		const key = v.embedUrl || v.contentUrl;
		if (!key) continue;
		const existing = byKey.get(key);
		if (!existing) {
			byKey.set(key, { ...v });
			continue;
		}
		if (!existing.thumbnailUrl) existing.thumbnailUrl = v.thumbnailUrl;
		if (!existing.name) existing.name = v.name;
		if (!existing.description) existing.description = v.description;
		if (!existing.duration) existing.duration = v.duration;
		if (!existing.contentUrl) existing.contentUrl = v.contentUrl;
	}
	return Array.from(byKey.values());
};
