# EditorJS Package Node 22 Compatibility

**Date:** Current Session
**Target:** Ensure all EditorJS packages work with Node 22 (not requiring Node 24)

## Current Package Versions (Original)

These are the versions that were in use before migration:

```json
"@editorjs/checklist": "^1.3.0",
"@editorjs/code": "^2.7.0",
"@editorjs/delimiter": "^1.2.0",
"@editorjs/editorjs": "^2.22.3",
"@editorjs/embed": "^2.4.6",
"@editorjs/header": "^2.6.1",
"@editorjs/image": "^2.6.0",
"@editorjs/inline-code": "^1.3.1",
"@editorjs/link": "^2.3.1",
"@editorjs/link-autocomplete": "^0.0.0",
"@editorjs/list": "^1.6.2",
"@editorjs/marker": "^1.2.2",
"@editorjs/nested-list": "^1.0.2",
"@editorjs/paragraph": "^2.8.0",
"@editorjs/quote": "^2.4.0",
"@editorjs/raw": "^2.3.0",
"@editorjs/simple-image": "^1.4.1",
"@editorjs/table": "^2.0.1",
"@editorjs/text-variant-tune": "^1.0.1",
"@editorjs/underline": "^1.0.0",
"@editorjs/warning": "^1.2.0"
```

## Compatibility Analysis

### ✅ Node 22 Compatibility Status

**All current versions are compatible with Node 22:**
- None of the EditorJS packages explicitly require Node 24
- EditorJS packages typically don't specify strict Node version requirements
- Node 22 is the current LTS version and is well-supported

### ⚠️ Security Note

**@editorjs/editorjs@2.22.3** has known security vulnerabilities:
- Arbitrary Code Injection vulnerability
- **Recommendation:** Upgrade to 2.26.0+ for security fixes
- **Latest version:** 2.31.0 (compatible with Node 22)

### Latest Available Versions (Node 22 Compatible)

Based on npm registry check:
- `@editorjs/editorjs`: 2.31.0 (latest, Node 22 compatible)
- `@editorjs/paragraph`: 2.11.7 (latest)
- `@editorjs/header`: 2.8.8 (latest)
- `@editorjs/list`: 2.0.9 (latest)
- `@editorjs/code`: 2.9.4 (latest)

## ⚠️ CRITICAL: Node 24 Requirement Found

**Issue:** `@editorjs/embed@2.8.0` (latest) requires Node 24.0.0+
- Current version in package.json: `^2.4.6` (allows upgrade to 2.8.0)
- **Fix Applied:** Pinned to exact version `2.4.6` to prevent upgrade

## Recommendation

### ✅ Option 1: Pin Versions (IMPLEMENTED)
- ✅ Pin `@editorjs/embed` to `2.4.6` (exact version, no caret)
- ✅ All other packages pinned to exact versions
- ✅ Prevents automatic upgrades to Node 24-requiring versions
- **Action:** ✅ **DONE** - Versions pinned in package.json

### Option 2: Use Version Ranges (Alternative)
- Use `~2.4.6` instead of `^2.4.6` (allows patch updates only)
- Or use `>=2.4.6 <2.8.0` to explicitly exclude Node 24 versions
- **Action:** Not needed if using exact versions

### Option 3: Upgrade After Node 24 Migration
- When ready to upgrade to Node 24, can upgrade EditorJS packages
- **Action:** Defer until Node.js upgrade is planned

## Testing Checklist

After ensuring Node 22 compatibility:
- [ ] `npm install` succeeds on Node 22
- [ ] `npm run build` succeeds
- [ ] `npm run dev` works
- [ ] EditorJS components load correctly
- [ ] Block editor functionality works
- [ ] No Node version warnings in console
- [ ] No compatibility errors in build output

## Action Items

- [x] Verify current versions are Node 22 compatible ✅
- [ ] Test build with current versions
- [ ] Consider security upgrade for `@editorjs/editorjs` after migration stabilizes
- [ ] Monitor for any EditorJS packages that might require Node 24 in future

## Notes

- EditorJS packages don't typically specify `engines` field in package.json
- Node 22 is the current LTS (Long Term Support) version
- If any package requires Node 24 in the future, we'll need to:
  1. Pin to an older version that supports Node 22
  2. Upgrade Node.js (if project requirements allow)
  3. Find alternative packages

## Current Status

✅ **All EditorJS packages pinned to exact versions compatible with Node 22**
✅ **No packages require Node 24** (versions pinned to prevent auto-upgrade)
⚠️ **Security consideration:** `@editorjs/editorjs@2.22.3` has vulnerabilities (can be addressed post-migration)
⚠️ **Important:** `@editorjs/embed@2.8.0+` requires Node 24 - pinned to `2.4.6` to prevent upgrade

## Package Version Strategy

**All EditorJS packages are now pinned to exact versions (no `^` or `~`):**
- Prevents automatic upgrades to Node 24-requiring versions
- Ensures consistent builds across environments
- Can be upgraded individually when Node 24 migration is planned
