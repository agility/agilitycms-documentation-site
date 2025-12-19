# Next Steps for Migration

## Immediate Actions Required

### 1. Resolve Route Conflicts ⚠️

Next.js detected conflicts between `pages/` and `app/` directories. You have two options:

#### Option A: Temporarily Rename Old Files (Safer)
Rename conflicting files to `.backup` extension:
```bash
mv pages/[...slug].js pages/[...slug].js.backup
mv pages/index.js pages/index.js.backup
mv pages/api/preview.js pages/api/preview.js.backup
mv pages/api/exitPreview.js pages/api/exitPreview.js.backup
mv pages/api/feedback pages/api/feedback.backup
mv pages/api/image pages/api/image.backup
mv pages/api/link/search.js pages/api/link/search.js.backup
mv pages/sitemap.xml.ts pages/sitemap.xml.ts.backup
mv pages/api/robots.ts pages/api/robots.ts.backup
```

#### Option B: Delete After Testing (Recommended)
After confirming App Router routes work:
```bash
rm pages/[...slug].js
rm pages/index.js
rm -rf pages/api/preview.js pages/api/exitPreview.js
rm -rf pages/api/feedback
rm -rf pages/api/image
rm pages/api/link/search.js
rm pages/sitemap.xml.ts
rm pages/api/robots.ts
```

### 2. Test Build
```bash
npm run build
```

### 3. Test Development Server
```bash
npm run dev
```

Visit:
- `http://localhost:3000/docs` (or your base path)
- Test a few pages
- Test preview mode

## Component Migration Priority

### High Priority (Blocks Functionality)
1. **Layout Component** (`components/common/Layout.js`)
   - Update router usage (`next/router` → `next/navigation`)
   - Remove `handlePreview` usage
   - Update router events (may need different approach)

2. **Page Templates** (`components/agility-pageTemplates/*`)
   - Ensure they work with App Router
   - Update to use `ContentZone` properly

### Medium Priority (Component Data Fetching)
3. **Page Modules with `getCustomInitialProps`**:
   - `ArticleListing.js` - Convert to Server Component
   - `SideBarNav.js` - Complex, needs careful migration
   - `SDKsFrameworks.js`
   - `Changelog.tsx`
   - `RightOrLeftAlignedImageLinks.js`
   - `ListofLinks.js`
   - `RightOrLeftAlignedLinks.js`

### Low Priority (Can Wait)
4. Other components that don't use router or need client features

## Testing Checklist

After resolving conflicts:

- [ ] Build succeeds (`npm run build`)
- [ ] Dev server starts (`npm run dev`)
- [ ] Root page loads (`/docs` or `/`)
- [ ] Dynamic pages load (`/docs/some-page`)
- [ ] Preview mode works
- [ ] API routes respond correctly
- [ ] Navigation works
- [ ] Header/Footer render
- [ ] Components render correctly

## Files to Review/Update

### Import Paths
Check these files for correct import paths:
- `src/app/[...slug]/page.tsx`
- `src/lib/cms/getAgilityPage.ts`
- All utility files in `src/lib/`

### Components Needing Updates
- `components/common/Layout.js` - Router usage
- `components/common/Header.js` - May need updates
- All components in `components/agility-pageModules/` - Remove `getCustomInitialProps`

## Migration Status Summary

✅ **Completed:**
- Dependencies updated
- Core infrastructure (middleware, layout, utilities)
- Page structure (root, dynamic route, error pages)
- Most API routes

🟡 **In Progress:**
- Import path fixes
- Build testing

⏸️ **Pending:**
- Component migration
- Full testing
- Search API routes (Algolia)
