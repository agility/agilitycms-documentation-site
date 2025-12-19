# Migration Plan: Pages Router to App Router

## Overview
This document outlines the plan to migrate the Agility CMS documentation site from Next.js Pages Router to App Router, following the patterns used in the demosite2025 reference implementation.

**Official Next.js Migration Guide**: https://nextjs.org/docs/app/guides/migrating/app-router-migration

> **Note**: This migration plan aligns with Next.js's official migration guide and can be done incrementally - the `pages` and `app` directories can coexist during migration.

## Key Differences Between Current and Target Architecture

### Current (Pages Router)
- Uses `pages/` directory structure
- `getStaticProps` and `getStaticPaths` for data fetching
- `_app.js` for global app wrapper
- `[...slug].js` for catch-all dynamic routes
- `res.setPreviewData()` for preview mode
- Custom middleware in `middleware/` directory
- Apollo Client for GraphQL queries
- JavaScript/JSX files
- Next.js 14.2.35
- `@agility/nextjs` 14.0.3

### Target (App Router)
- Uses `app/` directory structure
- Server Components with async functions
- `generateStaticParams` for static generation
- `layout.tsx` for layouts
- `[...slug]/page.tsx` for dynamic routes (single locale site)
- `draftMode()` from `next/headers` for preview
- `middleware.ts` at root level
- Route Handlers (`route.ts`) instead of API routes
- TypeScript throughout
- Next.js 15.x
- `@agility/nextjs` 15.0.7

---

## Phase 1: Preparation & Setup

### 1.1 Update Dependencies
- [x] Upgrade Next.js to 15.x (minimum 13.4 required for App Router)
- [x] Upgrade `@agility/nextjs` to 15.0.7
- [x] Update React to 19.x (if needed)
- [x] Install TypeScript (if not already installed)
- [x] Update other dependencies to match demo site versions
- [ ] Remove deprecated packages
- [x] Update ESLint: `npm install -D eslint-config-next@latest`
- [ ] Ensure Node.js version is v18.17 or higher

### 1.2 Project Structure Setup
- [x] Create `src/` directory (optional, but matches demo site)
- [x] Create `src/app/` directory structure
- [x] Create `src/lib/` directory for utilities
- [x] Create `src/components/` directory (move existing components)
- [x] Create `src/middleware.ts` at root
- [x] Set up TypeScript configuration

### 1.3 Configuration Files
- [ ] Update `next.config.js` for App Router
- [x] Create/update `tsconfig.json`
- [x] Update `package.json` scripts if needed
- [ ] Review and update environment variables

---

## Phase 2: Core Infrastructure Migration

### 2.1 Middleware Migration
**File:** `middleware/middleware.js` → `src/middleware.ts`

**Changes:**
- [x] Convert to TypeScript
- [x] Move to root `src/middleware.ts`
- [x] Update to use `NextRequest` and `NextResponse`
- [x] Implement locale-based routing (if needed) - **Skipped (single locale site)**
- [x] Handle preview mode redirects
- [x] Handle dynamic redirects
- [x] Handle search params encoding (if used)
- [ ] Add redirect checking (requires getRedirections utility)

**Status:** ✅ **COMPLETED** - Created `src/middleware.ts` with preview handling, dynamic redirects, and search params encoding. Locale routing skipped for single locale site.

**Reference:** `demosite2025/src/middleware.ts`

### 2.2 Root Layout Migration
**File:** `pages/_app.js` → `src/app/layout.tsx`

**Changes:**
- [x] Convert to TypeScript
- [x] Move to `src/app/layout.tsx`
- [x] Remove `Component` and `pageProps` pattern
- [x] Use `children` prop instead
- [x] Move font loading to layout
- [x] Add metadata export
- [x] Keep global styles imports

**Global Data Fetching Migration:**
**Note:** This site does NOT support multi-locale, so global data fetching happens in root `layout.tsx`.

The global data currently fetched in `pages/[...slug].js` (lines 80-335) should move to root `layout.tsx`:

- [x] **Sitemap fetching and caching** - Created `getSitemapFlat.ts` utility
- [x] **Main menu links** - Created `getMainMenuLinks.ts` utility
- [x] **Header content** - Created `getHeaderContent.ts` utility (GraphQL)
- [x] **Footer content** - Created `getFooterContent.ts` utility
- [x] **Marketing content** - Created `getMarketingContent.ts` utility
- [x] **Pre-header content** - Included in `getHeaderContent.ts`

**Status:** ✅ **COMPLETED** - Root layout created with global data fetching utilities. Data is fetched in `[...slug]/page.tsx` and passed to Layout component (can be optimized later to fetch in layout).

**Data Fetching Pattern:**
```typescript
// src/app/layout.tsx
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

export default async function RootLayout({ children }) {
  // Get locale (single locale for now, but functions accept locale param for future multi-locale support)
  const locale = process.env.AGILITY_LOCALES?.split(',')[0] || 'en-us';

  // Fetch all global data in parallel (pass locale to all functions for future-proofing)
  const [header, footer, mainMenuLinks] = await Promise.all([
    getHeaderContent({ locale }),
    getFooterContent({ locale }),
    getMainMenuLinks({ locale }),
  ]);

  return (
    <html lang="en">
      <body>
        <Header header={header} mainMenuLinks={mainMenuLinks} />
        {children}
        <Footer footer={footer} />
      </body>
    </html>
  );
}
```

**Utility Functions to Create:**
- [ ] `src/lib/cms-content/getHeaderContent.ts` - Header content fetcher (**accepts locale param**)
- [ ] `src/lib/cms-content/getFooterContent.ts` - Footer content fetcher (**accepts locale param**)
- [ ] `src/lib/cms-content/getMainMenuLinks.ts` - Menu links from sitemap (**accepts locale param**)

**Important:** All functions that fetch Agility content should accept a `locale` parameter, even though the site currently only supports one locale. This future-proofs the code for when multi-locale support is added.

**Reference:** `demosite2025/src/app/layout.tsx` (root) and `demosite2025/src/app/[locale]/layout.tsx` (for pattern, but adapt for single locale)

### 2.3 CMS Utilities Migration
**Files to create/update:**

- [x] `src/lib/cms/getAgilitySDK.ts`
  - Use `draftMode()` instead of preview prop
  - Use `server-only` directive

- [x] `src/lib/cms/getAgilityContext.ts`
  - Create new file for context management
  - Handle locale validation (single locale for now)
  - Handle preview mode detection

- [x] `src/lib/cms/getAgilityPage.ts`
  - Replace `getStaticProps` logic
  - Handle search params from middleware
  - Return page data structure

- [x] `src/lib/cms/getSitemapFlat.ts`
  - Update to use new SDK pattern
  - Add caching with Next.js cache tags

**Status:** ✅ **COMPLETED** - All core CMS utilities created and working.

**Reference:** `demosite2025/src/lib/cms/`

### 2.4 API Routes Migration
**Files:** `pages/api/*` → `src/app/api/*/route.ts`

**Routes to migrate:**
- [x] `api/preview.js` → `api/preview/route.ts`
  - Use `draftMode().enable()` instead of `res.setPreviewData()`
  - Use `NextRequest` and `NextResponse`

- [x] `api/exitPreview.js` → `api/preview/exit/route.ts`
  - Use `draftMode().disable()`

- [x] `api/generatePreviewKey.js` → `api/preview/key/route.ts`
  - Converted to Route Handler

- [x] `api/robots.ts` → `app/robots.txt/route.ts`
  - Converted to Route Handler

- [x] `api/sitemap.xml.ts` → `app/sitemap.tsx`
  - Converted to sitemap.tsx (Next.js special file)

- [x] `api/link/search.js` → `api/link/search/route.ts`
  - Converted to Route Handler

- [x] `api/dynamic-redirect` → `api/dynamic-redirect/route.ts`
  - Created based on middleware needs

- [ ] `api/search/*` → `api/search/*/route.ts`
  - Requires Algolia integration review
  - `indexAllArticles.js` - GraphQL query for indexing
  - `indexArticle.js` - Single article indexing

- [x] `api/feedback/*` → `api/feedback/*/route.ts`
  - ✅ `sendPositive/route.ts` - Converted to Route Handler
  - ✅ `sendNegative/route.ts` - Converted to Route Handler

- [x] `api/image/*` → `api/image/*/route.ts`
  - ✅ `fetchByUrl/route.ts` - Converted to Route Handler
  - ✅ `uploadByFile/route.ts` - Converted to Route Handler (uses FormData instead of multiparty)

**Status:** 🟡 **IN PROGRESS** - Most routes migrated. Search routes (Algolia) pending review.

**Reference:** `demosite2025/src/app/api/`

---

## Phase 3: Page Structure Migration

### 3.1 Root Page
**File:** `pages/index.js` → `src/app/page.tsx`

**Changes:**
- [x] Convert to Server Component
- [x] Export from `[...slug]/page.tsx` (root is dynamic, single locale site)
- [x] Created `src/app/page.tsx` that re-exports from `[...slug]/page.tsx`

**Status:** ✅ **COMPLETED** - Root page created, exports from catch-all route.

**Reference:** `demosite2025/src/app/page.tsx`

### 3.2 Dynamic Route Migration
**File:** `pages/[...slug].js` → `src/app/[...slug]/page.tsx`

**Note:** Since this site does NOT support multi-locale, the route is `[...slug]` not `[locale]/[...slug]`.

**Major Changes:**
- [ ] Convert `getStaticProps` → async Server Component
- [ ] Convert `getStaticPaths` → `generateStaticParams`
- [ ] Update to use `getAgilityPage` utility
- [ ] Handle locale parameter
- [ ] Add `generateMetadata` function
- [ ] Use `notFound()` instead of returning `{ notFound: true }`
- [ ] Add `revalidate` export for ISR

**Data Fetching Changes:**
- [ ] **Remove global data fetching** - All global data (header, footer, menu links, etc.) is now fetched in `layout.tsx`
- [ ] **Page-specific data only** - Only fetch Agility page data here using `getAgilityPage`
- [ ] **Pass page data to template** - Forward Agility page props to page template component
- [ ] **Remove GraphQL sitemap caching** - This logic moves to layout or a shared utility

**Key Logic Removed (moved to layout.tsx):**
- ❌ Main menu links generation (moved to layout)
- ❌ Header content fetching (moved to layout)
- ❌ Footer content fetching (moved to layout)
- ❌ Marketing content fetching (moved to layout)
- ❌ Pre-header content (moved to layout)

**Key Logic Kept:**
- ✅ Agility page props fetching (`getAgilityPageProps`)
- ✅ Preview mode handling (via `getAgilityContext`)
- ✅ Page template selection and rendering

**Reference:** `demosite2025/src/app/[locale]/[...slug]/page.tsx` (adapt for single locale - remove `[locale]` segment)

### 3.3 Error Pages Migration
- [x] `pages/404.jsx` → `src/app/not-found.tsx`
  - ✅ Created basic 404 page
- [x] `pages/500.jsx` → `src/app/error.tsx`
  - ✅ Created error boundary component (Client Component)

**Status:** ✅ **COMPLETED** - Error pages migrated to App Router format.

### 3.4 Special Pages
- [x] `pages/sitemap.xml.ts` → `src/app/sitemap.tsx`
  - ✅ Converted to Next.js sitemap.tsx special file
- [x] `pages/api/robots.ts` → `src/app/robots.txt/route.ts`
  - ✅ Converted to Route Handler

**Status:** ✅ **COMPLETED** - Special pages migrated.

---

## Phase 4: Component Migration

### 4.1 Layout Component
**File:** `components/common/Layout.js` → `components/common/Layout.client.tsx`

**Changes:**
- [x] Created `Layout.client.tsx` as Client Component
- [x] Removed `_app.js` wrapper logic
- [x] Updated router usage (`next/router` → `next/navigation` with `usePathname`)
- [x] Removed `handlePreview` usage (preview passed as prop)
- [x] Updated router events (using pathname changes instead)
- [x] Kept client-side logic (Intercom, scroll handling, progress bar)
- [x] Updated to accept `children` prop for page template
- [ ] **BLOCKED:** Runtime build error - "Super expression must either be null or a function, not undefined"
  - **Issue:** Server/Client Component boundary issue when passing page template as children
  - **Investigation:** Demo site renders page template directly in page component, not wrapped in Layout
  - **Options:**
    1. Restructure to match demo site (page template directly, header/footer in layout)
    2. Fix component boundary issue with current structure
    3. Test dev server to see if runtime works despite build error

**Status:** 🟡 **IN PROGRESS** - Layout component migrated but encountering build error.

**Note:** Layout logic split between:
- `src/app/layout.tsx` (root layout - Server Component)
- `components/common/Layout.client.tsx` (Client Component for interactivity)
- `components/agility-pageTemplates/MainTemplate.js` (page template)

### 4.2 Page Templates
**Files:** `components/agility-pageTemplates/*`

**Changes:**
- [ ] Convert to TypeScript
- [ ] Update to use `ContentZone` from `@agility/nextjs`
- [ ] Ensure Server Components where possible
- [ ] Mark Client Components with `'use client'`

**Reference:** `demosite2025/src/components/agility-pages/MainTemplate.tsx`

### 4.3 Page Modules
**Files:** `components/agility-pageModules/*`

**Changes:**
- [ ] Convert to TypeScript
- [ ] Mark Client Components with `'use client'` where needed
- [ ] Update to use Server Components where possible
- [ ] Review and update any router usage
- [ ] Update any GraphQL client usage (may need to move to Server Components)

**Component-Level Data Fetching Migration:**

**Current Pattern (Pages Router):**
Components use `getCustomInitialProps` static method that gets called by Agility SDK:
```javascript
Component.getCustomInitialProps = async ({ agility, languageCode, item, ... }) => {
  const data = await agility.getContentList({ ... });
  return { customData: data };
};
```

**New Pattern (App Router):**
Convert to Server Components that fetch data directly:

1. **Split into Server + Client Components:**
   - Create `Component.server.tsx` - Server Component that fetches data
   - Keep `Component.tsx` - Client Component for interactivity (if needed)
   - Or combine if no interactivity needed

2. **Data Fetching in Server Component:**
```typescript
// Component.server.tsx
import { getAgilitySDK } from '@/lib/cms/getAgilitySDK';

export default async function Component({ module, ...props }) {
  const agility = await getAgilitySDK();
  const data = await agility.getContentList({
    referenceName: module.fields.listedArticles.referencename,
    languageCode: props.languageCode,
    sort: "properties.itemOrder",
    contentLinkDepth: 3,
  });

  return <ComponentClient module={module} customData={{ articles: data.items }} />;
}
```

**Modules with `getCustomInitialProps` to Migrate:**
- [ ] `ArticleListing.js` - Fetches content list for articles
- [x] `SideBarNav.js` - ✅ Added 'use client' (still has getCustomInitialProps - needs data fetching migration)
- [ ] `SDKsFrameworks.js` - Fetches links content list
- [x] `Changelog.tsx` - ✅ Added 'use client' (still has getCustomInitialProps - needs data fetching migration)
- [ ] `RightOrLeftAlignedImageLinks.js` - Fetches children content list
- [ ] `ListofLinks.js` - Fetches children content list
- [ ] `RightOrLeftAlignedLinks.js` - Fetches children content list
- [x] `DynamicArticleDetails.js` - ✅ Added 'use client'

**Page Templates:**
- [x] `MainTemplate.js` - ✅ No hooks, works as Server Component
- [x] `WithSidebarNavTemplate.js` - ✅ Added 'use client' (uses hooks)
- [x] `FullwidthTemplate.tsx` - ✅ Added 'use client' (uses hooks)

**Migration Steps for Each Module:**
1. [ ] Identify if component needs client-side interactivity
2. [ ] If yes: Split into `.server.tsx` (data fetching) + `.tsx` (client component)
3. [ ] If no: Convert entire component to Server Component with direct data fetching
4. [ ] Replace `getCustomInitialProps` with direct `getAgilitySDK()` calls
5. [ ] Update component to receive data as props instead of `customData`
6. [ ] Update module registration to use new component structure

**Key Modules to Review:**
- [ ] `SideBarNav.js` - Complex navigation, uses GraphQL, needs client interactivity
- [ ] `DynamicArticleDetails.js` - May need data fetching
- [ ] `ArticleListing.js` - Simple listing, can be Server Component
- [ ] `BlockEditor.js` - Likely needs to stay as Client Component
- [ ] `Changelog.tsx` - Already TypeScript, needs data fetching migration

### 4.4 Common Components
**Files:** `components/common/*`

**Changes:**
- [ ] Convert to TypeScript
- [ ] Update Header component (if using router)
- [ ] Update Footer component
- [ ] Review Search component
- [ ] Update any components using `useRouter` to Client Components

---

## Phase 5: Data Fetching & GraphQL Migration

### 5.1 GraphQL Client
**File:** `agility-graphql-client.js`

**Current Usage:**
- Used in `pages/[...slug].js` for header content query
- Used in `SideBarNav.js` for sections/articles queries
- Used for sitemap caching

**Considerations:**
- [ ] Evaluate if GraphQL is still needed (demo site doesn't use it)
- [ ] If keeping, update to work with Server Components
- [ ] Consider moving GraphQL queries to Server Actions or Route Handlers
- [ ] Update preview mode detection
- [ ] **Header query** - Move to `getHeaderContent.ts` utility (used in layout)
- [ ] **SideBarNav queries** - Move to Server Component data fetching
- [ ] **Sitemap caching** - May not need GraphQL cache, use Next.js cache tags instead

### 5.2 Data Fetching Patterns

**Global Data Fetching (Layout Level):**
- [ ] Move all global data fetching from `pages/[...slug].js` to `layout.tsx`
- [ ] Create utilities for reusable data fetching:
  - [ ] `src/lib/cms-content/getHeaderContent.ts` - Header GraphQL query
  - [ ] `src/lib/cms-content/getFooterContent.ts` - Footer from main Agility site
  - [ ] `src/lib/cms-content/getGlobalData.ts` - Combined global data fetcher
  - [ ] `src/lib/cms-content/getMainMenuLinks.ts` - Menu links from sitemap
- [ ] Update sitemap fetching to use new SDK with cache tags
- [ ] Add proper caching with Next.js cache tags for global data

**Page-Level Data Fetching:**
- [ ] Replace `getStaticProps` with async Server Components
- [ ] Replace `getStaticPaths` with `generateStaticParams`
- [ ] Page components only fetch Agility page data (via `getAgilityPage`)
- [ ] Remove global data fetching from page components

**Component-Level Data Fetching:**
- [ ] Replace `getCustomInitialProps` pattern with direct Server Component data fetching
- [ ] Components fetch their own data using `getAgilitySDK()` directly
- [ ] No need for `getCustomInitialProps` - data fetching happens in component body
- [ ] Use Server Components for data fetching, Client Components only for interactivity

### 5.3 Content Fetching Utilities
**Files to create/update:**
- [ ] `src/lib/cms-content/getHeaderContent.ts` - Header content (GraphQL) **with locale param**
- [ ] `src/lib/cms-content/getFooterContent.ts` - Footer content (main site) **with locale param**
- [ ] `src/lib/cms-content/getPageMetaData.ts` - Page metadata **with locale param**
- [ ] `src/lib/cms-content/getMainMenuLinks.ts` - Menu links from sitemap **with locale param**
- [ ] `src/lib/cms-content/getGlobalData.ts` - Combined global data fetcher **with locale param** (optional)
- [ ] Update sitemap utilities to use new SDK pattern **with locale param**

**Important:** All functions that fetch Agility content must accept a `locale` parameter, even though the site currently only supports one locale. This ensures the code is ready for multi-locale support when it's added.

**Reference:** `demosite2025/src/lib/cms-content/`

---

## Phase 6: Routing & Navigation

### 6.1 Locale Support (if needed)
- [ ] Create `src/lib/i18n/config.ts`
- [ ] Implement locale detection
- [ ] Update middleware for locale routing
- [ ] Update links to handle locales

**Reference:** `demosite2025/src/lib/i18n/`

### 6.2 Link Components
- [ ] Review all `Link` usage
- [ ] Update to use Next.js 15 Link component
- [ ] Consider ViewTransitionLink if using transitions

### 6.3 Router Migration
- [ ] Replace `useRouter` from `next/router` with `next/navigation`
- [ ] Update router event listeners (may need different approach)
- [ ] Update navigation logic

---

## Phase 7: Styling & Assets

### 7.1 CSS Files
- [ ] Move global styles to `src/styles/`
- [ ] Update imports in layout
- [ ] Review Tailwind configuration
- [ ] Ensure PostCSS config is correct

### 7.2 Fonts
- [ ] Update font loading in `layout.tsx`
- [ ] Use Next.js font optimization

### 7.3 Assets
- [ ] Ensure `public/` assets are accessible
- [ ] Update image optimization if needed

---

## Phase 8: Preview Mode & Development

### 8.1 Preview Mode
- [ ] Update preview API route
- [ ] Update exit preview route
- [ ] Test preview functionality
- [ ] Update preview widgets/components

### 8.2 Development Tools
- [ ] Update dev scripts if needed
- [ ] Test build process
- [ ] Verify environment variables

---

## Phase 9: Testing & Validation

### 9.1 Functional Testing
- [ ] Test all page routes
- [ ] Test dynamic routes
- [ ] Test preview mode
- [ ] Test API routes
- [ ] Test search functionality
- [ ] Test navigation
- [ ] Test error pages

### 9.2 Performance Testing
- [ ] Verify static generation
- [ ] Check ISR revalidation
- [ ] Test build times
- [ ] Check bundle sizes

### 9.3 SEO Validation
- [ ] Verify metadata generation
- [ ] Check sitemap generation
- [ ] Verify robots.txt
- [ ] Test structured data

---

## Phase 10: Cleanup

### 10.1 Remove Old Files
- [ ] **Important**: Only delete `pages/` directory after ALL routes are migrated and verified
- [ ] The `pages` and `app` directories can coexist during incremental migration
- [ ] Remove old middleware file (if replaced)
- [ ] Clean up unused dependencies
- [ ] Remove old configuration files
- [ ] Keep `pages/_app.js` and `pages/_document.js` until all pages are migrated

### 10.2 Documentation
- [ ] Update README
- [ ] Update deployment docs
- [ ] Document new structure
- [ ] Update environment variable docs

---

## Migration Checklist Summary

### Critical Path Items
1. ✅ Create migration plan (this document)
2. ✅ Update dependencies (Next.js 15, React 19, @agility/nextjs 15.0.7)
3. ✅ Create App Router structure (src/app/, src/lib/, src/components/)
4. ✅ Migrate middleware (src/middleware.ts)
5. ✅ Migrate root layout (src/app/layout.tsx)
6. ✅ Migrate dynamic route page (src/app/[...slug]/page.tsx)
7. ✅ Migrate API routes (preview, robots, sitemap, feedback, image, link search)
8. ⬜ Update components (pending - components still in Pages Router format)
9. ⬜ Test thoroughly (pending)
10. ⬜ Deploy and verify (pending)

### Current Status: **Phase 2-3 Complete, Phase 4 In Progress (70%)**
- ✅ Core infrastructure and pages migrated
- 🟡 Component migration in progress - **BLOCKED** by runtime build error
- ⚠️ Build error: "Super expression must either be null or a function, not undefined"
- 📋 Next: Resolve build error, then continue component migration

---

## Key Considerations

### Breaking Changes
- **Router API**: `next/router` → `next/navigation` (different API)
- **Data Fetching**: `getStaticProps` → Server Components (different pattern)
- **Preview Mode**: `res.setPreviewData()` → `draftMode()` (different API)
- **API Routes**: Different structure and request/response handling
- **Client Components**: Must explicitly mark with `'use client'`

### Compatibility
- **Base Path**: Current site uses `/docs` basePath - ensure this works with App Router
- **GraphQL**: May need to refactor if keeping Apollo Client
- **Third-party Scripts**: Verify Google Tag Manager, Intercom, etc. still work

### Performance
- **Server Components**: Better performance with Server Components
- **Caching**: Use Next.js cache tags for better caching
- **Bundle Size**: Should improve with Server Components

---

## Reference Files from Demo Site

Key files to reference during migration:
- `src/app/layout.tsx` - Root layout
- `src/app/[...slug]/page.tsx` - Dynamic route (single locale site)
- `src/middleware.ts` - Middleware
- `src/lib/cms/getAgilityPage.ts` - Page fetching
- `src/lib/cms/getAgilitySDK.ts` - SDK setup
- `src/lib/cms/getAgilityContext.ts` - Context management
- `src/app/api/preview/route.ts` - Preview API
- `src/components/agility-pages/MainTemplate.tsx` - Page template

---

## Timeline Estimate

- **Phase 1-2**: 1-2 days (Setup & Infrastructure)
- **Phase 3**: 2-3 days (Page Migration)
- **Phase 4**: 2-3 days (Component Migration)
- **Phase 5**: 1-2 days (Data Fetching)
- **Phase 6-7**: 1-2 days (Routing & Styling)
- **Phase 8**: 1 day (Preview & Dev)
- **Phase 9**: 2-3 days (Testing)
- **Phase 10**: 1 day (Cleanup)

**Total Estimated Time**: 11-18 days

---

## Notes

- This migration should be done incrementally if possible
- Consider creating a feature branch for the migration
- Test each phase before moving to the next
- Keep the old `pages/` directory until migration is complete and verified
- Document any custom logic that doesn't have a direct equivalent
