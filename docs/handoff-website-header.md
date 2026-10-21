# Handoff: header search fixes for agility-website-nextjs-2026

**From:** the docs site (agilitycms-documentation-site), October 21, 2026.
**For:** whoever works on the header in `agility/agility-website-nextjs-2026` (a person, or an agent session in that repo).

The docs and the marketing site share the same header design. On October 21 we fixed five things in the docs header ([#86](https://github.com/agility/agilitycms-documentation-site/pull/86), [#87](https://github.com/agility/agilitycms-documentation-site/pull/87)). The two codebases are built differently: the website uses `cmdk` for the search dialog, Base UI's `NavigationMenu`, and its own `Button` sizes. So each item below says whether it applies there, checked against `main` at `fc9bebc`.

## Summary

| # | Issue | Website status | Action |
|---|---|---|---|
| 1 | Search button taller than the CTA buttons | **Applies** | Fix (small) |
| 2 | Search results silent to screen readers | **Applies** (likely) | Fix, then verify with VoiceOver |
| 3 | ⌘K opens two stacked dialogs | Already fixed (Sep 28) | None |
| 4 | Space on a result types a space | Doesn't apply (cmdk keeps focus in the input) | None |
| 5 | Mega menu opens on focus, so Tab walks every link | Probably doesn't apply | Verify only |

## 1. Match the search button to the 32px buttons (applies)

**Where:** `src/components/search/search-trigger.client.tsx`, the desktop trigger (the `xl:block` wrapper and its `<button>`).

**Problem:** the collapsed trigger is `size-9` / `h-9 w-9` (36px). The buttons next to it in `site-header.tsx` use `<Button>` at `size="default"`, which is `h-8` (32px) in `src/components/ui/button.tsx`. So the search icon box sits 4px taller than the secondary and primary header buttons (CMS `secondaryButton` and `primaryButton`).

The mobile trigger is already right: it uses `size="icon"`, which is `size-8`.

**Fix:** go from 36px to 32px, and drop the horizontal padding so the 16px icon still fits inside the 1px border (32 − 2 − 14 = 16):

```diff
- <div ref={desktopRef} className="relative hidden size-9 shrink-0 xl:block">
+ <div ref={desktopRef} className="relative hidden size-8 shrink-0 xl:block">
    <button
      ...
-     className="group absolute top-0 right-0 z-10 flex h-9 w-9 items-center gap-2 overflow-hidden rounded-md border border-input bg-background px-2.5 text-sm ...
+     className="group absolute top-0 right-0 z-10 flex h-8 w-8 items-center gap-2 overflow-hidden rounded-md border border-input bg-background px-[7px] hover:px-2.5 focus-visible:px-2.5 text-sm ...
```

The expanded state needs the padding back, hence `hover:px-2.5 focus-visible:px-2.5`. Without it, the expanded "Search… ⌘K" text sits 3px closer to the edge than before. Also update the comment above the wrapper, which says "CONSTANT 36px footprint".

**Check:** at 1440px wide, the search button and both header buttons should all measure 32px tall with the same vertical centre. On hover the button should still grow to `w-60` with the icon, the text and the ⌘K hint unclipped.

## 2. Announce search results to screen readers (applies, probably)

**Where:** `src/components/search/search-dialog.client.tsx`.

**Problem:** the dialog shows "Showing X of Y results" and `CommandEmpty` ("No results for …") as plain text. `cmdk` doesn't announce result counts, and that text isn't in a live region. On the docs site the equivalent text was silent in the accessibility tree, and a screen reader user typing a query heard nothing at all.

**Fix:** add one polite live region inside the `CommandDialog`. Keep it mounted all the time, so assistive tech is already watching it when the text changes. Only fill it once results for the *current* query have arrived. The docs site's first version announced "No results" for a query whose request hadn't come back yet. `acc.query` already tells you which query the results belong to:

```tsx
<div role="status" aria-live="polite" className="sr-only">
	{!query.trim() || loading || !acc || acc.query !== query.trim()
		? ""
		: acc.total === 0
			? `No results for ${acc.query}`
			: `${acc.total.toLocaleString()} ${acc.total === 1 ? "result" : "results"}`}
</div>
```

Adjust the condition to however `acc.query` is normalised (trimmed or not) in that file.

**Check:** with VoiceOver (Cmd+F5), open search, type "webhook", and you should hear the count. Type nonsense, and you should hear "No results for …". Also check it doesn't double-announce if `cmdk`'s `CommandEmpty` turns out to be announced already. If it is, keep only the count.

## 3. ⌘K opening two dialogs (already fixed)

The website hit this first: `SearchTrigger` renders twice, and the fix on September 28 makes only the on-screen instance respond (`getClientRects().length`). Nothing to do.

One edge to know about: at widths where neither trigger is visible, ⌘K does nothing. The docs site falls back to the first mounted instance in that case. Only change this if someone reports it.

## 4. Space on a highlighted result (doesn't apply)

On the docs site, results are real buttons that take focus, and a keydown handler turned Space into typing. The website uses `cmdk`: focus stays in the input, results are selected with `aria-activedescendant`, and Space typing a space is the correct combobox behaviour. Nothing to do.

## 5. Mega menu opening on keyboard focus (verify only)

The docs header's "APIs & SDKs" menu opened on `onFocus`. So every Tab past it walked all 15 links, and search was the 27th Tab stop at 1440px. The website uses Base UI's `NavigationMenu`, which opens on hover or click (Enter or Space), not on focus.

**Check:** at 1440px, Tab from page load to the search button. If you land on a menu trigger and its panel opens without pressing Enter, it has the same bug. Fix it by removing whatever opens the menu on focus.

## Also worth knowing

- The docs site's own tests: the [#86 comment](https://github.com/agility/agilitycms-documentation-site/pull/86) has the before and after table (live region, Space, ⌘K at 3 widths, Tab count).
- These came out of the dev.to series draft ("Fast, accessible and working everywhere"). The post says automated checks (axe) found none of them, and only driving the page with a keyboard did.
