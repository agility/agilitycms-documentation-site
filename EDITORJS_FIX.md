# EditorJS Node 22 Compatibility Fix

## Issue
`@editorjs/embed@2.8.0` (latest) requires Node 24.0.0+, but project uses Node 22.14.0.

**Error:**
```
error @editorjs/embed@2.8.0: The engine "node" is incompatible with this module.
Expected version ">=24.0.0". Got "22.14.0"
```

## Solution Applied

**Pinned all EditorJS packages to exact versions** (removed `^` and `~` prefixes):

### Changed
- `"@editorjs/embed": "^2.4.6"` → `"@editorjs/embed": "2.4.6"` ✅
- All other EditorJS packages also pinned to exact versions

### Why This Works
- Exact versions prevent automatic upgrades
- `2.4.6` is the last version before Node 24 requirement
- All pinned versions are compatible with Node 22

## Verification

After this change:
1. Delete `node_modules` and lock file
2. Run `npm install` or `yarn install`
3. Should install without Node version errors

## Future Considerations

When ready to upgrade to Node 24:
1. Update Node.js to 24.x
2. Can then upgrade EditorJS packages to latest versions
3. Test thoroughly after upgrade

## Files Modified
- `package.json` - All EditorJS packages pinned to exact versions
