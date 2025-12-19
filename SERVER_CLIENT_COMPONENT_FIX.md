# Server/Client Component Boundary Issue - Fix Documentation

## The Problem

**Build Error:** `Super expression must either be null or a function, not undefined`

**Root Cause:** Violation of Next.js App Router Server/Client Component composition rules.

### Current Code Structure (BROKEN)

**src/app/[...slug]/page.tsx** (Server Component):
```tsx
<Layout {...pageProps}>                    {/* ❌ Client Component */}
  <AgilityPageTemplate {...pageProps} />   {/* ❌ Server Component */}
</Layout>
```

**Why This Fails:**
1. `Layout.client.tsx` is a Client Component (marked with `'use client'`)
2. `MainTemplate.js` is a Server Component (no `'use client'` directive)
3. You **CANNOT** pass a Server Component as a child to a Client Component when rendered inline
4. React tries to bundle the Server Component into the client bundle → causes error

### The Critical Rule

From Next.js documentation:

> ❌ **CANNOT:** Import/render Server Components inside Client Components directly
> ✅ **CAN:** Pass Server Components as props (children) to Client Components

**However**, there's a catch: The Server Component must be instantiated in a **Server Component context**, not inside the Client Component's JSX.

## The Solution: Restructure Layout Pattern

We need to follow the **proper App Router pattern** used in demosite2025:

### New Structure (CORRECT)

```
┌─────────────────────────────────────┐
│ src/app/layout.tsx                  │  Server Component
│ - Fetches global data               │
│ - Renders <html>, <body>            │
│ - Renders Header, Footer (direct)   │
│ - Passes {children} through         │
└─────────────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────┐
│ src/app/[...slug]/page.tsx          │  Server Component
│ - Fetches page data                 │
│ - Renders PageTemplate directly     │
│ - Wraps with ClientWrapper only     │
│   for client-side features          │
└─────────────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────┐
│ AgilityPageTemplate                 │  Server Component
│ - Uses ContentZone                  │
│ - Renders modules                   │
└─────────────────────────────────────┘
```

## Implementation Steps

### Step 1: Update Root Layout

**src/app/layout.tsx** should render Header and Footer directly:

```tsx
export default async function RootLayout({ children }) {
  const locale = process.env.AGILITY_LOCALES?.split(',')[0] || 'en-us';

  // Fetch global data
  const [headerContent, footerContent, mainMenuLinks, marketingContent] = await Promise.all([
    getHeaderContent({ locale }),
    getFooterContent({ locale }),
    getMainMenuLinks({ locale }),
    getMarketingContent({ locale }),
  ]);

  const preHeader = { /* ... */ };

  return (
    <html lang="en" className={mulish.variable}>
      <body>
        <GoogleTagManager gtmId="GTM-NJW8WMX" />
        <div id="SiteWrapper" className="h-full font-muli">
          <div id="Site" className="flex flex-col h-full">
            <Header
              mainMenuLinks={mainMenuLinks}
              primaryDropdownLinks={headerContent?.primaryDropdownLinks}
              secondaryDropdownLinks={headerContent?.secondaryDropdownLinks}
              marketingContent={marketingContent}
              preHeader={preHeader}
            />
            {children}  {/* Page content goes here */}
          </div>
        </div>
      </body>
    </html>
  );
}
```

### Step 2: Create Client Wrapper (Optional)

If you need client-side features like Intercom, progress bar, create a wrapper:

**components/common/ClientFeatures.tsx**:
```tsx
'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import nProgress from 'nprogress'
import { Intercom } from '@intercom/messenger-js-sdk'

export default function ClientFeatures({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    Intercom({ app_id: 'fj9g3mkl' })
  }, [])

  useEffect(() => {
    nProgress.start()
    const timer = setTimeout(() => nProgress.done(), 100)
    return () => {
      clearTimeout(timer)
      nProgress.done()
    }
  }, [pathname])

  return <>{children}</>
}
```

Then wrap in layout:
```tsx
<ClientFeatures>
  {children}
</ClientFeatures>
```

### Step 3: Update Page Component

**src/app/[...slug]/page.tsx** renders template directly:

```tsx
export default async function Page({ params }: PageProps) {
  const locale = process.env.AGILITY_LOCALES?.split(',')[0] || 'en-us';
  const { isPreview, isDevelopmentMode } = await getAgilityContext(locale);

  const agilityData = await getAgilityPage({ params });
  if (!agilityData.page || agilityData.notFound) {
    notFound();
  }

  // Get the page template
  const AgilityPageTemplate = getPageTemplate(agilityData.pageTemplateName || "");

  if (!AgilityPageTemplate) {
    return <div>No template found</div>;
  }

  // Render template directly (Server Component)
  return (
    <>
      <HeadSEO {...seoProps} />
      <AgilityPageTemplate
        {...agilityData}
        isPreview={isPreview}
        isDevelopmentMode={isDevelopmentMode}
      />
      <PreviewWidget isPreview={isPreview} isDevelopmentMode={isDevelopmentMode} />
      <CMSWidget {...widgetProps} />
    </>
  );
}
```

### Step 4: Update Page Templates

Each template should include Footer at the bottom:

**components/agility-pageTemplates/MainTemplate.js**:
```jsx
import React from "react";
import { ContentZone } from "@agility/nextjs";
import { getModule } from "components/agility-pageModules";
import Footer from "../common/Footer";

const MainTemplate = (props) => {
  return (
    <div id="MainTemplate" className="flex flex-grow bg-white overflow-hidden">
      <div id="ScrollContainer" className="flex-grow overflow-y-auto">
        <div id="ContentContainer">
          <ContentZone name="MainContentZone" {...props} getModule={getModule} />
        </div>
        <Footer
          navigation={props.footerNavigation}
          bottomNavigation={props.footerBottomNavigation}
          copyright={props.footerCopyright}
        />
      </div>
    </div>
  );
};

export default MainTemplate;
```

## Alternative: Quick Fix (Not Recommended)

If you want a quick fix, add `'use client'` to all page templates. This works but:
- ❌ Loses Server Component benefits
- ❌ Increases bundle size
- ❌ Can't use async/await for data fetching in templates

**Only use this as a temporary workaround.**

## Migration Checklist

- [ ] Update `src/app/layout.tsx` to render Header/Footer
- [ ] Create `ClientFeatures.tsx` wrapper for client-side features
- [ ] Update `src/app/[...slug]/page.tsx` to render template directly
- [ ] Remove `Layout.client.tsx` wrapper (no longer needed)
- [ ] Update page templates to include Footer (if needed)
- [ ] Pass footer props from layout or page to templates
- [ ] Test build succeeds
- [ ] Test preview mode works
- [ ] Test client features (Intercom, progress bar) work

## Reference

- [Next.js: Composition Patterns](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns)
- [Next.js: Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- Demo Site Reference: `demosite2025/src/app/[locale]/layout.tsx`
