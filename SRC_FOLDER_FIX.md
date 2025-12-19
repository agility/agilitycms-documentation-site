# /src Folder Issue - FIXED ✅

## Problem Discovered

The migration initially created a `/src` folder for App Router files, but this caused **module duplication**:

- `/components` (original)
- `/src/components` (new, duplicates)
- `/lib` (original)
- `/src/lib` (new)

This likely contributed to webpack module resolution issues during build.

## Solution

**Removed `/src` folder entirely** and moved all App Router files to root:

```
Before:
src/app/          → app/
src/middleware.ts → middleware.ts
src/lib/          → lib/ (merged)

After:
app/
middleware.ts
lib/
components/ (original, no duplicates)
```

## Files Moved

- `src/app/` → `app/`
- `src/middleware.ts` → `middleware.ts`
- `src/lib/cms/` → `lib/cms/` (merged)
- `src/lib/cms-content/` → `lib/cms-content/` (new)
- Deleted `src/` folder

## Imports Updated

All imports updated from `/src/` or `@/` to relative paths:

**app/layout.tsx:**
```typescript
// BEFORE:
import Header from '../../components/common/Header'
import { getHeaderContent } from '../lib/cms-content/getHeaderContent'

// AFTER:
import Header from '../components/common/Header'
import { getHeaderContent } from '../lib/cms-content/getHeaderContent'
```

**app/[...slug]/page.tsx:**
```typescript
// BEFORE:
import { getAgilityPage } from "@/lib/cms/getAgilityPage"
import { getPageTemplate } from "components/agility-pageTemplates"

// AFTER:
import { getAgilityPage } from "../../lib/cms/getAgilityPage"
import { getPageTemplate } from "../../components/agility-pageTemplates"
```

**API routes** (updated paths to utils and next.config):
- `app/api/preview/route.ts`
- `app/api/link/search/route.ts`
- `app/api/image/*/route.ts`

**lib/cms-content/getHeaderContent.ts:**
```typescript
// BEFORE:
import { client } from '../../../agility-graphql-client';

// AFTER:
import { client } from '../../agility-graphql-client';
```

## Result

✅ No more duplicate module directories
✅ Clean import paths
✅ All files in proper locations
❌ Module 94935 error persists (unrelated to src folder)

## Conclusion

The `/src` folder was causing unnecessary complexity. Next.js supports `/src` but it's optional. For this project, keeping everything at root level is simpler and matches the original structure.

The build error is now confirmed to be in a **specific module or package**, not a structural issue.
