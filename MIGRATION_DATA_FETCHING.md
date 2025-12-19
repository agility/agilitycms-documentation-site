# Data Fetching Migration Guide

## Overview
This document details how to migrate data fetching patterns from Pages Router to App Router, specifically for Agility CMS components.

## Current Architecture (Pages Router)

### Global Data Fetching
**Location:** `pages/[...slug].js` → `getStaticProps`

All global data is fetched in `getStaticProps` and passed down as props:

```javascript
export async function getStaticProps({ preview, params, locale }) {
  // 1. Get Agility page props
  const agilityProps = await getAgilityPageProps({ ... });

  // 2. Get sitemap (cached in GraphQL)
  const { sitemap } = client.readQuery({ query: READ_SITEMAP_FOR_HEADER });

  // 3. Generate main menu links from sitemap
  const mainMenuLinks = sitemap.filter(...).map(...);

  // 4. Fetch header content (GraphQL)
  const { data } = await client.query({ query: HEADER_QUERY });

  // 5. Fetch footer content (main Agility site)
  const mainSiteFooter = await api.getContentItem({ contentID: 16, ... });

  // 6. Fetch marketing content (main Agility site)
  const mainSiteHeader = await api.getContentItem({ contentID: 22, ... });

  return {
    props: {
      ...agilityProps,
      mainMenuLinks,
      primaryDropdownLinks,
      secondaryDropdownLinks,
      marketingContent,
      preHeader,
      footerNavigation,
      footerBottomNavigation,
      footerCopyright,
    },
    revalidate: 10,
  };
}
```

### Component-Level Data Fetching
**Pattern:** `getCustomInitialProps` static method

Components define a static method that gets called by Agility SDK:

```javascript
// ArticleListing.js
const ArticleListing = ({ module, customData }) => {
  const { articles } = customData;
  // Render component...
};

ArticleListing.getCustomInitialProps = async ({
  agility,
  languageCode,
  item,
  sitemapNode,
}) => {
  const children = await agility.getContentList({
    referenceName: item.fields.listedArticles.referencename,
    languageCode,
    sort: "properties.itemOrder",
    contentLinkDepth: 3,
  });

  return {
    articles: normalizeListedArticles({ listedArticles: children.items }),
  };
};
```

---

## New Architecture (App Router)

### Global Data Fetching
**Location:** `src/app/layout.tsx` (Root Layout)

**Note:** This documentation site does NOT support multi-locale, so global data is fetched in the root layout.

Global data is fetched in the root layout and passed to child components:

```typescript
// src/app/layout.tsx
import { getHeaderContent } from '@/lib/cms-content/getHeaderContent';
import { getFooterContent } from '@/lib/cms-content/getFooterContent';
import { getMainMenuLinks } from '@/lib/cms-content/getMainMenuLinks';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  // Get locale (single locale for now, but pass to functions for future multi-locale support)
  const locale = process.env.AGILITY_LOCALES?.split(',')[0] || 'en-us';

  // Fetch all global data in parallel (all functions accept locale param for future-proofing)
  const [headerContent, footerContent, mainMenuLinks] = await Promise.all([
    getHeaderContent({ locale }),
    getFooterContent({ locale }),
    getMainMenuLinks({ locale }),
  ]);

  return (
    <html lang="en">
      <body>
        <Header
          mainMenuLinks={mainMenuLinks}
          headerContent={headerContent}
        />
        {children}
        <Footer footerContent={footerContent} />
      </body>
    </html>
  );
}
```

**Note:** This site does NOT support multi-locale YET, but:
- All utility functions accept `locale` parameter for future-proofing
- Global data fetching happens in root `layout.tsx`
- When multi-locale is added later, functions will already be ready

**Utility Functions:**

```typescript
// src/lib/cms-content/getHeaderContent.ts
import { getAgilitySDK } from '@/lib/cms/getAgilitySDK';
import { client } from '@/agility-graphql-client'; // or convert to SDK

interface Props {
  locale: string;
}

export async function getHeaderContent({ locale }: Props) {
  // Option 1: Keep GraphQL
  const { data } = await client.query({ query: HEADER_QUERY });

  // Option 2: Convert to SDK (recommended)
  const agility = await getAgilitySDK();
  const header = await agility.getContentItem({
    contentID: HEADER_CONTENT_ID,
    languageCode: locale,
  });

  return {
    showPreHeader: header.fields.showPreHeader,
    signInLink: header.fields.signInLink,
    // ... other header fields
  };
}
```

**Note:** Function accepts `locale` parameter even though site is single-locale. This future-proofs for multi-locale support.

```typescript
// src/lib/cms-content/getMainMenuLinks.ts
import { getSitemapFlat } from '@/lib/cms/getSitemapFlat';

interface Props {
  locale: string;
  currentPath?: string;
}

export async function getMainMenuLinks({ locale, currentPath }: Props) {
  const sitemap = await getSitemapFlat(locale);

  return Object.values(sitemap)
    .filter(node => node.visible.menu && node.path.split("/").length <= 2)
    .map(node => ({
      name: node.menuText,
      href: node.path === "/home" ? "/" : node.path,
      current: currentPath === node.path,
    }));
}
```

**Note:** Function accepts `locale` parameter even though site is single-locale. This future-proofs for multi-locale support.

### Component-Level Data Fetching
**Pattern:** Direct data fetching in Server Components

Convert components to Server Components that fetch their own data:

```typescript
// components/agility-pageModules/ArticleListing.tsx
import { getAgilitySDK } from '@/lib/cms/getAgilitySDK';
import { normalizeListedArticles } from '@/utils/linkUtils';
import type { UnloadedModuleProps } from '@agility/nextjs';

export default async function ArticleListing({
  module,
  languageCode
}: UnloadedModuleProps) {
  // Fetch data directly in Server Component (no getCustomInitialProps)
  const agility = await getAgilitySDK();
  const children = await agility.getContentList({
    referenceName: module.fields.listedArticles.referencename,
    languageCode,
    sort: "properties.itemOrder",
    contentLinkDepth: 3,
  });

  const articles = normalizeListedArticles({
    listedArticles: children.items,
  });

  // Render directly (Server Component)
  return (
    <div>
      {articles.map(article => (
        <Link href={article.href}>{article.title}</Link>
      ))}
    </div>
  );
}
```

**Key Points:**
- Component receives `UnloadedModuleProps` from Agility SDK
- Fetches data directly using `getAgilitySDK()`
- No `getCustomInitialProps` method needed
- Can be pure Server Component if no interactivity needed

**If Component Needs Interactivity:**

```typescript
// components/agility-pageModules/ArticleListing.tsx (Client Component)
'use client';

export default function ArticleListingClient({ module, articles }) {
  // Client-side interactivity here
  return (
    <div>
      {articles.map(article => (
        <Link href={article.href}>{article.title}</Link>
      ))}
    </div>
  );
}
```

---

## Migration Checklist

### Global Data Migration
- [ ] Create `src/lib/cms-content/getHeaderContent.ts` (**with locale parameter**)
- [ ] Create `src/lib/cms-content/getFooterContent.ts` (**with locale parameter**)
- [ ] Create `src/lib/cms-content/getMainMenuLinks.ts` (**with locale parameter**)
- [ ] Create `src/lib/cms-content/getGlobalData.ts` (optional combined fetcher) (**with locale parameter**)
- [ ] Move header GraphQL query to utility
- [ ] Move footer fetching to utility
- [ ] Move menu links generation to utility
- [ ] Update `layout.tsx` to fetch global data (pass locale to all functions)
- [ ] Pass global data to Header/Footer components
- [ ] Remove global data fetching from `pages/[...slug].js`
- [ ] **Important:** All functions accept `locale` parameter for future multi-locale support

### Component Data Migration
For each component with `getCustomInitialProps`:

- [ ] **ArticleListing.js**
  - [ ] Convert to Server Component
  - [ ] Move `getCustomInitialProps` logic to component body
  - [ ] Use `getAgilitySDK()` directly
  - [ ] Update to receive data as props

- [ ] **SideBarNav.js**
  - [ ] Convert to Server Component for data fetching
  - [ ] Move GraphQL queries to Server Component
  - [ ] Create Client Component for interactivity (Disclosure, etc.)
  - [ ] Pass fetched data to Client Component

- [ ] **SDKsFrameworks.js**
  - [ ] Convert to Server Component
  - [ ] Move `getCustomInitialProps` logic to component body
  - [ ] Update to use SDK directly

- [ ] **Changelog.tsx**
  - [ ] Move `getCustomInitialProps` logic to component body
  - [ ] Use `getAgilitySDK()` directly

- [ ] **RightOrLeftAlignedImageLinks.js**
  - [ ] Convert to Server Component
  - [ ] Move `getCustomInitialProps` logic to component body

- [ ] **ListofLinks.js**
  - [ ] Convert to Server Component
  - [ ] Move `getCustomInitialProps` logic to component body

- [ ] **RightOrLeftAlignedLinks.js**
  - [ ] Convert to Server Component
  - [ ] Move `getCustomInitialProps` logic to component body

### Module Registration Update
- [ ] Update `components/agility-pageModules/index.ts` to export Server Components
- [ ] Ensure `getModule` function returns correct component type
- [ ] Test that Agility SDK can render modules correctly

---

## Key Differences Summary

| Aspect | Pages Router | App Router |
|--------|-------------|------------|
| **Global Data** | `getStaticProps` in page | `layout.tsx` Server Component |
| **Component Data** | `getCustomInitialProps` static method | Direct fetching in Server Component |
| **Data Flow** | Props passed down from page | Data fetched where needed |
| **Caching** | `revalidate` in `getStaticProps` | `next: { revalidate }` in fetch options |
| **Preview Mode** | `preview` prop | `draftMode()` from `next/headers` |

---

## Benefits of New Pattern

1. **Simpler Data Flow** - Data fetched where it's used
2. **Better Performance** - Server Components reduce client bundle
3. **Type Safety** - TypeScript throughout
4. **Flexibility** - Can fetch data at any level (layout, page, component)
5. **Caching** - Next.js cache tags for better caching control

---

## Example: Complete Component Migration

### Before (Pages Router)
```javascript
// ArticleListing.js
const ArticleListing = ({ module, customData }) => {
  const { articles } = customData;
  return <div>{/* render articles */}</div>;
};

ArticleListing.getCustomInitialProps = async ({ agility, languageCode, item }) => {
  const children = await agility.getContentList({ ... });
  return { articles: normalizeListedArticles(children.items) };
};
```

### After (App Router)
```typescript
// ArticleListing.tsx
import { getAgilitySDK } from '@/lib/cms/getAgilitySDK';
import { normalizeListedArticles } from '@/utils/linkUtils';
import type { UnloadedModuleProps } from '@agility/nextjs';

export default async function ArticleListing({
  module,
  languageCode
}: UnloadedModuleProps) {
  // Fetch data directly - no getCustomInitialProps needed
  const agility = await getAgilitySDK();
  const children = await agility.getContentList({
    referenceName: module.fields.listedArticles.referencename,
    languageCode,
    sort: "properties.itemOrder",
    contentLinkDepth: 3,
  });

  const articles = normalizeListedArticles({
    listedArticles: children.items,
  });

  return (
    <div>
      {articles.map(article => (
        <Link href={article.href}>{article.title}</Link>
      ))}
    </div>
  );
}
```

**Key Differences:**
- Uses `UnloadedModuleProps` type from `@agility/nextjs`
- No `.server.tsx` suffix needed (Server Components are default)
- No `getCustomInitialProps` method
- Data fetching happens directly in component body

---

## Notes

- **No `getCustomInitialProps` in App Router** - This pattern doesn't exist in App Router
- **Server Components by Default** - Components are Server Components unless marked `'use client'`
- **Direct SDK Access** - Use `getAgilitySDK()` directly in Server Components
- **Parallel Fetching** - Use `Promise.all()` for parallel data fetching in layout
- **Caching** - Use Next.js cache tags and revalidation for optimal performance
