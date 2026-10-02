/**
 * Video embeds from a bare URL in markdown.
 *
 * Authors (and agents) embed a video by putting its URL on a line of its own:
 *
 *     https://vimeo.com/123456789
 *     [Creating a content model](https://www.youtube.com/watch?v=dQw4w9WgXcQ)
 *
 * Only a paragraph whose ONLY content is one Vimeo/YouTube link becomes a player; a link
 * inside a sentence or a list stays a link, and hand-written <iframe> HTML keeps working as before.
 * Shared by the renderer (remarkVideoEmbeds in renderArticleBody.ts) and the VideoObject
 * JSON-LD scan (getRichSnippet.ts), so both always agree on what counts as an embed.
 *
 * Pure functions, no IO: renderArticleBody is synchronous and React-cache()d.
 */

export interface VideoRef {
	provider: "vimeo" | "youtube";
	id: string;
	/** Vimeo privacy hash for unlisted videos (vimeo.com/<id>/<hash> or ?h=<hash>). */
	hash?: string;
	/** Start time in seconds (YouTube t= / start=, Vimeo #t=). */
	start?: number;
}

const toSeconds = (t: string | null | undefined): number | undefined => {
	if (!t) return undefined;
	if (/^\d+$/.test(t)) return Number(t) || undefined;
	const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
	if (!m || !(m[1] || m[2] || m[3])) return undefined;
	return (Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0)) || undefined;
};

/** Parse a Vimeo or YouTube URL (any common shape). Returns null for anything else. */
export function parseVideoUrl(raw: string): VideoRef | null {
	let url: URL;
	try {
		url = new URL(raw.trim());
	} catch {
		return null;
	}
	if (url.protocol !== "https:" && url.protocol !== "http:") return null;
	const host = url.hostname.replace(/^www\./, "").toLowerCase();
	const parts = url.pathname.split("/").filter(Boolean);

	if (host === "vimeo.com" || host === "player.vimeo.com") {
		const i = parts[0] === "video" ? 1 : 0;
		const id = parts[i];
		if (!id || !/^\d+$/.test(id)) return null;
		const hash = url.searchParams.get("h") || (parts[i + 1] && /^[0-9a-f]{6,}$/i.test(parts[i + 1]) ? parts[i + 1] : undefined);
		const start = toSeconds(url.hash.match(/t=([0-9hms]+)/i)?.[1]);
		return { provider: "vimeo", id, ...(hash ? { hash } : {}), ...(start ? { start } : {}) };
	}

	if (["youtube.com", "m.youtube.com", "youtube-nocookie.com", "youtu.be"].includes(host)) {
		let id: string | null = null;
		if (host === "youtu.be") id = parts[0] || null;
		else if (parts[0] === "watch") id = url.searchParams.get("v");
		else if (["embed", "shorts", "live", "v"].includes(parts[0])) id = parts[1] || null;
		if (!id || !/^[\w-]{11}$/.test(id)) return null;
		const start = toSeconds(url.searchParams.get("t") || url.searchParams.get("start"));
		return { provider: "youtube", id, ...(start ? { start } : {}) };
	}
	return null;
}

/** The privacy-friendly player URL: Vimeo with Do Not Track, YouTube via youtube-nocookie. */
export function embedSrc(v: VideoRef): string {
	if (v.provider === "vimeo") {
		const q = new URLSearchParams({ dnt: "1" });
		if (v.hash) q.set("h", v.hash);
		return `https://player.vimeo.com/video/${v.id}?${q}${v.start ? `#t=${v.start}s` : ""}`;
	}
	const q = new URLSearchParams({ rel: "0" });
	if (v.start) q.set("start", String(v.start));
	return `https://www.youtube-nocookie.com/embed/${v.id}?${q}`;
}

/** The canonical (non-player) URL, for JSON-LD and the "watch on" fallback link. */
export function watchUrl(v: VideoRef): string {
	return v.provider === "vimeo"
		? `https://vimeo.com/${v.id}${v.hash ? `/${v.hash}` : ""}`
		: `https://www.youtube.com/watch?v=${v.id}`;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * The embed's HTML: a responsive 16:9 frame (lazy-loaded, titled for screen readers) and, when the author
 * gave a title, a caption. Inline styles + design tokens, like the callouts in renderArticleBody.ts.
 */
export function embedHtml(v: VideoRef, title?: string): string {
	const label = title?.trim() || (v.provider === "vimeo" ? "Vimeo video" : "YouTube video");
	const caption = title?.trim()
		? `<figcaption style="margin-top:.5rem;font-size:.875rem;color:var(--muted-foreground)">${esc(title.trim())}</figcaption>`
		: "";
	return (
		`<figure class="video-embed" data-provider="${v.provider}" style="margin:1.5rem 0">` +
		`<div style="position:relative;aspect-ratio:16/9;border-radius:var(--r-sm);overflow:hidden;background:#000">` +
		`<iframe src="${esc(embedSrc(v))}" title="${esc(label)}" loading="lazy" ` +
		`allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media" allowfullscreen ` +
		`referrerpolicy="strict-origin-when-cross-origin" style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe>` +
		`</div>${caption}</figure>`
	);
}

/** A markdown line that is only a video URL (bare, <autolink> or [title](url)). */
const LINE = /^[ \t]*(?:\[([^\]\n]*)\]\((\S+?)\)|<(\S+)>|(https?:\/\/\S+))[ \t]*$/;

/** Videos embedded by URL-on-its-own-line in a markdown string (for the JSON-LD scan). */
export function videosFromMarkdownLines(md: string): { ref: VideoRef; title?: string }[] {
	const out: { ref: VideoRef; title?: string }[] = [];
	let inFence = false;
	for (const line of md.split(/\r?\n/)) {
		if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; continue; }
		if (inFence) continue;
		const m = line.match(LINE);
		if (!m) continue;
		const url = m[2] || m[3] || m[4];
		const ref = parseVideoUrl(url);
		if (!ref) continue;
		const title = m[1] && m[1].trim() !== url ? m[1].trim() : undefined;
		out.push({ ref, ...(title ? { title } : {}) });
	}
	return out;
}

/**
 * remark plugin: a paragraph whose only content is a single Vimeo/YouTube link becomes an embed.
 * Runs on mdast (after remark-gfm, so bare URLs are already links) and emits an `html` node, which
 * rehype-raw turns into real elements like any author-written HTML.
 */
export function remarkVideoEmbeds() {
	return (tree: any) => {
		const walk = (node: any) => {
			if (!node.children) return;
			for (let i = 0; i < node.children.length; i++) {
				const child = node.children[i];
				if (child.type === "paragraph") {
					const kids = (child.children || []).filter((c: any) => !(c.type === "text" && !c.value.trim()));
					if (kids.length === 1 && kids[0].type === "link") {
						const link = kids[0];
						const ref = parseVideoUrl(link.url || "");
						if (ref) {
							const text = (link.children || []).map((c: any) => c.value || "").join("").trim();
							const title = text && text !== link.url ? text : undefined;
							node.children[i] = { type: "html", value: embedHtml(ref, title) };
							continue;
						}
					}
				}
				// Don't descend into code, or into lists: a list of video links is meant as links (and the
				// JSON-LD line scan ignores list lines too). Blockquotes, callouts etc. are fine.
				if (!["code", "inlineCode", "list"].includes(child.type)) walk(child);
			}
		};
		walk(tree);
	};
}
