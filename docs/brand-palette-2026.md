# The 2026 brand palette, in the docs site

Source: `design/handoff/brand-palette-handoff.html` in **Agility-Website-Nextjs-2026**
(the marketing site). Jina chose **Concept 4** on 2026-08-21 — teal `#028D83`,
blue `#295BAC`, CTA yellow `#FFCB28` — on the **Stone** background with **Warm
bone** body copy. This file records how that palette lands in *this* repo.

Live token values are in [styles/tokens.css](../styles/tokens.css); this document
is the reasoning behind them. **Deploying this? Read
[Rollout to production](#rollout-to-production) at the bottom first — there is a
manual media step that code cannot do.** The marketing site's copy of the same palette is
`src/app/globals.css` in Agility-Website-Nextjs-2026 — the two must stay in step.

---

## What changed here, and what didn't

**The neutrals did not change.** Stone surfaces and Warm bone text were already
this site's defaults, in both themes, at the exact hexes the brand handoff
specifies. Choosing them confirmed them:

| Token | Dark | Light |
| --- | --- | --- |
| `--bg` | `#181716` | `#F1EFE9` |
| `--surface` | `#1F1E1C` | `#FBF9F3` |
| `--raised` | `#2A2826` | `#FEFDF9` |
| `--border` / `--border-strong` | `#3B3935` / `#504D49` | `#E4E0D8` / `#CFC9BC` |
| `--text` / `--text-2` | `#F1EFE9` / `#C4BFB5` | `#181716` / `#3B3935` |
| `--muted` / `--faint` | `#AAA49B` / `#989289` | `#5E5951` / `#6E685E` |

**The three brand hues did change.** The teal, blue and yellow this site shipped
were the pre-2026 Ocean values and are now replaced by the brand palette.

---

## Token mapping

The docs site keeps its own vocabulary (`--primary` / `--secondary` /
`--tertiary`) rather than adopting the marketing site's `--brand-ocean` /
`--brand-blue` / `--cta`. Renaming would touch every component and is worth
doing deliberately, not as part of a colour change. The values are identical.

| Docs token | Marketing token | Dark | Light |
| --- | --- | --- | --- |
| `--primary` | `--brand-ocean` | `#028D83` | `#027970` |
| `--primary-text` | `--brand-ocean-text` | `#02A196` | `#027970` |
| `--primary-bright` | `--brand-ocean-bright` | `#03B5A8` | `#028D83` |
| `--primary-dim` | `--brand-ocean-dim` | `#026F67` | `#015B54` |
| `--on-primary` | `--sidebar-primary-foreground` | `#0E0D0C` | `#FFFFFF` |
| `--secondary` | `--brand-blue` | `#295BAC` | `#295BAC` |
| `--secondary-bright` | `--brand-blue-bright` | `#5989D8` | `#2F68C5` |
| `--secondary-dim` | `--brand-blue-dim` | `#1F4583` | `#234E93` |
| `--tertiary` | `--cta` | `#FFCB28` | `#FFCB28` |
| `--tertiary-bright` | `--cta-bright` | `#FFD75B` | `#FFD75B` |
| `--tertiary-dim` | `--cta-dim` | `#DEAE16` | `#DEAE16` |

---

## The three rules that fall out of this

### 1. The teal is two tokens on dark, and they are not interchangeable

`--primary` is the **fill and graphic** teal: tints, borders, rings, the focus
indicator, the active nav pill, list bullets. `--primary-text` is the **type and
icon** teal: links, active nav labels, kickers, feature-card ink.

They exist because one hex cannot do both jobs. Jina's `#028D83` as body-size
copy reads 4.38 / 4.08 / 3.59 on `--bg` / `--surface` / `--raised` — under the
4.5 AA bar on every surface. `--primary-text` is the same hue and saturation 4%
lighter and reads 5.58 / 5.19 / 4.57. As a *rule or ring* the fill value is fine:
non-text graphics answer to a 3:1 bar, and 3.59 clears it.

Light needs no split — `#027970` already clears AA as copy (4.60 / 5.02 / 5.20)
— so both tokens hold the same value there, and a component written against
either one is correct in both themes.

**Putting `--primary` on body-size copy is the one mistake this palette invites.**

### 2. Blue is a background colour, never a text colour on dark

`#295BAC` as copy on dark is 2.72 / 2.53 / 2.23 — under a third of the bar, with
no surface in the system where it reads. As a white-label fill it is excellent
(6.59:1). On dark, anything that is text *or* a thin graphic takes
`--secondary-bright` (`#5989D8`, 5.11 / 4.75 / 4.19) instead — that is why
`html.dark .ocean-card-secondary` overrides both `--tcink` and `--tcbar`.

On light the reverse holds: `#295BAC` is 5.73:1 as copy and needs no shift.

### 3. Each fill takes one specific label colour, and it flips by theme

| Fill | Label | Ratio |
| --- | --- | --- |
| `--tertiary` `#FFCB28` | `--on-color` `#0E0D0C` | 12.78 |
| `--primary` dark `#028D83` | `--on-primary` `#0E0D0C` | 4.75 (white would be 4.09) |
| `--primary` light `#027970` | `--on-primary` `#FFFFFF` | 5.29 (near-black would be 3.67) |
| `--secondary` `#295BAC` | `#FFFFFF` | 6.59 |

The teal fill is the awkward one: it takes near-black on dark and white on light.
That is what `--on-primary` is for — use it, not `--on-color`, for any label
sitting on a `--primary` fill. (`--on-color` remains correct on the yellow, which
is the same hex in both themes.)

---

## Where this is wired

- [styles/tokens.css](../styles/tokens.css) — the values, both theme blocks.
- [styles/globals.css](../styles/globals.css) — `.prose a` and the active
  code-tab label take `--primary-text`; the tab underline and the
  search-highlight tint stay on `--primary`. The `.ocean-card-*` accent classes
  keep bar and ink separate.
- **Prose list markers.** `globals.css` used to colour these through
  `.prose ul > li::before` / `.prose ol > li::before`. Those rules compile (as
  `:before`, single-colon, after Lightning CSS) but never paint — a `::before`
  with no `content` generates no box — so `@tailwindcss/typography` was left
  drawing the markers via `::marker` in its own cool-grey defaults. Measured in
  the browser: counters `#6A7282` = **3.70:1** on `--bg` (under the 4.5 bar for
  type) and bullets `#D1D5DC` = **1.28:1** on the light `--bg` (invisible). The
  dead rules are replaced by the variables the plugin actually reads —
  `--tw-prose-bullets: var(--primary)` (a graphic, 3:1 bar) and
  `--tw-prose-counters: var(--primary-text)` (type, 4.5 bar) — which is what the
  original rules were trying to express. Verified in both themes.
- Components — every `text-(--primary)` became `text-(--primary-text)`, with two
  deliberate exceptions: `FilterBlock`'s `form-checkbox` (the forms plugin uses
  `color` for the checked box, so that is a fill) and every `border-`, `ring-`
  or `bg-` use.
- [public/assets/agility-docs-logo.svg](../public/assets/agility-docs-logo.svg) —
  the mark's yellow moved `#FFC414` → `#FFCB28` to match the brand CTA yellow
  and the marketing site's logo.

## Known gaps

- **Three diagrams need re-uploading to Agility media.** The repo sources in
  `docs/diagrams/` were byte-identical to the live CDN copies under
  `agility-cms-docs/docs-redesign/`, and both carried the pre-2026 hexes. The
  sources have now been recoloured (2026-08-24); **the CDN copies have not** —
  they still render the old palette on live docs pages until someone uploads
  the updated files. Five other CDN diagrams scanned clean.

  Mapping applied, per the dark-theme fill/type split:

  | Old | New | Why |
  | --- | --- | --- |
  | `#3EB4C2` | `#028D83` | all uses are graphics (rect/path/circle fills, strokes) |
  | `#0B5C66` | `#026F67` | dark teal panel fill → `--primary-dim` |
  | `#5FC8D4` | `#F1EFE9` | its one use is the `/pricing` label on a teal pill; the accent teal there is 1.88:1, warm bone is 5.26:1 and matches the sibling label |
  | `#83A9F4` | `#5989D8` | blue as text *and* as thin graphics on dark |
  | `#FFC414` | `#FFCB28` | CTA yellow |

  Two things also fixed while in there, both pre-existing and unrelated to the
  palette: `#76716B` (`--n-500`, not a text token) was doing fine-print duty at
  3.04–3.70:1 and became `--faint` `#989289`; and a geometry-aware sweep now
  confirms **every text element in all three diagrams clears AA** against the
  shape it actually sits on.
- **`public/assets/bg-top.svg` / `bg-bottom.svg`** also carry `#ffc414`. Both are
  currently unreferenced; left alone.
- **Status colours** (`--ok` / `--warn` / `--err` / `--info`) are deliberately
  untouched. The brand handoff brackets them out as functional, not brand.
  `--err` (`#C0362F` light / `#F26A6E` dark) differs from the marketing site's
  `--status-err` (`#C81E1E` / `#FA5252`) while the other three match exactly.
  Decision (2026-08-24): leave it. Both pass AA on every surface, and the docs
  values are actually the stronger pair on dark (6.02:1 vs 5.45:1). `--err`
  surfaces in only three places here — a 9px decorative dot in the CodeBlock
  chrome, the route-level error message, and `.hljs-deletion` in code diffs — so
  aligning it would buy no brand consistency and risks undoing a deliberate
  choice. One-line change in `tokens.css` if parity is ever wanted.
- **Open questions from the handoff** that this site does not hit: it has no
  full-colour teal section panel (decision 2) and no light-theme rich-text link
  hover (there is no `.prose a:hover` rule), so neither issue applies here.

---

## Appendix: the on-this-page nav and article hydration (2026-08-24)

Two fixes that came out of testing the palette, recorded here because they touch
the same components.

**The nav listed another page's headings.** `ArticleNav` scraped
`document.querySelectorAll("#DynamicArticleDetails h2")`. During an App Router
client transition the outgoing page is still mounted — two
`#DynamicArticleDetails` subtrees exist at once — so the query merged both
articles. The headings are now derived on the server
([lib/docs/renderArticleBody.ts](../lib/docs/renderArticleBody.ts)) and passed to
`ArticleNav` as a prop, so there is nothing to scrape.

**The nav took up to 9 seconds to appear.** It was built 100ms after hydration,
so it inherited however long the page took to hydrate. `DynamicArticleDetails`
was `"use client"`, which meant the whole render path ran twice: the server
produced the HTML, then the browser re-ran unified/remark/rehype over the
markdown and re-ran highlight.js over every code block, producing byte-identical
output, before hydrating ~1,000 highlighted nodes. Measured on the dev server:

| Page | Body | Code blocks | TOC appeared |
| --- | --- | --- | --- |
| content-sync-api | 4 KB | 1 | 102 ms |
| concepts | 12 KB | 0 | 102 ms |
| content-fetch-api | 74 KB | 10 | **8,916 ms** |

Until hydration finished nothing on the page was interactive — nav, search,
theme toggle, all of it. The nav was just the visible symptom.

The article body is now a server component. Three things genuinely needed the
browser and are now small, separate client components: the Classic-UI toggle
([ClassicModeSwitch](../components/agility-pageModules/ClassicModeSwitch.tsx)),
the code-tab upgrade and inline-script re-execution
([ArticleBodyEnhancer](../components/common/ArticleBodyEnhancer.tsx)), and the
scroll-spy in `ArticleNav`. Two other modules were `"use client"` for no good
reason and dragged highlight.js in with them — `BlockEditor` (no hooks or state
at all) and `ocean/CodeBlock` (highlighting in an effect; its copy button is now
[CopyCodeButton](../components/agility-pageModules/ocean/CopyCodeButton.tsx)).

Result on `/docs/developers/content-fetch-api`: TOC **8,916 ms → 0 ms** (it is in
the server HTML), client JS **13,252 KB → 11,227 KB** (dev, unminified; 32 → 27
chunks), and zero chunks containing highlight.js or the remark/rehype pipeline.
Verified: highlighting, the Classic toggle, scroll-spy tracking, no duplicate
heading ids across the two bodies, and the markdown and blocks paths both intact.

Known limitation, unchanged from before: with Classic UI toggled on, the nav
still lists the standard body's headings. The old code captured them once at
mount and never re-read them, so this is not new — but the anchors now point
into a hidden body rather than a missing one.

Not measured: production. Every number above is from the dev server, where
React runs unminified in development mode. Production was already going to be
faster; the duplicated work and bundle weight were real in both.


---

## Rollout to production

Everything in this change set ships with the code **except one manual step**.

### 1. Upload the three recoloured diagrams (REQUIRED — do this at deploy)

The repo sources are recoloured; the live CDN copies are not. Until they are
replaced, three docs pages render the pre-2026 teal and blue against the new
palette.

| Upload this | To this CDN path |
| --- | --- |
| `docs/diagrams/diagram-web-studio.svg` | `agility-cms-docs/docs-redesign/docs-diagram-web-studio.svg` |
| `docs/diagrams/diagram-page-management.svg` | `agility-cms-docs/docs-redesign/docs-diagram-page-management.svg` |
| `docs/diagrams/diagram-ai-mcp.svg` | `agility-cms-docs/docs-redesign/docs-diagram-ai-mcp.svg` |

Notes:
- **The CDN filenames carry a `docs-` prefix the repo filenames do not.** Keep
  the CDN names exactly as above or the `<img src>` in the articles breaks.
- These replace live media on the production docs site, so the change is visible
  the moment it is saved — do it as part of the deploy, not before.
- `cdn.aglty.io` may serve a cached copy of the old file for a while. Hard-reload
  and confirm rather than assuming; if the URL is unversioned, allow for cache TTL.
- Ordering is not critical either way: old diagrams on the new palette look
  off-brand, new diagrams on the old palette look equally off. Same-day is fine.

### 2. Verify after deploy

- A heavy article (`/docs/developers/content-fetch-api`): the on-this-page nav is
  present in view-source, code is syntax-highlighted, the Classic UI toggle
  switches bodies, and the nav highlight follows scrolling.
- A markdown article (`/docs/overview/publishing-to-multiple-destinations`):
  body renders, code highlighted, prose list markers are teal.
- Both themes — dark is the default, `?theme=light` for the other.
- The preview panel: right edge, opens a modal, Copy link and Edit in CMS work.
- The three diagram pages, once uploaded.

### 3. Measure what was never measured

All the hydration numbers in the appendix above are from the **dev server**. Run
Lighthouse (or just watch TBT/INP) on `/docs/developers/content-fetch-api` in
production to get the real figure for the server-component refactor. The
direction is certain; the magnitude is not.

### 4. Left deliberately undone

- `--err` still differs from the marketing site's `--status-err`. Reasoning in
  Known gaps above; one line in `tokens.css` if parity is ever wanted.
- `public/assets/bg-top.svg` / `bg-bottom.svg` still carry the old `#ffc414`.
  Nothing references them.
- With Classic UI toggled on, the on-this-page nav lists the standard body's
  headings. Pre-existing.
