import { AgilityPageData } from "lib/cms/getAgilityPage";

const SITE_URL = "https://agilitycms.com/docs";

const PUBLISHER = {
	"@type": "Organization",
	name: "Agility CMS",
	logo: {
		"@type": "ImageObject",
		url: "https://agilitycms.com/assets/agility-logo.svg",
	},
};

const WEBSITE_SCHEMA = {
	"@context": "https://schema.org",
	"@type": "WebSite",
	name: "Agility CMS Documentation",
	url: SITE_URL,
};

/**
 * JSON-LD for docs pages (principles from the marketing site's
 * getRichSnippet: string-returning builder, injected as an in-body
 * <script type="application/ld+json"> — NOT via the Metadata API).
 *
 * - Hub (home): WebSite
 * - Doc articles (dynamic DocArticle items): TechArticle + BreadcrumbList
 * - Other static pages: BreadcrumbList when they're nested
 */
export const getRichSnippet = async ({
	sitemapNode,
	dynamicPageItem,
}: AgilityPageData): Promise<string | null> => {
	if (!sitemapNode) return null;

	const isHomepage = sitemapNode.path === "/" || sitemapNode.path === "/home";
	if (isHomepage) return JSON.stringify(WEBSITE_SCHEMA);

	const pageUrl = `${SITE_URL}${sitemapNode.path}`;
	const schemas: any[] = [];

	// Breadcrumbs from the path segments (Docs -> section -> article).
	const segments = sitemapNode.path.split("/").filter(Boolean);
	if (segments.length > 0) {
		schemas.push({
			"@context": "https://schema.org",
			"@type": "BreadcrumbList",
			itemListElement: [
				{ "@type": "ListItem", position: 1, name: "Docs", item: SITE_URL },
				...segments.map((seg, idx) => ({
					"@type": "ListItem",
					position: idx + 2,
					name: idx === segments.length - 1 ? sitemapNode.title : humanize(seg),
					item: `${SITE_URL}/${segments.slice(0, idx + 1).join("/")}`,
				})),
			],
		});
	}

	if (dynamicPageItem?.properties?.definitionName === "DocArticle") {
		const datePublished =
			dynamicPageItem.fields.date || dynamicPageItem.properties.modified;

		schemas.push({
			"@context": "https://schema.org",
			"@type": "TechArticle",
			mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
			headline: dynamicPageItem.fields.title,
			description: dynamicPageItem.fields.description || undefined,
			url: pageUrl,
			publisher: PUBLISHER,
			datePublished,
			dateModified: dynamicPageItem.properties.modified,
		});

		// One VideoObject per video embedded in the article body, so pages that
		// carry a video are eligible for video rich results / the Video tab.
		// YouTube ids yield a derivable thumbnail; Vimeo embeds are enriched with
		// a real thumbnail/title/duration via Vimeo's oEmbed API (cached a day),
		// falling back gracefully if that lookup fails. uploadDate isn't tracked
		// per video, so it falls back to the article's publish date.
		const videos = extractVideos(dynamicPageItem);
		await enrichVimeoThumbnails(videos);
		videos.forEach((v, i) => {
			const fallbackName =
				videos.length > 1
					? `${dynamicPageItem.fields.title} — Video ${i + 1}`
					: dynamicPageItem.fields.title;
			schemas.push({
				"@context": "https://schema.org",
				"@type": "VideoObject",
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

	if (schemas.length === 0) return null;
	return JSON.stringify(schemas.length === 1 ? schemas[0] : schemas);
};

const humanize = (slug: string) =>
	slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

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
// Cached a day so builds/requests don't refetch; failures resolve to {} so the
// VideoObject simply falls back to whatever the body already provided.
const vimeoOEmbed = async (id: string): Promise<Partial<ExtractedVideo>> => {
	try {
		// width=1280 makes Vimeo return a large (1280px) thumbnail rather than the
		// ~295px default — Google prefers high-res thumbnails for video results.
		const res = await fetch(
			`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${id}&width=1280`,
			{ next: { revalidate: 86400 } },
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
