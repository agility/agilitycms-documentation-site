# Next Steps - Data Fetching Implementation

## Current Status: Build Succeeds ✅

The migration is 90% complete. The site builds successfully and uses ISR (Incremental Static Regeneration).

## What Needs to Be Done

### 7 Modules Need Data Fetching Reimplemented

These modules previously used `getCustomInitialProps` (Pages Router pattern) which has been removed:

1. **ArticleListing.js** - Fetches article lists
2. **ListofLinks.js** - Fetches link lists
3. **SideBarNav.js** - Fetches navigation structure
4. **SDKsFrameworks.js** - Fetches SDK/framework links
5. **RightOrLeftAlignedLinks.js** - Fetches aligned links
6. **RighOrLeftAlignedImageLinks.js** - Fetches image links
7. **Changelog.tsx** - Fetches changelog from GraphQL

## Recommended Approach: Server Component Wrappers

For each module, create a Server Component that fetches data and renders the Client Component.

### Example: ArticleListing

**Step 1:** Rename current file
```bash
mv components/agility-pageModules/ArticleListing.js components/agility-pageModules/ArticleListing.client.js
```

**Step 2:** Add 'use client' to the renamed file
```javascript
// components/agility-pageModules/ArticleListing.client.js
'use client'

import { normalizeListedArticles } from "utils/linkUtils";
import Link from "next/link";

const ArticleListing = ({ module, customData }) => {
  const { articles } = customData;
  // ... rest of component
};

export default ArticleListing;
```

**Step 3:** Create Server Component wrapper
```typescript
// components/agility-pageModules/ArticleListing.tsx
import { getAgilitySDK } from '../../lib/cms/getAgilitySDK';
import { normalizeListedArticles } from '../../utils/linkUtils';
import ArticleListingClient from './ArticleListing.client';

interface Props {
  module: any;
  customData?: any;
}

export default async function ArticleListing({ module }: Props) {
  const agility = getAgilitySDK();
  const locale = process.env.AGILITY_LOCALES?.split(',')[0] || 'en-us';

  // Fetch data (original getCustomInitialProps logic)
  const children = await agility.getContentList({
    referenceName: module.fields.listedArticles.referencename,
    languageCode: locale,
    sort: "properties.itemOrder",
    contentLinkDepth: 3,
  });

  const articles = normalizeListedArticles({
    listedArticles: children.items,
  });

  // Pass data to Client Component
  return <ArticleListingClient module={module} customData={{ articles }} />;
}
```

**Step 4:** Update index to import the new Server Component
```javascript
// components/agility-pageModules/index.js
import ArticleListing from "./ArticleListing"; // Now imports the .tsx Server Component
```

### Example: SideBarNav (More Complex)

This one uses GraphQL and needs the sitemap node for current page highlighting.

**Server Component:**
```typescript
// components/agility-pageModules/SideBarNav.tsx
import { client } from '../../agility-graphql-client';
import { gql } from "@apollo/client";
import { getDynamicPageSitemapMapping } from '../../utils/sitemapUtils';
import SideBarNavClient from './SideBarNav.client';

interface Props {
  module: any;
  dynamicPageItem?: any;
  sitemapNode?: any;
}

export default async function SideBarNav({ module, dynamicPageItem, sitemapNode }: Props) {
  const navigation = [];
  const category = module.fields.category;

  // Original getCustomInitialProps logic here
  navigation.push({
    name: category.fields.title,
    href: !dynamicPageItem
      ? sitemapNode.path
      : getSectionBaseUrl(sitemapNode.path),
    current: !dynamicPageItem ? true : false,
  });

  const sectionsRefName = category.fields.sections.referencename;
  const articlesRefName = category.fields.articles.referencename;

  if (!sectionsRefName || !articlesRefName) {
    return <SideBarNavClient module={module} customData={{ navigation }} />;
  }

  const { data } = await client.query({
    query: gql`
      {
        ${articlesRefName} (sort: "properties.itemOrder") {
          contentID
          fields {
            title
            section_ValueField
          }
        },
        ${sectionsRefName} (sort: "properties.itemOrder") {
          contentID
          fields {
            title
            parentSection_ValueField
          }
        }
      }
    `,
  });

  // ... rest of data processing logic

  return <SideBarNavClient module={module} customData={{ navigation }} />;
}
```

## Quick Implementation Plan

### Phase 1: Simple Modules (1-2 hours)
1. ArticleListing
2. ListofLinks
3. SDKsFrameworks
4. RightOrLeftAlignedLinks
5. RighOrLeftAlignedImageLinks

### Phase 2: Complex Modules (2-3 hours)
6. SideBarNav (uses GraphQL + complex logic)
7. Changelog (uses GraphQL)

### Phase 3: Testing (1-2 hours)
- Test all pages render
- Test navigation works
- Test preview mode
- Re-enable static generation

### Phase 4: Cleanup (30 minutes)
- Remove TODO comments
- Delete old Pages Router files
- Update documentation

## Alternative: Quick Fix (Temporary)

If you need the site working immediately without data, you can provide default empty data:

```javascript
// In each module's .client.js file, add defaults:
const ArticleListing = ({ module, customData = { articles: [] } }) => {
  const { articles } = customData;

  // Show empty state if no articles
  if (articles.length === 0) {
    return <div>No articles available</div>;
  }

  // ... rest of component
};
```

This lets the site build and run, but modules won't show data until you implement proper fetching.

## Testing Commands

```bash
# Development
npm run dev

# Build
npm run build

# Check routes
npm run build 2>&1 | grep "Route (app)"

# Test specific page
# Visit http://localhost:3000/docs/your-page
```

## Success Criteria

- [ ] All 7 modules have Server Component wrappers
- [ ] Data fetches correctly in each module
- [ ] Navigation (SideBarNav) highlights current page correctly
- [ ] Changelog displays properly
- [ ] No console errors
- [ ] Build succeeds
- [ ] All pages render with data

## Files to Create

- `components/agility-pageModules/ArticleListing.client.js` (renamed)
- `components/agility-pageModules/ArticleListing.tsx` (new)
- `components/agility-pageModules/ListofLinks.client.js` (renamed)
- `components/agility-pageModules/ListofLinks.tsx` (new)
- `components/agility-pageModules/SideBarNav.client.js` (renamed)
- `components/agility-pageModules/SideBarNav.tsx` (new)
- ... and so on for remaining modules

## Support

If you get stuck, refer to:
- `MIGRATION_COMPLETE.md` - Full solution documentation
- `SERVER_CLIENT_COMPONENT_FIX.md` - Component patterns
- Official Next.js docs: https://nextjs.org/docs/app/building-your-application/data-fetching

The hardest part is done - the build works! Now it's just a matter of implementing the data fetching patterns.
