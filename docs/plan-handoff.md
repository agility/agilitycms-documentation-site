# Coding Agent Handoff: Agility Docs Rebuild

You are implementing a rebuild of the Agility CMS documentation site. This brief is self-contained. Read it fully before writing code. Where it conflicts with your assumptions, this brief wins. Where it is silent, ask before inventing.

---

## 0. Goal

Rebuild the docs section pages to put three flagship capabilities front and centre: Web Studio, Page Management and Orchestration, and AI plus the MCP server. Keep every existing article and URL. Add light and dark mode. Match the new marketing "ocean" design system exactly.

The rebuild is itself a proof of the product, so build the pages as component-driven Agility pages, not hardcoded React.

---

## 1. Stack and where things live

- Frontend: Next.js, rendering content from Agility CMS.
- Styling: Tailwind CSS v4 (CSS-first `@theme`), tokens in oklch on the live site today.
- Docs live under `/docs` and share the marketing design system.
- Reference implementation of the target look: `agility-docs-mockup-ocean.html` (static HTML, both themes, validated). Treat it as the visual and token source of truth. Do not ship it. Port it.
- Written plan for scope and rationale: `agility-docs-master-build-plan.md`.
- Page copy for every page: `agility-docs-copy-and-build-strategy.md` (Part A).

---

## 2. Hard constraints

1. Do not change any existing article URL. Preserve all content.
2. Any section path that moves gets a server-side 301. No client-only redirects. No redirect chains.
3. Light and dark mode both required. Class-based dark on `<html>` via `data-theme`, with a three-state control: light, dark, system. Respect `prefers-color-scheme` for system and on first load.
4. No `localStorage` in any artifact or preview build. In the real Next.js app, persistence via `localStorage` plus an inline no-flash head script is expected and correct. Do not confuse the two environments.
5. WCAG AA for all text and interactive colour pairs, in both themes. Verify, do not assume. See section 6.
6. Do not fork the palette or type. Reuse the ocean tokens verbatim (section 3).
7. Components read semantic tokens only (`--primary`, `--surface`, `--text`). Never hardcode hex in a component.

---

## 3. Design tokens (verbatim, verified)

> **Superseded in part (2026-08-21).** The neutrals, radius and type below are
> still current. The three brand hues — `--primary` (teal), `--secondary` (blue)
> and `--tertiary` (yellow) — were replaced by the 2026 brand palette. See
> [brand-palette-2026.md](brand-palette-2026.md) for the live values and the
> fill-vs-type split the teal now carries. The hexes in this section are kept as
> the historical record of the July build.

Warm neutral scale, shared by both themes:

```
--n-950:#0E0D0C; --n-900:#181716; --n-850:#1F1E1C; --n-800:#2A2826;
--n-700:#3B3935; --n-600:#504D49; --n-500:#76716B; --n-400:#9E988F;
--n-300:#C4BFB5; --n-200:#E3E0D8; --n-100:#F1EFE9; --n-50:#F8F7F2;
--tertiary:#FFC414; --tertiary-bright:#FFD75E; --tertiary-dim:#E0A800;
```

Radius (sharp corners are a signature, do not round them):
```
--r-xs:2px; --r-sm:2px; --r-md:2px; --r-lg:4px; --r-round:999px;
```

Type:
```
--font:"Mulish", system-ui, sans-serif;      /* body */
--serif:"Inder", system-ui, sans-serif;        /* headings. NOTE: 400 weight only, see gotchas */
--mono:"Fira Mono", ui-monospace, monospace;   /* eyebrows, labels, section numbers, code */
```

Light theme:
```
--primary:#0F7885; --primary-bright:#159AAA; --primary-dim:#0B5C66;
--secondary:#3A6FD0; --secondary-bright:#6A96E8; --secondary-dim:#2A57B0;
--ok:#1A6E36; --warn:#836400; --err:#C0362F; --info:#2F62C9;
--bg:#F1EFE9; --surface:#FBF9F3; --raised:#FEFDF9;
--border:#E4E0D8; --border-strong:#CFC9BC;
--text:#181716; --text-2:#3B3935; --muted:#5E5951; --faint:#6E685E;
--on-color:#0E0D0C;
```

Dark theme:
```
--primary:#3EB4C2; --primary-bright:#5FC8D4; --primary-dim:#2E97A4;
--secondary:#83A9F4; --secondary-bright:#A6C1F8; --secondary-dim:#5E90F0;
--ok:#79C06B; --warn:#F2C23E; --err:#F26A6E; --info:#79BBF0;
--bg:#181716; --surface:#1F1E1C; --raised:#2A2826;
--border:#3B3935; --border-strong:#504D49;
--text:#F1EFE9; --text-2:#C4BFB5; --muted:#AAA49B; --faint:#989289;
--on-color:#0E0D0C;
```

Colour usage rules, non-negotiable:
- Primary teal is the interactive/brand accent: links, active nav, focus rings.
- Yellow (tertiary) is a fill only. Yellow text or yellow icons on a light surface fail contrast. Never use yellow as text or as an icon glyph colour on light. As a button or chip background with `--on-color` text, it is fine.
- Focus ring pattern: `box-shadow:0 0 0 3px color-mix(in srgb, var(--primary) 45%, transparent)`.

---

## 4. Component architecture (Agility)

Build these in Agility, then map each to one React component through the existing component-driven page registry. Reuse existing models before adding near-duplicates.

Page models:
- `Docs Landing Page` — zones: Hero, Featured, Main, Sidebar. Used by the hub and all section and flagship landings.
- `Docs Article Page` — zones: Header, Body, Aside. Aside holds code on developer and AI reference pages.

Component models:
- `PageHero` — heading, introText, theme (default | feature), optional media reference.
- `MediaHero` — heading, introText, mediaAsset (demo capture), posterImage, caption.
- `FeatureCardGroup` — groupHeading, layout (three-up | two-up | grid), cards[].
- `FeatureCard` — heading, body, linkText, linkURL, icon, accent (primary | secondary | tertiary), badge (optional).
- `ArticleListSection` — sectionHeading, sectionIntro, items[] (linked Article or LinkCard).
- `LinkCard` — heading, body, linkURL, category.
- `CodeBlock` — language, code, filename (optional), copy default on.
- `CalloutBlock` — heading, body, style (note | control | caution) mapped to info | primary | warn.
- `ThemeAwareImage` — lightAsset, darkAsset, alt. Required for any screenshot or diagram so it swaps with the theme.

The generic zone renderer loops zones from the page model and renders whatever components editors placed. No per-page layout code.

---

## 5. Task list (dependency order)

Do these as separate, reviewable commits. Do not batch.

**T1. Token layer and dark mode. No content change.**
- Add the semantic token layer and both theme blocks to the docs stylesheet using Tailwind v4 `@theme` plus a dark variant: `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));` or the `data-theme` selector approach in the mockup.
- Build the three-state theme control (light, dark, system) and the no-flash inline head script reading `localStorage` then system preference.
- Add Fira Mono and Inder to the font setup alongside Mulish.
- Done when: toggling theme works with no flash on reload, and nothing else has changed visually in structure.

**T2. Component models and renderer.**
- Create or confirm the page models and component models in section 4.
- Wire each component model to a React component and the generic zone renderer.
- Done when: a test Docs Landing Page composed in Web Studio renders correctly in both themes.

**T3. Hub rebuild as content.**
- New H1: "Docs for the CMS built for editors, developers, and AI agents."
- Featured row: three FeatureCards (Web Studio, Page Management, AI/MCP) with accents primary, secondary, tertiary.
- Keep role cards and the getting-help block.

**T4. Flagship pages (one commit each).**
- `/docs/web-studio`, `/docs/page-management`, `/docs/ai`. Copy from the copy doc, Part A.
- Each opens with a MediaHero if a capture exists, else PageHero.

**T5. Section reorder.**
- Overview: add the "What makes Agility different" band.
- Editors: lead with Web Studio, add AI-assisted authoring cluster.
- Developers: replace the defensive lead, promote Page Management, add the AI and MCP cluster.

**T6. Routing and redirects.**
- Add the three flagship routes.
- 301 `/docs/overview/page-management` to `/docs/page-management` (confirm with owner first, this is an open decision).
- Audit internal links so none point into a redirect.

**T7. Machine readability.**
- Add `llms.txt` at root listing flagship pages, section landings, and API references with one-line purposes.
- Add a clean markdown endpoint per article.
- Set declarative, prompt-shaped titles and meta on the three flagship pages: use "MCP server", "AI agent", "visual page builder", "page orchestration", "headless CMS".

AI docs section content (the 8 to 10 articles) is out of scope for code. It is a content task gated on an inventory the owner is running. Build the section shell so articles drop in as content.

---

## 6. Definition of done and self-check

Before opening any PR, run these and paste results into the PR description.

Structure:
- HTML tags balanced, CSS braces balanced.
- No undefined CSS custom properties. Every `var(--x)` has a definition. (The mockup passed 101/101 braces, 0 undefined.)
- No `localStorage` or `sessionStorage` in preview/artifact builds.

Theme:
- Toggle cycles light, dark, system. System tracks `prefers-color-scheme` live.
- No flash of wrong theme on reload in the real app.

Accessibility (compute ratios, do not eyeball):
- Body text passes AA in both themes. Reference: light and dark both compute to about 15.6:1.
- Every flagship card ink passes AA on its surface. Reference targets that pass: light inks primary #0F7885 (4.9:1), secondary-dim #2A57B0 (6.5:1), warn #836400 for the yellow card (5.3:1); dark inks primary #3EB4C2 (6.8:1), secondary #83A9F4 (7.1:1), tertiary #FFC414 (10.4:1).
- Watch item: teal link on the light page background computes to 4.51:1, which passes AA but barely. If a link sits on `--bg` rather than `--surface`, prefer `--primary-dim` for more headroom.
- Visible keyboard focus on every interactive element. Reduced motion respected.
- Responsive down to mobile. Sidebar and top nav collapse, cards stack.

---

## 7. Known gotchas

- Inder ships a 400 weight only. Headings set to 700 will be browser-synthesized bold. This matches the current prototype. If the owner wants true heading weight contrast, that is a font decision, not a code fix. Flag it, do not silently substitute a font.
- Yellow as text or icon on light fails contrast. The mockup solves this with per-card ink tokens: bar colour and ink colour are separate, and the yellow card uses `--warn` as ink in light and `--tertiary` in dark. Preserve this pattern.
- Demo captures go stale when the UI changes. If you add MediaHero captures, note in the PR which UI they depend on so they can be re-recorded later.
- Over-modelling makes Web Studio a maze. Do not add component models beyond section 4 without owner sign-off.

---

## 8. Open decisions for the owner (do not guess)

1. Promote-and-301 the page-management concept page, or keep it separate. Blocks T6.
2. Ship a real mono is already decided (Fira Mono). Ship a different heading face than Inder, yes or no. Affects T1.
3. Ask-AI in docs built on the Agility MCP stack now, or search first and AI later. Affects scope beyond this brief.
4. How many AI-section articles exist in publishable form. Gates the content drop into the T4 AI shell.