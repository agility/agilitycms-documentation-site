# Screenshots needed

A backlog of screenshots the docs are missing, with enough detail that whoever
captures them doesn't have to reverse-engineer the intent.

**Why this file exists.** Two locale articles carry placeholder lines like
`<i>[Screenshot: The Save & Localize Item dialog…]</i>` — instructions to a
screenshotter, sitting in the article body. They render as literal bracketed text on
a public page, so they have to be resolved before either article can ship.

> ⚠️ **These two are Nick's active drafts. Don't edit or publish them without him.**
> On 2026-07-30 I read "last modified 2026-03-20" as abandoned, stripped the
> placeholders, and published both. They were unpublished the same day. Age is not
> ownership — a draft that hasn't moved in months may still be someone's, and the
> way to find out is to ask, not to infer. This file records what the screenshots
> need to show; it is **not** approval to act on the articles.

The general principle still holds and is worth keeping: **draft prose shouldn't be
held hostage to an image.** Ship text, log the shot — but that's a call for the
article's author to make, not a passer-by.

---

## Capture standards

Get these right once and every screenshot matches.

| | |
|---|---|
| **Instance** | Use a demo/sandbox instance with realistic content, **not** a customer instance and not the docs instance itself. Screenshots of `Agility CMS Docs` internals confuse readers. |
| **Locales** | Several shots need multiple locales configured. Minimum: `en-us` (default), `es-es`, `ja-jp`, `en-ca`. The `en-ca` one matters — it's what demonstrates same-language copy skipping translation. |
| **Theme** | Agility UI default (light). Don't mix light and dark across a single article. |
| **Viewport** | 1440×900, browser zoom 100%. Crop to the relevant panel plus enough surrounding chrome to orient the reader — a floating dialog with no context is hard to place. |
| **Redaction** | No real customer names, emails, API keys, or instance GUIDs. Blur or replace with demo values. Check the browser tab title and any breadcrumb. |
| **Highlighting** | If a shot needs to point at one control, use a simple accent-coloured outline. No arrows, no drop shadows, no numbered circles baked into the image — the numbered steps live in the prose. |
| **Format** | PNG. 2× device pixel ratio if you can; the renderer generates srcsets up to 2000px wide, so a wider original is genuinely used. |
| **Naming** | `{article-slug}-{what-it-shows}.png`, e.g. `copying-content-to-other-locales-save-and-localize-dialog.png`. |

### Where the files go

Per the [authoring skill](../.claude/skills/authoring-agility-docs/SKILL.md), upload
into a category folder — for both articles below that is **`images/editor/`**:

1. `initialize_media_upload` with `{ instanceGuid, fileName, folderPath: "images/editor/" }`
2. `curl -s -X POST "<uploadUrl>" -F "file=@shot.png;type=image/png"`
3. Use the returned `https://cdn.aglty.io/...` URL.

### How to insert them

Both articles store their body as **legacy EditorJS JSON** in the `Content` field,
not Markdown — so these are not Markdown image links. Add an `image` block at the
recorded position:

```json
{
  "id": "sal-img",
  "type": "image",
  "data": {
    "file": { "url": "https://cdn.aglty.io/.../shot.png", "size": { "width": 1600 } },
    "caption": "The Save & Localize dialog with two locales selected",
    "stretched": false, "withBackground": false, "withBorder": true
  }
}
```

Two things the renderer ([components/common/blocks/Image.tsx](../components/common/blocks/Image.tsx)) cares about:

- **Set `file.size.width`.** Srcset entries are emitted only for widths at or below
  it, so a missing width silently caps the image at the 800px source.
- `caption` doubles as the `alt` text, so write it as a description, not a label.
  It should say what the reader is looking at, and stay useful to someone who can't
  see the image at all.
- `withBorder: true` is worth it for UI screenshots — most Agility panels are white
  on white and dissolve into the page without one.

The `id` values below are the original placeholder block ids. Reusing them puts each
image back exactly where the author intended.

---

## The backlog

### Copying Content to Other Locales
`/docs/editors/copying-content-to-other-locales` · content item **1412** ·
[edit](https://app.agilitycms.com/instance/67bc73e6-u/en-us/content/list-10/listitem-1412)

| # | Block id | Must show | Setup needed |
|---|---|---|---|
| 1 | `col-img` | A content list with the **Other Locales** column visible, several rows carrying locale badges (`es-es`, `ja-jp`, `en-ca`) — and ideally one row with none, so the contrast reads. | Content copied into 2–3 locales, viewed from `en-us`. Note the column never shows the locale you're currently in. |
| 2 | `filter-img` | The **Select Filters** panel with **Other Locales** expanded and locale checkboxes showing, at least one checked. | Same list; filter icon → Filters dropdown. |
| 3 | `sal-img` | The **Save & Localize Item** dialog: locale selector open with Select All / Spanish / Japanese / English visible, plus the **Translate Content** checkbox. | Open any content item, Save dropdown → Save & Localize. |
| 4 | `bulk-img` | The **Bulk Copy to Locale(s)** dialog headed "Copy 2 item(s) to locale(s)", locale selector and Translate Content checkbox visible. | Tick exactly **two** rows in a list so the count matches the prose. |
| 5 | `pages-img` | The **Initialize Pages** dialog: page selector, Translate Content checkbox, Initialize button. | Switch Pages to a locale with **no** pages initialized — this dialog only appears in that state, so capture it before initializing anything. |

### Translating Content with DeepL
`/docs/editors/translating-content-with-deepl` · content item **1413** ·
[edit](https://app.agilitycms.com/instance/67bc73e6-u/en-us/content/list-10/listitem-1413)

| # | Block id | Must show | Setup needed |
|---|---|---|---|
| 6 | `open-img` | The content editor with the **DeepL Translation Panel** docked right: DeepL branding, the auto-detected target language, field checkboxes, Translate button. | DeepL app installed, editing an item in a **non-default** locale (e.g. `es-es`). The panel does not appear in the default locale. |
| 7 | `fields-img` | Close-up of the panel's field checkboxes — real field names (Title, Description, Content), some checked. Non-text fields should be visibly absent. | Pick an item whose model mixes text and non-text fields, so the absence is meaningful rather than incidental. |

---

## Ordering

Shots 3, 4 and 6 are the highest value — they show dialogs a reader cannot guess at.
1 and 2 illustrate things the prose already describes adequately. 5 is the most
awkward to stage (it needs an uninitialized locale, and capturing it consumes that
state) so schedule it first if you're setting up a fresh demo instance, or you'll
have to tear down to get it.

## After capturing

0. **Check with the article's author first** (Nick, for both of these). Everything
   below edits their draft.
1. Upload to `images/editor/`.
2. Add the `image` blocks at the recorded ids, replacing the placeholder paragraphs.
3. `get_content_item` to confirm the JSON survived.
4. **Publish** only when the author says the article is ready — a save lands in
   Staging, and publishing is outward-facing. Not a passer-by's call.
5. Delete the row from this file.
