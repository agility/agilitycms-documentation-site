# Handoff: `VideoObject` JSON-LD for embedded videos

**Purpose:** emit schema.org `VideoObject` structured data for any video embedded in a
page's content, so those pages become eligible for Google video rich results and the
Video tab. This mirrors what we shipped on the **docs site**
(`lib/cms-content/getRichSnippet.ts`) and is written to be dropped into the main
website's Next.js App Router repo with minimal adaptation.

Audience: a developer on the main site who already has some JSON-LD output and wants to
add video support.

---

## 1. Background / why this shape

- **Structured data is the primary signal.** Google reads `VideoObject` JSON-LD directly.
  A video sitemap is a *supplement*, not a substitute — do the structured data first.
- **Eligibility rule that bites:** a video is only eligible for video results when it is
  a meaningful part of the page's content and each video has a stable page. Emitting the
  markup is necessary but not sufficient — don't expect results on pages where the video
  is incidental.
- **Required `VideoObject` fields** (Google): `name`, `description`, `thumbnailUrl`,
  `uploadDate`. **Recommended:** `duration`, `contentUrl`, `embedUrl`. If `thumbnailUrl`
  or `uploadDate` is missing the node is still valid schema but won't win a rich result.
- **Host matters:**
  - *YouTube* — a thumbnail is derivable from the video id with no network call; YouTube
    is the canonical host, so credit largely accrues there regardless.
  - *Vimeo* — no derivable thumbnail; we fetch it from Vimeo's public **oEmbed** API.
  - *Self-hosted* (`<video>`) — use the `poster` as the thumbnail and the file as
    `contentUrl`.

---

## 2. What you must adapt to the main site

The **extraction** step is the only part that's content-model-specific. Everything
downstream (normalization, oEmbed enrichment, building the schema) is portable as-is.

Figure out **where videos live** in the main site's Agility content, then feed that into
the library. Likely sources, in order of commonness:

1. **Rich-text / HTML body fields** → pass the HTML string(s) to `videosFromHtml()`.
   This is the universal path and probably covers most of the site.
2. **EditorJS JSON bodies** (if any) → pass parsed `blocks` to `videosFromBlocks()`.
   The docs site uses this; the main site may not.
3. **A dedicated video field/component** (e.g. a `VimeoVideo` custom field, or a "Video
   Hero" module storing an oEmbed JSON blob) → pass the item's `fields` to the field
   scan, which recognizes a `{ video_id, thumbnail_url, ... }` blob.
4. **Page modules that render `<iframe>`/`<video>`** → render or read their HTML and pass
   it to `videosFromHtml()`.

You do **not** need all four. Wire up whichever your content actually uses.

---

## 3. The portable module

Drop this in as e.g. `lib/seo/videoJsonLd.ts`. It has no docs-site dependencies. It runs
in a **server** context (it uses `fetch` with App-Router cache options).

```ts
// lib/seo/videoJsonLd.ts
//
// Build schema.org VideoObject JSON-LD for videos embedded in CMS content.
// Give it HTML and/or EditorJS blocks and/or raw field values; it returns
// ready-to-serialize VideoObject nodes, enriching Vimeo embeds with a real
// thumbnail/title/duration via the oEmbed API (cached, fails soft).

export interface ExtractedVideo {
	embedUrl?: string;
	contentUrl?: string;
	name?: string;
	description?: string;
	thumbnailUrl?: string;
	duration?: string; // ISO 8601, e.g. "PT2M30S"
}

// --- URL / id helpers -----------------------------------------------------

const youTubeId = (url: string): string | null => {
	const m = url.match(
		/(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?(?:.*&)?v=)|youtu\.be\/)([\w-]{11})/i,
	);
	return m ? m[1] : null;
};

const vimeoId = (url: string): string | null => {
	const m = url.match(/(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)/i);
	return m ? m[1] : null;
};

// Turn a recognized video URL into a VideoObject-ready shape, or null.
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

const iso8601Duration = (seconds: number): string => {
	const s = Math.round(seconds);
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	return `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}${sec || (!h && !m) ? `${sec}S` : ""}`;
};

// Read one HTML attribute out of a single opening tag string.
const attr = (tag: string, name: string): string | undefined => {
	const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"));
	return m ? m[1] : undefined;
};

// --- Extractors (adapt/select these to the site's content model) ----------

// <iframe> embeds and <video> tags in a raw HTML string. The universal path.
export const videosFromHtml = (html: string): ExtractedVideo[] => {
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

// EditorJS `embed` and raw-HTML blocks. Skip if the site doesn't use EditorJS.
export const videosFromBlocks = (blocks: any[]): ExtractedVideo[] => {
	const out: ExtractedVideo[] = [];
	for (const block of blocks || []) {
		if (!block || typeof block !== "object") continue;
		if (block.type === "embed") {
			const data = block.data || {};
			const v = normalizeVideoUrl(data.source || "") || normalizeVideoUrl(data.embed || "");
			if (!v) continue;
			const caption =
				typeof data.caption === "string" && data.caption.trim() ? data.caption.trim() : undefined;
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

// A "VimeoVideo" custom-field JSON blob (Vimeo oEmbed shape). Carries a real
// thumbnail/title/duration that bare iframes don't.
export const videoFromVimeoJson = (obj: any): ExtractedVideo | null => {
	if (!obj || typeof obj !== "object") return null;
	const html = typeof obj.html === "string" ? obj.html : "";
	const idFromHtml = html
		? vimeoId(attr(html.match(/<iframe\b[^>]*>/i)?.[0] || "", "src") || "")
		: null;
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

// Scan a fields object for any string value that is a VimeoVideo blob
// (signature: has both `video_id` and `thumbnail_url`).
export const videosFromFields = (fields: Record<string, unknown> = {}): ExtractedVideo[] => {
	const out: ExtractedVideo[] = [];
	for (const val of Object.values(fields)) {
		if (typeof val !== "string" || !val.trim().startsWith("{")) continue;
		let obj: any;
		try {
			obj = JSON.parse(val);
		} catch {
			continue;
		}
		if (obj && "video_id" in obj && "thumbnail_url" in obj) {
			const v = videoFromVimeoJson(obj);
			if (v) out.push(v);
		}
	}
	return out;
};

// --- Vimeo oEmbed enrichment ----------------------------------------------

const vimeoOEmbed = async (id: string): Promise<Partial<ExtractedVideo>> => {
	try {
		// width=1280 → large thumbnail rather than the ~295px default.
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

// --- Dedupe + public entry point ------------------------------------------

const dedupe = (found: ExtractedVideo[]): ExtractedVideo[] => {
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

export interface VideoObjectInput {
	/** Body HTML (rich-text field). Accepts one string or several. */
	html?: string | string[];
	/** EditorJS blocks, if the body is EditorJS JSON. */
	blocks?: any[];
	/** Item fields to scan for a VimeoVideo oEmbed blob. */
	fields?: Record<string, unknown>;
	/** Fallback VideoObject name (usually the page/article title). */
	name: string;
	/** Fallback description (usually the page/article description). */
	description?: string;
	/** ISO date used for uploadDate when the true upload date is unknown. */
	uploadDate?: string;
}

// Returns an array of schema.org VideoObject objects (possibly empty).
// Serialize alongside your other JSON-LD nodes.
export const buildVideoObjects = async (input: VideoObjectInput): Promise<any[]> => {
	const found: ExtractedVideo[] = [];

	if (input.html) {
		const htmls = Array.isArray(input.html) ? input.html : [input.html];
		for (const h of htmls) if (h) found.push(...videosFromHtml(h));
	}
	if (input.blocks) found.push(...videosFromBlocks(input.blocks));
	if (input.fields) found.push(...videosFromFields(input.fields));

	const videos = dedupe(found);
	await enrichVimeoThumbnails(videos);

	return videos.map((v, i) => {
		const fallbackName = videos.length > 1 ? `${input.name} — Video ${i + 1}` : input.name;
		return {
			"@context": "https://schema.org",
			"@type": "VideoObject",
			name: v.name || fallbackName,
			description: v.description || input.description || input.name,
			thumbnailUrl: v.thumbnailUrl || undefined,
			uploadDate: input.uploadDate || undefined,
			duration: v.duration || undefined,
			contentUrl: v.contentUrl || undefined,
			embedUrl: v.embedUrl || undefined,
		};
	});
};
```

---

## 4. Wiring it into the page's JSON-LD

`buildVideoObjects` is **async** (it may hit Vimeo). Call it wherever you assemble
JSON-LD — a Server Component or a server helper — and merge the result into your existing
`@graph`/array of nodes:

```ts
// In your page's server component / rich-snippet builder:
import { buildVideoObjects } from "lib/seo/videoJsonLd";

const videoNodes = await buildVideoObjects({
	html: item.fields.bodyHtml,          // ← your rich-text field(s)
	// blocks: JSON.parse(item.fields.content || "{}").blocks,  // if EditorJS
	// fields: item.fields,               // if a VimeoVideo blob may be present
	name: item.fields.title,
	description: item.fields.description,
	uploadDate: item.fields.date || item.properties.modified,
});

const nodes = [ /* ...your existing WebPage / Article / Breadcrumb nodes... */, ...videoNodes ];

// Emit once, in the body (React hoists it):
// <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(nodes) }} />
```

If your JSON-LD builder is currently **synchronous**, make it `async` and `await` it at
the call site (that's the one change the async fetch forces — the docs site did exactly
this).

---

## 5. Caveats (carry these over honestly)

- **`uploadDate` is a proxy.** Vimeo's public oEmbed doesn't return the true upload date,
  so we fall back to the page's publish/modified date. Good enough to satisfy the required
  field; not the real date. Vimeo's *authenticated* API returns `created_time` if you ever
  want it (needs a token — probably not worth it).
- **Vimeo requires a network call.** Thumbnails come from oEmbed. It's cached
  (`revalidate: 86400`) and fails soft, but it is a runtime dependency on vimeo.com. If a
  video is private/deleted, that node simply ships without a thumbnail.
- **YouTube nodes are complete without a call** (derived thumbnail), but YouTube remains
  the canonical host — don't expect to outrank YouTube for its own video.
- **Self-hosted needs a `poster`.** Without one there's no thumbnail and the node won't be
  rich-result eligible. Make sure `<video poster="...">` is set in content.
- **Eligibility ≠ emission.** Pages where the video is incidental won't get video results
  even with perfect markup. Prioritize pages built around a video.
- **Server-only.** Uses `fetch` with `next: { revalidate }`. Don't import into a Client
  Component.

---

## 6. Validation

- **Locally:** import `buildVideoObjects`, feed it a real page's HTML, and inspect the
  output. On the docs site we transpiled the module standalone and ran it against real
  content + a live Vimeo id — a raw `<iframe>` with no thumbnail came back with a real
  1280px `i.vimeocdn.com` thumbnail and `duration: "PT4M7S"`.
- **After deploy:** paste a live URL into Google's
  [Rich Results Test](https://search.google.com/test/rich-results) and confirm the
  `VideoObject` is detected with `name`, `thumbnailUrl`, `uploadDate`, `description`
  present. Then watch Search Console → Video indexing.

---

## 7. Checklist

- [ ] Identify where videos live in the main site's content model (§2).
- [ ] Add `lib/seo/videoJsonLd.ts` (§3).
- [ ] Wire `buildVideoObjects` into the JSON-LD builder; make it `async` (§4).
- [ ] Pass the right source(s): `html` and/or `blocks` and/or `fields`.
- [ ] Confirm `uploadDate` maps to a real date field.
- [ ] Verify one video page locally, then via Rich Results Test post-deploy.
- [ ] (Optional, later) Video sitemap for large libraries; true `uploadDate` via Vimeo's
      authenticated API.

---

*Reference implementation: `lib/cms-content/getRichSnippet.ts` in the docs site
(agilitycms-documentation-site). This handoff is a generalized extract of that code.*
