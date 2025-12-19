# Migration Summary: Pages Router → App Router

## Overview
This migration will convert the Agility CMS documentation site from Next.js Pages Router to App Router, following the patterns established in the `demosite2025` reference implementation.

## Documentation Files Created

1. **MIGRATION_PLAN.md** - Comprehensive step-by-step migration plan with 10 phases
2. **MIGRATION_QUICK_REFERENCE.md** - Quick reference guide for common pattern conversions
3. **MIGRATION_AGILITY_NOTES.md** - Agility CMS-specific migration notes and patterns
4. **MIGRATION_DATA_FETCHING.md** - Detailed guide for migrating data fetching patterns
5. **MIGRATION_SUMMARY.md** - This file (high-level overview)

## Key Changes Summary

### Architecture Changes
- **Directory Structure**: `pages/` → `app/`
- **Data Fetching**: `getStaticProps` → Async Server Components
- **Static Paths**: `getStaticPaths` → `generateStaticParams`
- **Layout**: `_app.js` → `layout.tsx`
- **Preview Mode**: `res.setPreviewData()` → `draftMode()`
- **API Routes**: `pages/api/` → `app/api/route.ts`
- **Language**: JavaScript → TypeScript

### Dependencies to Update
- Next.js: `14.2.35` → `15.x`
- `@agility/nextjs`: `14.0.3` → `15.0.7`
- React: `18` → `19.x` (if needed)
- Add TypeScript support

### Critical Migration Points

1. **Middleware** (`middleware/middleware.js` → `src/middleware.ts`)
   - Convert to TypeScript
   - Update to use `NextRequest`/`NextResponse`
   - Handle preview mode redirects
   - Implement locale routing (if needed)

2. **Root Layout** (`pages/_app.js` → `src/app/layout.tsx`)
   - Convert to TypeScript
   - Use `children` prop instead of `Component`
   - Add metadata export
   - **Move global data fetching here** (header, footer, menu links from `pages/[...slug].js`)

3. **Dynamic Route** (`pages/[...slug].js` → `src/app/[...slug]/page.tsx`)
   - **Note:** Single locale site - no `[locale]` segment needed
   - Convert `getStaticProps` to async Server Component
   - Convert `getStaticPaths` to `generateStaticParams`
   - Add `generateMetadata` function
   - Use `notFound()` for 404s
   - **Remove global data fetching** (now in layout.tsx)
   - Only fetch Agility page-specific data

4. **API Routes** (`pages/api/*` → `src/app/api/*/route.ts`)
   - Convert to Route Handlers
   - Use `NextRequest`/`NextResponse`
   - Update preview mode handling

5. **Components**
   - Mark Client Components with `'use client'`
   - Convert to TypeScript
   - Update router usage (`next/router` → `next/navigation`)
   - **Replace `getCustomInitialProps`** with direct Server Component data fetching
   - Components fetch their own data using `getAgilitySDK()` directly

## Migration Phases

### Phase 1-2: Setup & Infrastructure (1-2 days)
- Update dependencies
- Create App Router structure
- Migrate middleware
- Migrate root layout

### Phase 3: Page Migration (2-3 days)
- Migrate dynamic route
- Migrate error pages
- Migrate special pages (sitemap, robots)

### Phase 4: Component Migration (2-3 days)
- Update page templates
- Update page modules
- Update common components

### Phase 5: Data Fetching (1-2 days)
- Migrate GraphQL usage (or replace with SDK)
- Update content fetching utilities
- Add caching with Next.js tags

### Phase 6-7: Routing & Styling (1-2 days)
- Implement locale support (if needed)
- Update navigation
- Migrate styles

### Phase 8: Preview & Development (1 day)
- Update preview mode
- Test development workflow

### Phase 9: Testing (2-3 days)
- Functional testing
- Performance testing
- SEO validation

### Phase 10: Cleanup (1 day)
- Remove old files
- Update documentation

**Total Estimated Time**: 11-18 days

## Quick Start Guide

### 1. Read the Documentation
- Start with `MIGRATION_PLAN.md` for the full plan
- Reference `MIGRATION_QUICK_REFERENCE.md` for pattern conversions
- Check `MIGRATION_AGILITY_NOTES.md` for Agility-specific details
- **Read `MIGRATION_DATA_FETCHING.md`** for detailed data fetching migration patterns

### 2. Set Up Development Environment
```bash
# Create a feature branch
git checkout -b migrate-to-app-router

# Update dependencies (after reviewing package.json changes)
npm install next@latest @agility/nextjs@latest
```

### 3. Follow the Migration Plan
- Work through phases sequentially
- Test after each phase
- Don't delete old files until migration is complete and verified

### 4. Key Files to Reference from Demo Site
- `src/app/layout.tsx` - Root layout (adapt for single locale - no locale param)
- `src/app/[locale]/[...slug]/page.tsx` - Dynamic route (adapt to `[...slug]/page.tsx` for single locale)
- `src/middleware.ts` - Middleware (may not need locale routing)
- `src/lib/cms/getAgilityPage.ts` - Page fetching
- `src/lib/cms/getAgilitySDK.ts` - SDK setup
- `src/app/api/preview/route.ts` - Preview API

## Important Considerations

### Breaking Changes
- Router API is completely different
- Data fetching patterns are different
- Preview mode API is different
- Client Components must be explicitly marked

### Compatibility
- Base path (`/docs`) should still work
- GraphQL usage may need refactoring
- Third-party scripts (GTM, Intercom) should still work

### Performance Benefits
- Better performance with Server Components
- Improved caching with Next.js cache tags
- Smaller bundle sizes

## Testing Checklist

Before considering migration complete:

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
- [ ] Base path works correctly
- [ ] Search functionality works
- [ ] All Agility modules render correctly

## Getting Help

### Official Documentation
- **Next.js Migration Guide**: https://nextjs.org/docs/app/guides/migrating/app-router-migration
- Next.js App Router docs: https://nextjs.org/docs/app
- Agility CMS docs: https://agilitycms.com/docs
- `@agility/nextjs` package documentation

### Reference Implementation
- Demo site: `/Users/joelvarty/Documents/Agility/Starters/demosite2025`
- Follow patterns from demo site closely
- This migration plan aligns with Next.js official migration guide

## Next Steps

1. Review all migration documentation files
2. Set up development branch
3. Begin Phase 1: Preparation & Setup
4. Work through phases incrementally
5. Test thoroughly before deployment
6. Update production after verification

---

**Remember**: This is a significant migration. Take your time, test thoroughly, and don't hesitate to reference the demo site implementation when in doubt.
