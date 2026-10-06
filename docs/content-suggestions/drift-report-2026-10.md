# API and SDK drift report, October 2026 (W5-D)

Run 2026-10-05 with the `api-spec-drift` skill, against the **latest (staging) version** of every article. Read-only: nothing was edited, saved, published or deleted.

A clean result below means "no mechanical contradiction found", not "the article is correct". See [Blind spots](#blind-spots-of-this-run).

## Ground truth used

| Source | Version / fetched | Shape |
| --- | --- | --- |
| Management API spec, `https://mgmt.aglty.io/swagger/v1/swagger.json` | live, 2026-10-05 12:54 UTC | 102 paths, 111 operations, 90 schemas. Identical path count on all six regional hosts (`mgmt`, `-ca`, `-eu`, `-aus`, `-usa2`, `-dev`) |
| Fetch API spec, `https://api.aglty.io/swagger/v1/swagger.json` | live, same time | 15 paths, 24 schemas |
| Checked-in snapshot `lib/api-specs/snapshots/management.json` (builds `/docs/api-reference`) | commit 95c6802, 2026-09-21 | 106 paths, 115 operations |
| `@agility/management-sdk` (npm `latest`) | 0.1.40 (2026-09-09), still latest | 82 methods, 10 groups |
| `Agility.Management.SDK` (NuGet newest stable) | 2.0.0 | 116 methods, 16 groups |
| `Agility.Management.SDK` 1.x | 1.0.12-beta | 65 methods, 8 groups (second pass only) |
| `@agility/cli` (npm `latest`) | 1.1.0 | `--help` for every command, plus the shipped `dist/` source |
| Public changelog | `https://agilitycms.com/docs/changelog` and ChangeLog items in the CMS | |

Script totals: `check_drift.py` 4 HIGH, 23 MEDIUM, 2 INFO. `check_sdk_drift.py` against .NET 2.0.0: 10 HIGH, 11 MEDIUM. Control suite `test_checks.py`: 29/29 passed. Every HIGH was opened and read in context. Confirmed findings are below, and the false positives are listed at the end.

---

## HIGH

### H1. 1738 Batches and the Batch API: single-item publish routes documented as POST

- **Claim** (staging, "Cascade" table): `POST /{locale}/item/{contentID}/publish` and `POST /{locale}/page/{id}/publish`.
- **Ground truth:** both routes are **GET** in the live spec and in the 2026-09-21 snapshot (`/api/v1/instance/{guid}/{locale}/item/{contentID}/publish` `get`, parameters `comments` in the query; same for `page/{id}/publish`). Anyone calling the REST API directly from this table will send the wrong verb.
- **Fix:** change both rows to `GET`. The batch endpoints in the same article (`POST batch`, `batch/{id}/publish` and the rest) are correct.

### H2. Cascade publish endpoints: in the docs, the SDK and the API reference, but no longer in the live spec

Articles: **1738** (REST table and SDK section), **1408**, **1410**, **1405**, **1704**, **1283**, **1766**, **1773**, **1733**.

- **Claim:** four REST routes exist: `GET .../item/{contentID}/cascade-items`, `POST .../item/{contentID}/publish-cascade`, `GET .../page/{id}/cascade-items`, `POST .../page/{id}/publish-cascade`. 1738 documents all four; 1283, 1766 and 1773 tell readers to "use the `publish-cascade` routes".
- **What the live spec shows today:** none of the four paths, on any regional host. The live spec has 102 paths and 111 operations. The snapshot from 2026-09-21 has all four (106 paths, 115 operations), with summaries citing PROD-2489. The only surviving publish routes are `item/{contentID}/publish`, `page/{id}/publish` (GET), `item/batch-workflow`, `page/batch-workflow` and the `batch/*` routes.
- **What the .NET SDK 2.0.0 shows:** `ContentClient.GetCascadeItemsAsync(instanceGuid, locale, contentId)`, `ContentClient.PublishContentItemCascadeAsync(instanceGuid, locale, contentId, comments)`, `PagesClient.GetCascadeItemsAsync(instanceGuid, locale, pageId)`, `PagesClient.PublishPageCascadeAsync(instanceGuid, locale, pageId, comments)`, and the route strings `/cascade-items` and `/publish-cascade` in the assembly. A `CascadeItem` model ships too.
- **What the JS SDK 0.1.40 shows:** no cascade methods (1738 says this correctly).
- **Knock-on effects:**
  - This docs site publishes four generated pages from the snapshot, listed in `sitemap.xml`: `/docs/api-reference/management/get-instance-item-cascade-items`, `post-instance-item-publish-cascade`, `get-instance-page-cascade-items`, `post-instance-page-publish-cascade`.
  - The live changelog item 1719 ("Version 2.0 covers 113 of the Management API's 115 operations") counts against the 115-operation spec. The live spec now has 111.
- **Unresolved:** whether the routes still answer. An unauthenticated GET returns 401 for `cascade-items` but also for a made-up path, so auth runs before routing and the probe proves nothing. Settling it needs an authenticated read-only call (`GET cascade-items`), which this run did not make.
- **Fix:** ask engineering whether the removal is intentional (routes retired) or a spec regression (routes live but hidden, for example by an API-explorer exclusion). Until that's answered:
  - hold publishing of 1738, 1283, 1766 and 1773;
  - don't regenerate `lib/api-specs/snapshots/management.json` from the live spec, because that would delete the four API-reference pages without a redirect.

  If the routes are retired: remove them from 1738, 1283, 1766, 1773 and 1733, mark the four .NET 2.0 methods as unsupported in 1405, 1408, 1410 and 1704, and redirect the four API-reference URLs. If it is a regression: fix the spec, and the docs stand.

### H3. 1765 Data Portability and Exit: `--preview=false` does not pull published content

- **Claim** ("A full export, step by step", step 2): "Pull everything with the CLI, once with published data (`--preview=false`) and once with staging data".
- **Ground truth:** `@agility/cli` 1.1.0 has no `--preview` option. `dist/core/state.js` hard-codes `preview: true`, and `setState` never reads `argv.preview`. Tested in-process with the CLI's own argument parser and `setState`, `--preview false` leaves `state.preview === true`. Both pulls fetch staging, and the reader thinks they have a published export.
- **Fix:** remove `--preview=false`. Say that CLI 1.1.0 always pulls staging (preview) content. For a published copy, use the Content Sync API or the Fetch API with a Fetch (live) key. On the same page, also add `UrlRedirections` to the `--elements` list (see L4).

### H4. 1612 Instance & Users: an endpoint that doesn't exist, and a wrong "no SDK wrapper" note

- **Claim:** "Get one locale by code | `GET /api/v1/instance/{guid}/locales/code/{localeCode}`", under "There's no SDK wrapper for these yet".
- **Ground truth:** no `locales/code/...` path exists in the live spec, the snapshot or the .NET 2.0 assembly. The locale paths are: `locales` (GET, POST), `locales/all`, `locales/{localeId}`, `locales/{localeId}/enable` and `/disable` (PATCH), and `locales/sort-order` (POST). The other rows' verbs are correct.
  - SDK coverage: JavaScript has `instanceMethods.getLocales(guid)`. .NET 2.0 has `client.Locales` with 7 methods (`GetLocalesAsync`, `GetAllLocalesAsync`, `GetLocaleAsync(instanceGuid, localeId)`, `SaveLocaleAsync`, `EnableLocaleAsync`, `DisableLocaleAsync`, `SetSortOrderAsync`).
- **Fix:** delete the by-code row, and say to look a locale up by filtering `GET locales/all` on `localeCode` (the article's own `enableLocale` sample already does this). Replace "no SDK wrapper" with the JS and .NET methods above.

### H5. 1618 Content Items and its siblings: the .NET tabs are written for 1.x, unlabelled, on pages that tell readers to use 2.0

Articles (ManagementSDKArticles, JavaScript Management SDK section): **1618**, **1609**, **1611**, **1612**, **1613**, **1614**, **1615**.

- **Claim:** the C# tabs call the 1.x surface: `client.contentMethods.GetContentItem(123, guid, locale)`, `client.pageMethods.GetPage(...)`, `client.assetMethods.MoveFile(...)`, and so on. Signatures are typed as 1.x (`Task<int?> PublishContent(int? contentID, string guid, string locale, ...)`). The 1.x calls per article are: 1609: 4, 1611: 16, 1612: 4, 1613: 14, 1614: 14, 1615: 13, 1618: 15. None of these pages says the .NET tab is 1.x.
- **Ground truth:**
  - Getting Started (1608, same section) says ".NET: use version 2.0" and that in 2.0 "every instance-level method takes the instance GUID first, then the locale, then IDs".
  - NuGet's newest stable is 2.0.0. Its client exposes `client.Content`, `client.Pages`, `client.Assets` and the other groups, with `...Async` methods and guid-first arguments.
  - These names do not exist in 2.0.0 at all: `GetAssetByID`, `MoveFile`, `DeleteFile`, `GetGalleryById` (1613); `GetContainerById`, `GetNotificationList` (1614); `GetPageItemTemplates`, `PageRequestApproval` (1611). The rest exist only under new names with a different argument order. So every C# snippet on these pages fails to compile against the default package.
- **Stale "not in .NET" claims.** All of these are false against 2.0.0:
  - 1618 line 10 ("Bulk workflow operations, advanced list filtering, history, and comments exist only in the JavaScript SDK today"), lines 38 to 41 (`batchWorkflowContent` "JavaScript only"; "In .NET, bulk workflow operations are not available"), and the "Not available in the .NET SDK yet" notes at lines 167, 716, 739 and 762. Real methods: `BatchWorkflowContentItemsAsync`, `GetContentListAsync`, `GetContentItemHistoryAsync`, `GetContentItemCommentsAsync`.
  - 1614 lines 62 and 91 (paged container list "JavaScript only", "Not available in the .NET SDK"). Real method: `GetContainerListPagedAsync(instanceGuid, options)`.
  - 1614 line 304 (`forceReferenceName` "There is no .NET equivalent"). Real signature: `SaveContainerAsync(instanceGuid, container, forceReferenceName)`.
  - 1614 line 428 (`getContentList` "is JavaScript only"). Real method: `GetContentListAsync`.
  - 1613 line 289 (Delete folder "Not available in the .NET SDK yet"). Real method: `DeleteFolderAsync(instanceGuid, originKey, mediaId)`.
- **Fix:** rewrite the C# tabs to 2.0 using the 53-row rename table in 1704 (all 53 rows checked against both assemblies and correct). Or drop the C# tabs and link each section to its .NET page (1405 to 1411, 1705 to 1707), which already target 2.0 correctly. Delete the stale availability notes. If any 1.x example stays, label it "1.x (.NET 6 to 9)".

### H6. 1276 AgilityCLI: options and environment variables that 1.1.0 doesn't have

- **Claims** (staging):
  - The pull, push and sync option tables list `--preview` ("Use preview (staging) data rather than live"), `--rootPath` and `--baseUrl`.
  - The environment table maps `AGILITY_ROOT_PATH` to `--rootPath`.
  - `--elements` is "Models,Galleries,Assets,Containers,Content,Templates,Pages,Sitemaps".
  - "The CLI has three main commands: pull, push, and sync", with push described as uploading local files.
- **Ground truth** (`@agility/cli` 1.1.0 `--help` and source):
  - There is no `--preview`, `--rootPath` or `--baseUrl` option. `preview` is hard-coded `true`. `baseUrl` is not read from argv. The source says "the --rootPath CLI flag was removed".
  - Nothing in `dist/` references `AGILITY_ROOT_PATH`. The `.env` keys the CLI looks for are `AGILITY_GUID`, `AGILITY_TARGET_GUID`, `AGILITY_LOCALES`, `AGILITY_TOKEN`, `AGILITY_WEBSITE`, `AGILITY_ELEMENTS`, `AGILITY_MODELS`, `AGILITY_OVERWRITE`, `AGILITY_VERBOSE`, `AGILITY_HEADLESS` and `AGILITY_DEV`. Per 1800, only the first four take effect.
  - The `--elements` default is `Models,Galleries,Assets,Containers,Content,Templates,Pages,Sitemaps,UrlRedirections`.
  - The commands are `login`, `logout`, `pull`, `push` (`[aliases: sync]`), `reverse-sync` and `workflows`. Push is sync and reads both instances itself.
  - The page's own section 15 already says the reference (1800) supersedes it, but the tables above it still teach the old surface.
- **Fix:** remove `--preview`, `--rootPath` and `--baseUrl` from the three tables, and `AGILITY_ROOT_PATH` from the environment table. Mark the env keys that have no effect in 1.1.0, as 1800 does. Add `UrlRedirections` to `--elements`. Describe push as an alias of sync, and mention `reverse-sync` and `workflows`. Better still, cut the option tables and link to 1801 to 1805.

### H7. 1399 CLI CI/CD Integration Guide: the env table won't configure the CLI, and other 1.x-era options

- **Claims:**
  - The "Configure these environment variables in your CI/CD platform" table marks `AGILITY_GUID` and `AGILITY_TARGET_GUID` as required, and lists `AGILITY_LOCALES`, `AGILITY_ELEMENTS` and `AGILITY_ROOT_PATH`.
  - Troubleshooting: "Run a fresh sync with `--update=true` to rebuild mappings".
  - "Available elements: Models, Galleries, Assets, Containers, Content, Templates, Pages".
- **Ground truth:**
  - In 1.1.0 only `AGILITY_TOKEN` is read from the process environment (`process.env.AGILITY_TOKEN` is the only `process.env.AGILITY_*` in `dist/`). The others are read only from `.env`, `.env.local`, `.env.development` or `.env.production` files in the working directory. The article's own closing note (line 395) says the same, so the page contradicts itself.
  - `AGILITY_ROOT_PATH` is not read at all.
  - `--update` is not an option, and nothing reads `argv.update`.
  - The element list is missing `Sitemaps` and `UrlRedirections`.
- **Fix:** turn the table into "Secrets and variables your pipeline passes", with `AGILITY_TOKEN` as the only env var the CLI reads and the GUIDs passed as `--sourceGuid` and `--targetGuid` (as the sample workflows already do). Remove `AGILITY_ROOT_PATH`. Replace the `--update=true` step with what actually rebuilds mappings (check against 1802). Complete the element list.

---

## MEDIUM

### M1. 265 GraphQL API: the published page says pages and sitemaps aren't supported

- **Claim (published, live):** "Using GraphQL to fetch Pages, Page Template, or Page Modules is currently not supported, but we do intend on implementing this in the future."
- **Staging (2026-09-29) is already corrected.** It documents `ag_sitemapflat(channelName)`, `ag_sitemapnested(channelName)`, `ag_pages(pageID)` and `ag_urlredirections`, and notes that page components come back untyped.
- **Changelog evidence, corrected date:** the public changelog has "GrapphQL Updates: We have added support for Sitemaps, Pages and Components via GraphQL." It belongs to the **March 04, 2024** release "Design Update Q1 2024" (ChangeLog 962), not to 2023-10-23. The 2023-10-23 release (ChangeLog 941, "New UI Tweaks and Bug Fixes") has 12 items, none about GraphQL. The heading is misspelled "GrapphQL" in the CMS.
- **Fix:** publish the staged 265. The field lists in the staged table could not be checked, because there is no Fetch key in this environment and GraphQL has no OpenAPI spec. Introspect the schema with a Fetch key before publishing. Optionally fix the changelog typo.

### M2. 261 Content Sync API: "max 500 per request"

- **Claim (published):** "return all content from the CMS in a paginated manner (max 500 per request)".
- **Ground truth:** Fetch spec `/{guid}/{apitype}/{locale}/sync/items` and `/sync/pages`: `pageSize` is "The number of items to return per set", integer, **`default: 500`**, with no maximum declared. 1744 Content Sync Explained already says "`pageSize` defaults to 500".
- **Fix:** "returns up to 500 items per request by default (set `pageSize` to change it)". Don't state a maximum the spec doesn't declare. The stop condition ("until no results are returned or `syncToken=0`") is not described in the spec. Keep it consistent with 1744 rather than adding to it.

### M3. 1800 CLI Command Reference: `--rootPath` is not "no effect"

- **Claim:** "Not options in 1.1.0: `--rootPath`, `--preview`, `--baseUrl`, `--update` and `--reset`. … Because unknown options are ignored, passing them has no effect." 1276 section 15 says the same.
- **Ground truth:** true for `--preview`, `--baseUrl`, `--update` and `--reset`, but not for `--rootPath`. The parser isn't strict, so yargs keeps unknown flags in argv, and `state.js` still does `if (argv.rootPath !== undefined) state.rootPath = argv.rootPath`. An in-process test with the CLI's own parser gave `rootPath: "custom-dir"` for `--rootPath custom-dir`. In the same test `preview` stayed `true` and `baseUrl` stayed undefined.
- **Fix:** "`--rootPath` is no longer a documented option, but 1.1.0 still honours it. Don't rely on it." Keep the rest of the sentence. Everything else checked in 1800 to 1805 matches 1.1.0, including the aliases, `.env` handling and the `workflowOperation` note.

### M4. 1408 .NET Content: cascade scope overstated

- **Claim:** "A cascade publish publishes the item and everything it depends on."
- **Ground truth (snapshot spec summary for `item/{contentID}/publish-cascade`):** it publishes the item "together with its one-level nested content: the non-shared, non-dynamic-page-list containers its `Content` fields point at". 1738 describes this correctly.
- **Fix:** match 1738's wording. This depends on the outcome of H2.

### M5. 1280 (JavaScript "Management SDK - Content", live): page sizes the 2026-07-30 fix never reached

- **Claim:** `getContentList("products", …, {take: 1000, skip: 0})` and `{take: 5000, skip: 0}` "For initial imports or small lists: pull everything".
- **Ground truth:** Management `POST /api/v1/instance/{guid}/{locale}/list/{referenceName}` has `take` with default 50 and no declared maximum. AGENTS.md's repo guidance is to page, not to assume one full page. The 2026-07-30 correction was made in 1618, but 1280 is a separate, older copy and is still published.
- **Duplicates:** JavaScriptArticles 1277 to 1282 and 290 duplicate ManagementSDKArticles 1608 to 1618, and both sets are listed in `llms.txt`, so agents and search see two versions.
- **Fix:** page with `skip` in 1280. Then decide whether to retire the 127x/290 set and redirect it to the 16xx pages.

### M6. 257 Content Fetch API: a preview API key in an example

- **Claim:** a curl example sends `APIKey: defaultpreview.[redacted]` for instance `e13c7b01-u`.
- **Why it matters:** a preview key reads unpublished (staging) content. This isn't spec drift, but it is the one live credential found in the article bodies.
- **Fix:** replace it with a placeholder. Ask whether that key should be rotated (it may belong to a demo instance; not checked).

---

## LOW

- **L1. 1618 `returnBatchId` "JavaScript only".** Accurate as a parameter name (the script's HIGH here is a false positive). .NET 2.0's equivalent is `waitForBatch: false` on `SaveContentItemAsync`, `PublishContentItemAsync`, `BatchWorkflowContentItemsAsync` and the others. Say so, so .NET readers know the option exists.
- **L2. 257 and 1773: "ContentLinkDepth defaults to 1, maximum 5".** The Fetch spec is per endpoint: `item/{id}` defaults to 1, `page/{id}` and `page/{channel}` default to 2, and `list/{referenceName}` says "Maximum allowed is 5" (no maximum is declared on item or page). Fix: "1 for items, 2 for pages; lists allow at most 5".
- **L3. 1617 Webhooks: "History is retained for 90 days."** Not in the spec. The spec says the range defaults to 7 days and spans at most 366, `take` defaults to 20 with a maximum of 100, and history "began with [the current storage] layout". The other numbers on the page match. Fix: source the 90 days or drop it.
- **L4. Incomplete `--elements` lists.** 1765 (lines 17 and 35) omits `UrlRedirections`, which 1.1.0 pulls by default. So 1765's "Export URL redirections from the URL Redirections page" step is optional, not the only way.
- **L5. Rate limit "10 uncached requests per second, then 429"** (257, 1742, 1786). Consistent across articles, but declared in neither spec, so it can't be verified mechanically. 1786 already says correctly that `Retry-After` is undocumented.

---

## Checked and correct

- **1738 batch lifecycle:** all `batch/*` routes and verbs; `expandItems` (default `true`) on `GET batch/{id}`; `processNow` (default `true`) on `POST batch`; `batch-workflow` takes `contentIDs`/`pageIDs` and `operation` in the query, with "Maximum 250 IDs allowed (Batch.MaxItemsPerBatch)"; `batchState` 3 is `Processed` (JS `BatchState` enum); the JS SDK has no `createBatch` or cascade methods; the .NET 2.0 batch methods and `waitForBatch` behaviour. The only problems on the page are H1 and H2.
- **1746 Copy and Translate:** all six `initialize/*` and `translate/*` routes are POST with no `{locale}` segment, take the body fields shown (`contentVersionIds`, `contentViewIds`, `pageVersionIds`, `languageCodeTarget(s)`, `languageCodeSource`), and return a single integer. "No JS SDK methods yet" is true for 0.1.40.
- **1744 Content Sync Explained:** endpoints and the `pageSize` default.
- **.NET 2.0 articles (1405 to 1411, 1704 to 1707):** all 176 `client.X.YAsync(...)` calls across the docs name real 2.0.0 methods with guid-first, locale-second arguments. The 1704 rename table (53 rows) matches both assemblies. Running the checker against 1.0.12-beta flagged these pages as expected, which confirms they target 2.x.
- **1608 Getting Started:** the install command (`dotnet add package Agility.Management.SDK`), the 2.0 notes and the JS-to-.NET equivalence table (including `GetFetchApiStatusAsync(instanceGuid, mode)`).
- **1617 Webhooks:** every JS method exists (`webhookList`, `saveWebhook`, `getWebhook`, `deleteWebhook`, `getWebhookHistory`, `rotateWebhookSecret`), and `take` maxes out at 100.
- **1800 to 1805 CLI reference:** every option, alias, env key and exit-code statement matches 1.1.0, apart from M3.
- **1742 and 1787:** the GraphQL URL `POST https://api.aglty.io/v1/{guid}/{fetch|preview}/{locale}/graphql` matches this repo's own client (`lib/cms/gql.ts`).
- **1403, 1611 JS side, 1615 JS side, 1786, 1806, 1807:** no API or SDK contradictions found. 1807's `AGILITY_*` variables are the app's, not the CLI's.

## False positives triaged (not reported as bugs)

- `required-mismatch` on 1409 `Settings`: the sentence says the "required" flag goes in `Settings`, not that `Settings` is required. 1409's example uses `["Required"] = "False"`, consistent with a live model (ChangeLog) exposing `required` per field.
- `unknown-endpoint` `/v1/{guid}/{fetch…` on 1742 and 1787: the GraphQL endpoint, which has no OpenAPI spec.
- `unknown-parameter` hits on search-index field names (`objectID`, `taskID`, `indexName`, `parentId`, `documentId`, `kNearestNeighborsCount`, `agilityId`, `dynamicItemContentID` in 593, 1698, 1699, 1701), `webAppName` (1381, Azure), `getPageTemplateName` (1611, a real JS method), `getContainerByID` (1614, a real JS method) and `returnBatchId` (an SDK option). Webhook payload fields `contentVersionID` and `pageVersionID` (1737) and `categoryID` (1743) are response fields outside both specs. They could not be refuted, and the payload reference is sourced from live deliveries.
- `page-size` `pageSize: 500` on 261, 283 and 1698: that is the sync default (see M2 for the wording problem in 261).
- SDK `unknown-method` hits on Next.js and local helpers (`draftMode`, `revalidateTag`, `connection`, `unstable_noStore`, `after`, `getSiteUrl`, `runSync`, `clearSync`) and on GraphQL fields (`ag_pages`, `ag_sitemapflat`, `ag_sitemapnested` in 265).

## Blind spots of this run

- **How the articles were read.** There is no `AGILITY_API_PREVIEW_KEY` in this environment, so the scripts' preview Fetch reader could not run. Instead, every article in `ManagementSDKArticles` (10), `JavaScriptArticles` (10), `dotNetArticles` (22) and `DeveloperArticles` (132), plus 1745, 1765 and 1806, was read through the Agility MCP (`get_content_item`, Management API, latest version including staging, uncached) and fed to both checkers by a scratchpad wrapper. That is more authoritative than the preview endpoint, but the wrapper isn't part of the skill.
- **ClassicContent isn't checked.** The checkers read `markdownContent` and the EditorJS `content`, but not the `ClassicContent` HTML field (257, 130, 204, 213 and others carry one).
- **GraphQL can't be checked.** It has no spec and no key was available.
- **The cascade route probe was inconclusive** (H2).
- **The `--dotnet-version` pass overwrites the shared cache.** Running with `--dotnet-version 1.0.12-beta` replaced the 2.0.0 DLL in `.spec-cache/dotnet-sdk/`. It was restored by re-running the default fetch, but the skill doesn't warn about this.
- **The refresh plan was not updated.** The skill's step 6 says to copy confirmed drift into `docs/content-refresh-plan-2026.md`. That was not done, because this run was scoped to this report only.
