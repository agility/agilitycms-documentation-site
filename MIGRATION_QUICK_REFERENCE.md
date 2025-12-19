# Migration Quick Reference Guide

**Official Next.js Migration Guide**: https://nextjs.org/docs/app/guides/migrating/app-router-migration

## Common Pattern Conversions

> **Key Point**: The `pages` and `app` directories can coexist, allowing incremental migration. You don't need to migrate everything at once.

### 1. Data Fetching

#### Pages Router (Old)
```javascript
// pages/[...slug].js
export async function getStaticProps({ params, preview }) {
  const agilityProps = await getAgilityPageProps({
    preview,
    params,
    locale,
    getModule,
  });
  return {
    props: agilityProps,
    revalidate: 10,
  };
}

export async function getStaticPaths() {
  const paths = await getAgilityPaths({ preview: false });
  return {
    paths,
    fallback: true,
  };
}
```

#### App Router (New)
```typescript
// app/[locale]/[...slug]/page.tsx
export const revalidate = 60;

export async function generateStaticParams() {
  // Fetch paths from Agility
  const paths = await getAgilityPaths({ preview: false });
  return paths.map(path => ({
    locale: 'en-us', // or from config
    slug: path.split('/').slice(1),
  }));
}

export default async function Page({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const agilityData = await getAgilityPage({ params });
  // Render page...
}
```

---

### 2. Preview Mode

#### Pages Router (Old)
```javascript
// pages/api/preview.js
export default async (req, res) => {
  res.setPreviewData({});
  res.writeHead(307, { Location: `${previewUrl}?preview=1` });
  res.end();
};
```

#### App Router (New)
```typescript
// app/api/preview/route.ts
import { draftMode } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  (await draftMode()).enable();
  return NextResponse.redirect(`${previewUrl}?preview=1`, 307);
}
```

---

### 3. App Wrapper

#### Pages Router (Old)
```javascript
// pages/_app.js
function MyApp({ Component, pageProps }) {
  return (
    <main className={font.variable}>
      <Component {...pageProps} />
    </main>
  );
}
```

#### App Router (New)
```typescript
// app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={font.variable}>
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
```

---

### 4. Router Usage

#### Pages Router (Old)
```javascript
import { useRouter } from 'next/router';

function Component() {
  const router = useRouter();
  router.push('/path');
  router.events.on('routeChangeStart', handler);
}
```

#### App Router (New)
```typescript
'use client';
import { useRouter } from 'next/navigation';

function Component() {
  const router = useRouter();
  router.push('/path');
  // No router.events - use different approach for navigation events
}
```

---

### 5. Metadata

#### Pages Router (Old)
```javascript
// Using Head component or custom HeadSEO component
<Head>
  <title>Page Title</title>
  <meta name="description" content="..." />
</Head>
```

#### App Router (New)
```typescript
// app/[locale]/[...slug]/page.tsx
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string[] }> }
): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  return {
    title: page.title,
    description: page.description,
  };
}
```

---

### 6. API Routes

#### Pages Router (Old)
```javascript
// pages/api/endpoint.js
export default async function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({ data: 'value' });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
```

#### App Router (New)
```typescript
// app/api/endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ data: 'value' });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return NextResponse.json({ success: true });
}
```

---

### 7. Server Components vs Client Components

#### Server Component (Default)
```typescript
// components/ServerComponent.tsx
// No 'use client' directive
export default async function ServerComponent() {
  const data = await fetchData(); // Can use async/await
  return <div>{data}</div>;
}
```

#### Client Component
```typescript
// components/ClientComponent.tsx
'use client';
import { useState } from 'react';

export default function ClientComponent() {
  const [state, setState] = useState(0);
  return <button onClick={() => setState(state + 1)}>{state}</button>;
}
```

---

### 8. Error Handling

#### Pages Router (Old)
```javascript
// pages/[...slug].js
export async function getStaticProps({ params }) {
  const page = await getPage(params);
  if (!page) {
    return { notFound: true };
  }
  return { props: { page } };
}
```

#### App Router (New)
```typescript
// app/[locale]/[...slug]/page.tsx
import { notFound } from 'next/navigation';

export default async function Page({ params }) {
  const page = await getPage(params);
  if (!page) {
    notFound(); // Throws error, don't return
  }
  return <div>{/* render page */}</div>;
}
```

---

### 9. Environment Variables

#### Both (Same)
```javascript
// Access via process.env
const apiKey = process.env.AGILITY_API_FETCH_KEY;
```

**Note:** Ensure variables are prefixed with `NEXT_PUBLIC_` for client-side access.

---

### 10. Middleware

#### Pages Router (Old)
```javascript
// middleware/middleware.js (custom file)
export default function middleware(req, res, next) {
  // Custom logic
  next();
}
```

#### App Router (New)
```typescript
// middleware.ts (at root)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Middleware logic
  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};
```

---

## Key Differences Summary

| Feature | Pages Router | App Router |
|---------|-------------|------------|
| **File Structure** | `pages/` | `app/` |
| **Data Fetching** | `getStaticProps` | Async Server Components |
| **Static Paths** | `getStaticPaths` | `generateStaticParams` |
| **Layout** | `_app.js` | `layout.tsx` |
| **Preview** | `res.setPreviewData()` | `draftMode()` |
| **API Routes** | `pages/api/` | `app/api/route.ts` |
| **Router** | `next/router` | `next/navigation` |
| **Metadata** | `<Head>` component | `generateMetadata()` |
| **Error Pages** | `404.js` | `not-found.tsx` |
| **Client Components** | Default | Must use `'use client'` |

---

## Migration Order

1. **Setup** - Dependencies, structure, config
2. **Root Layout** - Create `app/layout.tsx` (can coexist with `pages/_app.js`)
3. **Middleware** - Critical for routing (if needed)
4. **API Routes** - Preview and other APIs (can migrate incrementally)
5. **Main Page** - Dynamic route migration (start with one page)
6. **Components** - Update to work with App Router
7. **Testing** - Verify everything works
8. **Incremental Migration** - Migrate remaining pages one by one

> **Incremental Migration**: You can migrate pages one at a time. Routes in `app` will take precedence over `pages` for the same route.

---

## Common Pitfalls

1. **Forgetting 'use client'** - Any component using hooks or browser APIs needs this
2. **Mixing Server/Client** - Can't import Server Components into Client Components
3. **Router Events** - `router.events` doesn't exist in App Router (use `usePathname` + `useSearchParams` for navigation tracking)
4. **Async Components** - Server Components can be async, Client Components cannot
5. **Metadata** - Must use `generateMetadata`, not `<Head>`
6. **Preview Mode** - Different API, must use `draftMode()` (async function)
7. **Base Path** - Ensure `basePath` in `next.config.js` still works
8. **Hard Navigation** - Navigating between `pages` and `app` routes causes hard navigation (no prefetching)
9. **Root Layout Required** - `app` directory MUST have a root `layout.tsx` with `<html>` and `<body>` tags
10. **Styles in Layout** - Global styles in `app/layout.tsx` won't apply to `pages/*` routes

---

## Testing Checklist

- [ ] All pages render correctly
- [ ] Dynamic routes work
- [ ] Preview mode works
- [ ] API routes respond correctly
- [ ] Navigation works
- [ ] Metadata is correct
- [ ] Error pages work
- [ ] Build succeeds
- [ ] Static generation works
- [ ] ISR revalidation works
