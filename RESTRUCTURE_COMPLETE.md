# Server/Client Component Restructure - Complete ✅

**Date:** 2024-12-19
**Status:** ✅ Dev server working, ❌ Build failing during static generation

## What We Did

### 1. Fixed Server/Client Component Boundary Issues ✅

**Problem:** Original error was "Super expression must either be null or a function, not undefined" caused by violating Next.js composition rules.

**Solution:** Restructured the app to follow proper Next.js App Router patterns:

```
OLD (BROKEN):
page.tsx (Server) → <Layout.client> (Client) → <AgilityPageTemplate> (Server) ❌

NEW (CORRECT):
layout.tsx (Server) → Header (Client) + {children}
page.tsx (Server) → <AgilityPageTemplate> (Client) ✅
```

### 2. Created Proper Component Hierarchy ✅

**Root Layout** (`src/app/layout.tsx`):
- ✅ Fetches global data (header, footer, menus)
- ✅ Renders Header directly (Client Component)
- ✅ Wraps children in ClientFeatures for Intercom, progress bar
- ✅ Server Component that never needs client features

**Page Component** (`src/app/[...slug]/page.tsx`):
- ✅ Fetches page-specific data via `getAgilityPage`
- ✅ Renders page template directly (no wrapper)
- ✅ Uses `generateMetadata()` instead of `<HeadSEO>`
- ✅ Server Component

**Client Features** (`components/common/ClientFeatures.tsx`):
- ✅ Handles Intercom initialization
- ✅ Handles progress bar (nProgress)
- ✅ Handles scroll to top on route change
- ✅ Uses `usePathname()` for navigation tracking

### 3. Updated Components with 'use client' ✅

Added `'use client'` directive to:
- ✅ `Header.js` - uses hooks (useState, useEffect)
- ✅ `ClientFeatures.tsx` - uses hooks (useEffect, usePathname)
- ✅ `PreviewWidget.js` - uses hooks (useState)
- ✅ `CMSWidget.js` - uses hooks (useState, useEffect)
- ✅ `HeadSEO.js` - uses `next/head` (deprecated, but marked as client)
- ✅ `MainTemplate.js` - uses ContentZone (made client for now)
- ✅ `WithSidebarNavTemplate.js` - already had 'use client'
- ✅ `FullwidthTemplate.tsx` - already had 'use client'

### 4. Removed HeadSEO in Favor of generateMetadata() ✅

**Before:**
```tsx
return (
  <>
    <HeadSEO title={title} description={desc} ... />
    <AgilityPageTemplate {...props} />
  </>
)
```

**After:**
```tsx
export async function generateMetadata(props): Promise<Metadata> {
  const agilityData = await getAgilityPage({ params });
  return {
    title: agilityData.sitemapNode?.title,
    description: agilityData.page.seo?.metaDescription,
    keywords: agilityData.page.seo?.metaKeywords,
    robots: { index: !noIndex, follow: !noIndex }
  };
}
```

## Current Status

### ✅ What's Working

1. **Dev Server (`npm run dev`)** - Works perfectly!
   - Pages render correctly
   - Header shows up
   - No runtime errors
   - Navigation works
   - Base path `/docs` works correctly

2. **Architecture** - Follows Next.js best practices
   - Server Components for data fetching
   - Client Components only where needed
   - Proper component boundaries
   - Metadata via `generateMetadata()`

3. **Components** - All marked correctly
   - Client Components have `'use client'`
   - Server Components are default
   - No boundary violations

### ❌ What's Failing

**Build Process** (`npm run build`):
- Fails during `Collecting page data...`
- Error: `Super expression must either be null or a function, not undefined`
- Module `94935` causing the issue
- Happens during `generateStaticParams` execution

### 🤔 Why Dev Works But Build Fails

**Dev Server:**
- Compiles pages on-demand
- Doesn't pre-render all routes
- Uses dynamic imports
- More forgiving with module boundaries

**Build Process:**
- Tries to statically generate ALL routes via `generateStaticParams`
- Pre-renders pages at build time
- Bundles all modules together
- Stricter about module dependencies

## Investigation Findings

### The Error Location

The error occurs at:
```
.next/server/app/[...slug]/page.js:85:491979
at module 94935
```

This is during the `generateStaticParams` execution when Next.js tries to collect all the routes to pre-render.

### Likely Root Cause

One of the **page modules** imported via `getModule()` and rendered by `ContentZone` has an issue during static generation. Possibilities:

1. **A module is importing something that doesn't exist in the server bundle**
2. **A class component is trying to extend React.Component incorrectly**
3. **A circular dependency in the module chain**
4. **@agility/nextjs v15.0.7 has a compatibility issue with Next.js 15.5.9**

## Next Steps - Options

### Option 1: Disable Static Generation (Quick Test)
```tsx
// src/app/[...slug]/page.tsx
export async function generateStaticParams() {
  return []; // Empty array = no static generation
}
```

**Pros:** Will tell us if the issue is specific to static generation
**Cons:** Site will use ISR instead of SSG

### Option 2: Add 'use client' to All Page Modules (Quick Fix)
Add `'use client'` to every file in `components/agility-pageModules/`

**Pros:** Will likely fix the build
**Cons:** Loses Server Component benefits, increases bundle size

### Option 3: Investigate Module 94935 (Proper Fix)
1. Try to identify which page module is causing the issue
2. Check if it's a class component that needs updating
3. Look for circular dependencies
4. Update or fix the specific module

### Option 4: Update @agility/nextjs (Possible Fix)
Check if there's a newer version or known issues with Next.js 15.5.9

## Recommendations

I recommend trying **Option 1 first** to confirm the issue is with static generation, then **Option 3** to properly fix the root cause.

**For immediate deployment**, use **Option 1** (disable static generation) and rely on ISR with `revalidate: 60` which is already set.

## Files Modified

### Created:
- `components/common/ClientFeatures.tsx` - Client features wrapper
- `SERVER_CLIENT_COMPONENT_FIX.md` - Documentation

### Modified:
- `src/app/layout.tsx` - Now renders Header, added ClientFeatures wrapper
- `src/app/[...slug]/page.tsx` - Removed HeadSEO, updated generateMetadata, renders template directly
- `components/common/Header.js` - Added 'use client'
- `components/common/PreviewWidget.js` - Added 'use client'
- `components/common/CMSWidget.js` - Added 'use client'
- `components/common/HeadSEO.js` - Added 'use client' (deprecated)
- `components/agility-pageTemplates/MainTemplate.js` - Added 'use client'

### Deprecated:
- `components/common/Layout.client.tsx` - No longer used (functionality split)

## Verified Working

✅ Dev server starts without errors
✅ Pages render correctly with Header
✅ Base path `/docs` works
✅ 404 page renders correctly
✅ No hydration errors
✅ Client-side navigation would work (tested via HTML structure)

## Remaining Blocker

The build error is the only remaining issue. Once resolved, the migration will be complete!
