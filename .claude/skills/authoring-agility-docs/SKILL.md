---
name: authoring-agility-docs
description: Author and publish documentation articles for the Agility CMS Docs site using the Agility MCP server. Use whenever asked to write, add, or update a docs article, place it in the right section/category, embed images, or save Markdown content to the docs instance. Covers categorization across the multiple Article containers, the Markdown rendering rules this site enforces, and the image-upload workflow.
---

# Authoring Agility CMS Documentation Articles

This skill captures everything needed to write a documentation article and save it into the **Agility CMS Docs** instance correctly — so it lands in the right place, renders cleanly, and shows up in the right lists.

## Instance facts

- **Instance:** `Agility CMS Docs`
- **GUID:** `67bc73e6-u` (matches `NEXT_PUBLIC_AGILITY_GUID` in `.env.local`)
- **Locale:** `en-us` (other locales exist: `fr-ca`, `es` — only use them when explicitly asked)
- **Published site path:** `https://agilitycms.com/docs/<category-slug>/<article-slug>`

## How articles are categorized (READ THIS FIRST)

There is **no single "Articles" container.** Each top-level docs **category** has its **own** pair of containers — one for articles, one for sections — and they all share the `DocArticle` / `DocSection` content models. Categorization is therefore **which container you save into**, plus the **Section** field on the article.

### Full category → container map

The number in parentheses is the **container ID** (the `ID` from `get_containers`) — you need it for the *Edit in Agility* link. Captured 2026-06; **always confirm with a `get_containers` lookup before saving** (see below).

| Category (`categoryReferenceName`) | Articles container (ID) | Sections container (ID) |
| --- | --- | --- |
| Overview (`Overview`) | `OverviewArticles` (14) | `OverviewSections` (12) |
| Developer (`Developer`) | `DeveloperArticles` (9) | `DeveloperSections` (7) |
| Editor (`Editor`) | `EditorArticles` (10) | `EditorSections` (6) |
| Owners & Admins (`Owners-Admins`) | `OwnersAdminsArticles` (15) | `OwnersAdminsSections` (13) |
| Apps (`Apps`) | `AppsArticles` (249) | `AppsSections` (248) |
| Training Guide (`Training-Guide`) | `TrainingArticles` (380) | `TrainingSections` (378) |
| SDKs & Frameworks — Next.js (`SDKs-Frameworks`) | `NextjsArticles` (49) | `NextjsSections` (56) |
| SDKs & Frameworks — Nuxt | `NuxtArticles` (51) | `NuxtSections` (58) |
| SDKs & Frameworks — Angular | `AngularArticles` (54) | `AngularSections` (61) |
| SDKs & Frameworks — Astro | `AstroArticles` (278) | `AstroSections` (277) |
| SDKs & Frameworks — .NET | `dotNetArticles` (53) | `dotNetSections` (60) |
| SDKs & Frameworks — Eleventy | `EleventyArticles` (52) | `EleventySedtions` (59) ⚠️ ref name is misspelled — use it as-is |
| SDKs & Frameworks — Gatsby | `GatsbyArticles` (50) | `GatsbySections` (57) |
| SDKs & Frameworks — JavaScript | `JavaScriptArticles` (55) | `JavaScriptSections` (62) |
| SDKs & Frameworks — SvelteKit | `SvelteKitArticles` (337) | `SvelteKitSections` (338) |
| SDKs & Frameworks — Management SDK | `ManagementSDK-Articles` (354) | `ManagementSDK-Sections` (357) |

Supporting (non-article) containers: `DocCategories` (18) and `DocConcepts` (8) under *Concepts & Categories*; `ChangeLog` (102, model `Release`) for the changelog. Articles never go in these.

### ALWAYS confirm with a lookup before saving

The table is a point-in-time snapshot — new framework SDKs and categories get added. Before you save:

1. `get_containers({ instanceGuid, search })` — confirm the target **Articles container's** reference name and **ID** (and discover any container not listed above). If the user names a category/framework that isn't here, search for it rather than assuming.
2. `get_content_items` on that category's **`*Sections`** container — confirm the target **section's contentID and Title** (these drive sidebar placement; see below).

Never hard-code a container or section that you haven't confirmed in this step for the current instance.

### The Section field drives sidebar placement

`DocArticle` has a `Section` linked-content dropdown (model `DocSection`, **User Selectable** container — `contentView` is empty, so the editor first picks *which* `*Sections` container, then an item from it). You MUST set three fields together:

- `Section` — the **exact-case reference name** of the sections container, e.g. `"DeveloperSections"` (NOT `"developersections"` — see the warning below)
- `Section_ValueField` — the **contentID** of the section (string), e.g. `"220"`
- `Section_TextField` — the section **Title**, e.g. `"Content Architecture"`

> ⚠️ **Case sensitivity (confirmed bug).** For User Selectable linked-content dropdowns, the editor matches the stored container name against the real container reference name **case-sensitively**. Save the container name **exactly as `get_containers` returns it** (`DeveloperSections`, `DocConcepts`, …). If you save it lowercased, the item saves and the value fields are correct, but the dropdown renders **blank** in the editor — and you can't tell from `get_content_item`, because the **read API lowercases reference names**. Always copy the case straight from `get_containers`; never lowercase it.

The sidebar nav (`SideBarNav.js`) groups articles under a section by matching `article.fields.section_ValueField == section.contentID`. An article with an empty Section still saves, but won't appear under a section in the sidebar.

**To find the right section contentID:** `get_content_items` on the category's `*Sections` container. Example (Developer): `Introduction`=10, `Quick Start`=219, `Content Architecture`=220, `APIs`=255, `Extensibility`=256, `Integrations`=433, `Developing with Locales`=644, `Going Live`=990.

### The Concept field (optional taxonomy)

`Concept` is a second linked-content dropdown (model `DocConcept`, fixed container `DocConcepts`) with `Concept_ValueField` (contentID) + `Concept_TextField` (title). It renders as the little tag on listing cards (`ArticleListing.js`). Set it to a relevant concept (e.g. `Content Architecture`=9) or leave empty. Use the **exact-case** container name `DocConcepts` (same case rule as `Section` above).

## DocArticle key fields

| Field | Notes |
| --- | --- |
| `Title` | Required. |
| `Slug` | Required. Kebab-case, unique within the site. Becomes the URL. |
| `Description` | Short summary; shown on listing cards. ≤255 chars. |
| `MarkdownContent` | The article body as Markdown (preferred for new articles — see below). |
| `Content` | Legacy EditorJS block JSON. Leave unset for Markdown articles. |
| `ClassicContent` | Legacy; if present, a "Classic UI Version" toggle appears. |
| `Section` / `Section_TextField` / `Section_ValueField` | Categorization — see above. |
| `Concept` / `Concept_TextField` / `Concept_ValueField` | Optional tag. |

`DynamicArticleDetails.js` renders `MarkdownContent` **only when there are no EditorJS blocks**. For a new Markdown article, set `MarkdownContent` and don't set `Content`.

## Markdown rendering rules (this site is specific)

The renderer is a `unified` pipeline in `components/agility-pageModules/DynamicArticleDetails.js`:
`remarkParse → remarkDisableIndentedCode → remarkGfm → remarkRehype(allowDangerousHtml) → rehypeRaw → rehypeSlug → rehypeStringify`. Author Markdown to match:

- **Start the body with a single `# H1`.** The renderer strips the first H1 and uses it as the page title (falling back to `Title`). Don't add a second H1.
- **GFM is on** — tables, task lists, strikethrough, autolinks all work.
- **Raw HTML is allowed** (`rehypeRaw`) — you can drop in `<div>`, `<script>`, etc. Embedded `<script>` tags are re-created on the client so they actually execute. Keep this in mind for safety.
- **Indented code blocks are DISABLED.** Always use fenced blocks with a language for highlighting: ` ```jsx `, ` ```bash `, etc. (highlight.js runs on `pre code`).
- **Headings get auto-slug IDs** (`rehypeSlug`) for anchor links.
- Content is wrapped in Tailwind `prose prose-lg` — standard Markdown styles apply.

## Images: upload to the instance, then reference the CDN URL

Markdown images render as plain `<img>` with **no URL transformation** — so the `src` must be a real, public asset URL. Upload images into the docs instance and use the returned URL:

1. `initialize_media_upload` with `{ instanceGuid, fileName, folderPath }`. **Always upload into a category-based folder: `images/{category}/`** (e.g. `images/developer/`, `images/editor/`, `images/nextjs/`). Use the same `{category}` the article belongs to so assets stay organized alongside their docs. Add a topic subfolder only when a category accumulates many images (e.g. `images/developer/content-architecture/`). Returns a short-lived `uploadUrl`.
2. POST the file to that URL (multipart form, field `file`):
   ```bash
   curl -s -X POST "<uploadUrl>" -F "file=@/path/to/image.svg;type=image/svg+xml"
   ```
   The response includes the final asset URL, e.g. `https://cdn.aglty.io/agility-cms-docs/images/developer/tab-component-pattern.svg`.
3. Reference it in Markdown with descriptive alt text:
   ```markdown
   ![Descriptive alt text](https://cdn.aglty.io/agility-cms-docs/images/developer/tab-component-pattern.svg)
   ```

SVG, PNG, JPG all work. SVGs render as-is (the `?format=auto`/`?w=` image-service params used by the EditorJS Image block in `components/common/blocks/Image.js` are **not** applied to Markdown images, so just use the plain URL). The upload token expires in ~5 minutes — re-initialize if it lapses.

## Saving the article

Use `save_content_items` (contentID `-1` for new):

```jsonc
{
  "instanceGuid": "67bc73e6-u",
  "locale": "en-us",
  "items": [{
    "contentID": -1,
    "referenceName": "DeveloperArticles",          // the right category's Articles container
    "properties": { "definitionName": "DocArticle", "referenceName": "DeveloperArticles" },
    "fields": {
      "Title": "…",
      "Slug": "…",
      "Description": "…",
      "MarkdownContent": "# …\n\n…",                // full Markdown, incl. the H1
      "Section": "DeveloperSections",              // EXACT case from get_containers — not lowercased
      "Section_TextField": "Content Architecture",
      "Section_ValueField": "220",
      "Concept": "DocConcepts",                     // EXACT case
      "Concept_TextField": "Content Architecture",
      "Concept_ValueField": "9"
    }
  }]
}
```

- **The MCP cannot set workflow state.** The `state` property is **ignored on save**, and there are **no publish / approve / decline / unpublish / delete** operations. So:
  - A new item is created in the instance's default state (**Staging**). You can't publish it — a human must publish in the Agility UI.
  - Saving changes to a **published** item creates a **new Staging version**; the live published version is unchanged until a human re-publishes. Don't claim an edit is "live."
  - You **cannot delete** items either. A test/unwanted item has to be deleted by a human in the UI — flag it clearly (e.g. prefix the title with `TEST - … (delete me)`) and tell the user it needs manual removal.
  - Don't bother sending `state` (or expecting it to stick) — set the real workflow state in the UI.
- **Updates:** first `get_content_item` for the current `versionID` and all field values, then save with **every** field included (omitted fields are wiped) plus `properties.versionID`.
- Verify after saving with `get_content_item` — confirm `Section_ValueField` resolved and the Markdown/image survived. Remember the read **lowercases** the `Section`/`Concept` container names, so you can't verify their case this way; verify case visually in the editor.

## Always return Preview + Edit links

After **any** create or update, give the user both links. Substitute the new `{contentID}`, the container's `{containerID}` (the container ID — see the parenthesised IDs in the category→container map above, or take it from your `get_containers` lookup; e.g. `DeveloperArticles` = `9`), and `{locale}` (`en-us`).

- **Preview** (renders the staged/unpublished version on the live preview deploy):
  ```
  https://agilitycms-documentation-site.vercel.app/docs/developers?ContentID={contentID}&lang=en-us&agilitypreviewkey=400uJQv5qharfKX2zZv7%2fUiJ78ePiCdHsUweRrEjlsdg3IIPKjZKm22m2Oljilp6qlpQyeZj2IrRzcc%2fkBQlqQ%3d%3d&agilityts=20260615021008
  ```
  The `agilitypreviewkey` is the instance preview key (constant); `ContentID` is the article's contentID. The `/docs/developers` path segment is the preview landing route and works for any category.
- **Edit in Agility:**
  ```
  https://app.agilitycms.com/instance/67bc73e6-u/{locale}/content/list-{containerID}/listitem-{contentID}
  ```

## Checklist

1. Pick the **category → Articles container** (and confirm with `get_containers`).
2. Look up the target **section contentID** in that category's `*Sections` container.
3. Write Markdown: leading `# H1`, fenced code blocks, GFM, descriptive image alt.
4. Upload any images → use the returned `cdn.aglty.io` URL in the Markdown.
5. Save to the container with `Section`/`Concept` set to **exact-case** container names (+ the `_TextField`/`_ValueField` companions). Don't rely on `state` — the MCP can't set it.
6. `get_content_item` to verify fields survived, then hand off to a human to review and **publish in the Agility UI** (the MCP can't publish or delete).
7. Return the **Preview** and **Edit in Agility** links (see above).
