# Agility CMS Specific Migration Notes

## Configuration

### Environment Variables
Both projects use the same environment variables:
- `AGILITY_GUID` - Your Agility CMS instance GUID
- `AGILITY_API_FETCH_KEY` - Live API key for published content
- `AGILITY_API_PREVIEW_KEY` - Preview API key for draft content
- `AGILITY_LOCALES` - Comma-separated locale codes (e.g., `en-us` or `en-us,fr-ca`)
- `AGILITY_SITEMAP` - Sitemap reference name (defaults to `website`)

### Agility Config Access
In App Router, `agilityConfig` is imported from `@agility/nextjs`:
```typescript
import { agilityConfig } from "@agility/nextjs";

// Access config values
const locales = agilityConfig.locales;
const channelName = agilityConfig.channelName;
```

This is auto-configured based on environment variables.

---

## SDK Usage

### Pages Router (Current)
```javascript
const agility = require("@agility/content-fetch");
const api = await agility.getApi({
  guid: process.env.AGILITY_GUID,
  apiKey: process.env.AGILITY_API_PREVIEW_KEY,
  isPreview: true
});
```

### App Router (New)
```typescript
import agility from '@agility/content-fetch';
import { draftMode } from 'next/headers';

const getAgilitySDK = async () => {
  const isDevelopmentMode = process.env.NODE_ENV === "development";
  const { isEnabled: isDraftMode } = await draftMode();
  const isPreview = isDevelopmentMode || isDraftMode;

  const apiKey = isPreview
    ? process.env.AGILITY_API_PREVIEW_KEY
    : process.env.AGILITY_API_FETCH_KEY;

  return agility.getApi({
    guid: process.env.AGILITY_GUID,
    apiKey,
    isPreview
  });
};
```

**Key Changes:**
- Use `draftMode()` instead of preview prop
- Mark function with `"server-only"` directive
- Preview mode is determined by `draftMode()` or development mode

---

## Page Fetching

### Pages Router (Current)
```javascript
import { getAgilityPageProps, getAgilityPaths } from "@agility/nextjs/node";

export async function getStaticProps({ preview, params, locale }) {
  const agilityProps = await getAgilityPageProps({
    preview,
    params,
    locale,
    getModule,
  });
  return { props: agilityProps };
}

export async function getStaticPaths() {
  const paths = await getAgilityPaths({ preview: false });
  return { paths, fallback: true };
}
```

### App Router (New)
```typescript
import { getAgilityPageProps } from "@agility/nextjs/node";
import { getAgilityContext } from "@/lib/cms/getAgilityContext";

export async function generateStaticParams() {
  const agilityClient = await getAgilitySDK();
  const sitemap = await agilityClient.getSitemapFlat({
    channelName: process.env.AGILITY_SITEMAP || "website",
    languageCode: locale,
  });

  return Object.values(sitemap)
    .filter(node => !node.redirect && !node.isFolder)
    .map(node => ({
      locale: 'en-us',
      slug: node.path.split("/").slice(1),
    }));
}

export default async function Page({ params }) {
  const { locale, isPreview } = await getAgilityContext(params.locale);
  const page = await getAgilityPageProps({
    params: await params,
    preview: isPreview,
    locale,
    getModule,
  });
  // Render page...
}
```

---

## Component Registration

### Module Registration Pattern
Both projects use a similar pattern:

**Current:**
```javascript
// components/agility-pageModules/index.js
const allModules = [
  { name: "RichTextArea", module: RichTextArea },
  { name: "SideBarNav", module: SideBarNav },
  // ...
];

export const getModule = (moduleName) => {
  const obj = allModules.find(
    (m) => m.name.toLowerCase() === moduleName.toLowerCase()
  );
  return obj?.module || null;
};
```

**New (TypeScript):**
```typescript
// components/agility-components/index.ts
const allModules = [
  { name: "RichTextArea", module: RichTextArea },
  { name: "SideBarNav", module: SideBarNav },
  // ...
];

export const getModule = (moduleName: string): any | null => {
  if (!moduleName) return null;
  const obj = allModules.find(
    (m) => m.name.toLowerCase() === moduleName.toLowerCase()
  );
  return obj?.module || NoComponentFound; // Return fallback component
};
```

**Key Differences:**
- TypeScript types
- Return `NoComponentFound` component instead of `null` (better UX)

---

## Page Templates

### Current Pattern
```javascript
// components/agility-pageTemplates/index.js
const allTemplates = [
  { name: "MainTemplate", template: MainTemplate },
];

export const getPageTemplate = (templateName) => {
  const obj = allTemplates.find(
    (m) => m.name.toLowerCase() === templateName.toLowerCase()
  );
  return obj?.template || null;
};
```

### New Pattern
```typescript
// components/agility-pages/index.ts
import MainTemplate from "./MainTemplate";

const allTemplates = [
  { name: "MainTemplate", template: MainTemplate }
];

export const getPageTemplate = (templateName: string) => {
  if (!templateName) return null;
  const obj = allTemplates.find(
    (m) => m.name.toLowerCase() === templateName.toLowerCase()
  );
  return obj?.template || null;
};
```

**Template Component:**
```typescript
// components/agility-pages/MainTemplate.tsx
import { ContentZone } from "@agility/nextjs";
import { getModule } from "../agility-components";

const MainTemplate = (props: any) => {
  return (
    <ContentZone name="main-content-zone" {...props} getModule={getModule} />
  );
};

export default MainTemplate;
```

---

## Content Zones

### Using ContentZone
The `ContentZone` component from `@agility/nextjs` handles module rendering:

```typescript
import { ContentZone } from "@agility/nextjs";

<ContentZone
  name="main-content-zone"
  {...props}
  getModule={getModule}
/>
```

This replaces the manual module mapping that might have been done in Pages Router.

---

## Image Rendering

### Important: Use AgilityPic
Always use `<AgilityPic>` from `@agility/nextjs` for Agility images:

```typescript
import { AgilityPic } from "@agility/nextjs";
import type { ImageField } from "@agility/nextjs";

function Component({ image }: { image: ImageField }) {
  return <AgilityPic image={image} />;
}
```

**Never use:**
- Next.js `<Image>` component for Agility images
- Plain `<img>` tags for Agility images

---

## HTML Rendering

### Use renderHTML
Always use `renderHTML()` from `@agility/nextjs`:

```typescript
import { renderHTML } from "@agility/nextjs";

function Component({ htmlContent }: { htmlContent: string }) {
  return <div>{renderHTML(htmlContent)}</div>;
}
```

**Never use:**
- `dangerouslySetInnerHTML` directly

---

## Preview Mode

### Pages Router
```javascript
// pages/api/preview.js
res.setPreviewData({});
```

### App Router
```typescript
// app/api/preview/route.ts
import { draftMode } from 'next/headers';

(await draftMode()).enable();
```

**Key Difference:**
- `draftMode()` is async and must be awaited
- Use `enable()` and `disable()` methods
- Automatically handles cookies

---

## Dynamic Page URLs

### Getting Dynamic Page URLs
```typescript
import { getDynamicPageURL } from "@agility/nextjs/node";

const dynamicPath = await getDynamicPageURL({
  contentID: Number(contentID),
  preview: true,
  slug: slug || undefined
});
```

Used in:
- Preview API routes
- Dynamic redirect routes
- Exit preview routes

---

## Sitemap Fetching

### Current (Pages Router)
```javascript
const sitemap = await api.getSitemapFlat({
  channelName: 'website',
  languageCode: 'en-us'
});
```

### New (App Router with Caching)
```typescript
agilityClient.config.fetchConfig = {
  next: {
    tags: [`agility-sitemap-flat-${locale}`],
    revalidate: 60,
  },
};

const sitemap = await agilityClient.getSitemapFlat({
  channelName: process.env.AGILITY_SITEMAP || "website",
  languageCode: locale,
});
```

**Key Addition:**
- Use Next.js cache tags for better caching
- Set revalidation time

---

## GraphQL Considerations

### Current Project Uses GraphQL
The current project uses Apollo Client for GraphQL queries:
- **Header content** - Query in `pages/[...slug].js` (lines 110-146)
- **SideBarNav** - Queries for sections and articles (in component's `getCustomInitialProps`)
- **Sitemap caching** - GraphQL cache for sitemap data

### Demo Site Doesn't Use GraphQL
The demo site uses direct Agility SDK calls instead.

### Migration Strategy

**For Layout-Level Data (Header/Footer):**
- [ ] Move header GraphQL query to `src/lib/cms-content/getHeaderContent.ts`
- [ ] Convert to use Agility SDK `getContentItem` instead of GraphQL (if possible)
- [ ] Or keep GraphQL but make it work with Server Components
- [ ] Fetch in `layout.tsx` and pass to Header component

**For Component-Level Data (SideBarNav, etc.):**
- [ ] Convert `getCustomInitialProps` to Server Component data fetching
- [ ] Replace GraphQL queries with SDK calls (`getContentList`, `getContentItem`)
- [ ] Fetch data directly in Server Component before rendering

**For Sitemap Caching:**
- [ ] Remove GraphQL sitemap cache
- [ ] Use Next.js cache tags instead (`next: { tags: ['agility-sitemap'] }`)
- [ ] Fetch sitemap using SDK in layout or utility function

### Migration Options

**Option 1: Keep GraphQL**
- Update Apollo Client to work with Server Components
- Move queries to Server Actions or Route Handlers
- May need to refactor significantly
- More complex but preserves existing queries

**Option 2: Migrate to SDK Calls (Recommended)**
- Replace GraphQL queries with SDK calls
- Simpler, matches demo site pattern
- Better alignment with App Router patterns
- May require refactoring components but cleaner long-term

**Recommendation:** Migrate to SDK calls for consistency with demo site and simpler Server Component patterns. GraphQL can be kept for complex queries if needed, but most content can be fetched via SDK.

---

## TypeScript Types

### Common Agility Types
```typescript
import type {
  ImageField,
  URLField,
  ContentItem,
  UnloadedModuleProps,
  AgilityPageProps,
} from "@agility/nextjs";
```

Use these types throughout components for type safety.

---

## Base Path Configuration

### Current Project
Uses `basePath: '/docs'` in `next.config.js`.

### App Router Compatibility
App Router supports `basePath` in `next.config.js`, so this should continue to work. However, verify:
- Links are generated correctly
- API routes work with base path
- Preview mode works with base path
- Static assets load correctly

---

## Module Props Pattern

### UnloadedModuleProps
Agility modules receive props via `UnloadedModuleProps`:

```typescript
import type { UnloadedModuleProps } from "@agility/nextjs";

function MyModule(props: UnloadedModuleProps) {
  const { module, customData, page, sitemapNode } = props;
  // Use module data...
}
```

---

## Checklist for Agility-Specific Migration

- [ ] Update `@agility/nextjs` to 15.0.7
- [ ] Create `getAgilitySDK` utility using `draftMode()`
- [ ] Create `getAgilityContext` utility
- [ ] Create `getAgilityPage` utility
- [ ] Update preview API to use `draftMode()`
- [ ] Update module registration to TypeScript
- [ ] Update page template registration
- [ ] Replace all `<Image>` with `<AgilityPic>` for Agility images
- [ ] Replace `dangerouslySetInnerHTML` with `renderHTML()`
- [ ] Update sitemap fetching with cache tags
- [ ] Evaluate GraphQL usage (keep or migrate to SDK)
- [ ] Test preview mode thoroughly
- [ ] Verify base path works correctly
- [ ] Update all component types to use Agility types
- [ ] **All content-fetching functions accept `locale` parameter** (for future multi-locale support)
