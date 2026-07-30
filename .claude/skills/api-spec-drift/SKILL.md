---
name: api-spec-drift
description: Check the documentation's API and SDK claims against ground truth — the live OpenAPI specs for the Agility Management API and Fetch API, plus the published @agility/management-sdk (npm) and Agility.Management.SDK (NuGet) packages. Catches endpoints that don't exist, fields documented as required that aren't, parameter names absent from the spec, wrong "not available in the JavaScript/.NET SDK" claims, sections attributed to the wrong SDK, and broken install commands. Use on a cadence (monthly / before an API or SDK release), after authoring any API documentation, or whenever asked whether the API docs are accurate. Read-only: it reports; it does not edit, publish, or delete.
---

# Check API docs against the OpenAPI specs

Every API claim in these docs was written by hand, so nothing tied the prose to the
actual contract. A spot check on 2026-07-30 found **four wrong claims in minutes**:

- `expiryDate` documented as **required** for Personal Access Tokens — the spec requires only `name`.
- a single-item save documented as returning `number[]` — `POST /item` returns one `integer` (batches use `/item/multi`).
- parameters named `includeShared` / `includeDeleted` — neither exists; the real ones are `includeDefaults` / `includeModules`.
- examples paging with `take: 1000` and `take: 5000`, where the default is 50.

This skill makes that check repeatable so those errors don't accumulate again.

**A REST diff was only half the job.** On 2026-07-30 the same articles were checked a
second time against the *SDK packages* rather than the specs, and that found a worse
class of error the specs structurally cannot see:

- `dotnet add package management.api.sdk` — the **assembly** name, not the NuGet
  package id. The command 404s, so the .NET quickstart failed at step one. (The
  package is `Agility.Management.SDK`, and it only ships prereleases.)
- Four methods documented as "not available in the JavaScript SDK yet" that the
  JavaScript SDK exports.
- A whole "Get containers (paged)" section presented as .NET, complete with a
  `Task<...>` signature — the method exists **only** in JavaScript.
- `pageIDInOtherLocale` / `otherLocale` labelled ".NET only" — both are parameters
  in the JavaScript signature too.
- Model field definitions built on properties `ModelField` doesn't have
  (`referenceName`, `required`, top-level `defaultValue`) with non-string `settings`
  values, plus a field-type table of invented lowercase type names. The API accepts
  unknown properties silently, so those examples "worked" and produced wrong models.

Lesson worth keeping: **the errors clustered where nothing could contradict the
prose.** Wherever ground truth existed, the docs were broadly right. So the fix is
never a closer read — it's another source of truth.

## The specs (authoritative)

| API | Spec | Interactive |
|---|---|---|
| Management | `https://mgmt.aglty.io/swagger/v1/swagger.json` | `https://mgmt.aglty.io/swagger` |
| Fetch (content delivery) | `https://api.aglty.io/swagger/v1/swagger.json` | `https://api.aglty.io/swagger` |

Regional Management hosts follow the instance GUID suffix (`-u` → `mgmt.aglty.io`,
`-c` → `mgmt-ca.aglty.io`, `-e` → `mgmt-eu.aglty.io`, `-a` → `mgmt-aus.aglty.io`,
`-us2` → `mgmt-usa2.aglty.io`, `-d` → `mgmt-dev.aglty.io`); the schema is the same.

## The SDKs (authoritative for SDK claims)

| SDK | Package | Ground truth read from |
|---|---|---|
| JavaScript | `@agility/management-sdk` (npm, `latest`) | the shipped `dist/apiMethods/*.d.ts` |
| .NET | `Agility.Management.SDK` (NuGet, newest incl. prerelease) | assembly metadata |

The .NET **assembly** is `management.api.sdk.dll` — a different string from the
package id, and the source of the broken install command. The `using` statement is
`management.api.sdk`; the `dotnet add package` argument is `Agility.Management.SDK`.

## Run it

Two scripts. Run both — they cover different ground and neither subsumes the other.

```bash
python3 .claude/skills/api-spec-drift/check_drift.py       # docs vs REST specs
python3 .claude/skills/api-spec-drift/check_sdk_drift.py   # docs vs SDK packages
```

Both read `AGILITY_GUID` / `AGILITY_API_PREVIEW_KEY` from `.env.local`, cache
downloads to `.spec-cache/`, read articles through the **preview** API so
unpublished edits count, and exit non-zero on a HIGH finding.

`check_drift.py` options: `--offline`, `--containers A,B` (default:
`ManagementSDKArticles,JavaScriptArticles,dotNetArticles,DeveloperArticles`),
`--json report.json`.

`check_sdk_drift.py` options: `--offline`, `--containers`, `--json`, and
`--matrix` — which prints a verified JavaScript ⇄ .NET method matrix generated from
the packages. Use `--matrix` when writing or reviewing any cross-SDK availability
table; it is the only trustworthy source for those columns.

### After changing either checker, run the control suite

```bash
python3 .claude/skills/api-spec-drift/test_checks.py
```

19 cases pinning **both** directions: known-bad wording must flag, known-good
wording must stay quiet. It exists because tuning for precision is how a checker
goes silent — one pass here reported 28 findings that were almost all scoping
artifacts, and every loosening risked the opposite failure. The flag-cases use the
verbatim article wording from before the 2026-07-30 corrections, so if the SDK
checker ever stops catching them it has gone blind. No network or CMS access; needs
the caches warm and `dnfile` for the SDK half.

> **`check_sdk_drift.py` needs `dnfile`** (`pip install dnfile`) for the .NET half —
> a `strings` scan is not a substitute, because the ECMA-335 string heap stores one
> name as a suffix of another (`PublishContent` inside `UnPublishContent`), so
> absence looks proven when it isn't. Without `dnfile` the script still checks
> everything JavaScript-side and says the .NET half was skipped. A run that says
> that is **not** a clean run.

## How to read the output

Findings are graded, and the grades mean different things:

- **HIGH** — a mechanical contradiction of the spec (an endpoint that doesn't exist,
  a "required" claim the schema disagrees with, a page size past a declared maximum).
  Still open the article and read the sentence before reporting it: the match tells
  you a token appeared near a phrase, not that the sentence means what you assume.
- **MEDIUM** — a heuristic. Expect false positives and triage them.
- **INFO** — coverage, not correctness. Unmentioned endpoints may be deliberate.

### Known false positives (don't report these as bugs)

- **SDK-only identifiers.** `retryCount`, `duration`, `baseUrl` are SDK `Options`
  fields, not REST parameters — correctly absent from the spec. Verified against
  `Options` in the JavaScript typings.
- **Non-Agility parameters.** Deployment guides mention things like `webAppName`
  (Azure); nothing to do with our API.
- **Legitimate SDK/REST naming differences.** An SDK argument may be named
  differently from the REST parameter it maps to. That's only a bug if the docs
  present the name *as* the API's parameter.
- **`getPageTemplateName`.** Reads like a typo and gets flagged as an unknown
  parameter, but the JavaScript SDK really does export it — it fetches a template
  *by* name and returns a whole `PageModel`. Confirmed in `pageMethods.d.ts`. Odd
  name, correct docs; the .NET equivalent is `GetPageTemplateByName`.

### Resolved by the 2026-07-30 triage (kept as worked examples)

Two MEDIUMs looked like model-field settings the spec simply doesn't enumerate.
They were not false positives — chasing them is what uncovered the fabricated field
surface in the Models article:

- **`includeTime`** — the real setting is `ShowTime`.
- **`contentDefinitionReferenceName`** — not a setting at all; linked-content fields
  use `ContentModel` plus `SaveTextToField` / `SaveValueToField`.

The tell was that `ModelField.settings` is typed `{[key: string]: string}` in both
the spec and the SDK, yet the examples passed numbers, booleans, and arrays. When a
MEDIUM sits next to a type that *can't* hold what the docs show, check the shape
before dismissing it.

### Known blind spots (the script will NOT catch these)

Be explicit about these when reporting, so nobody reads a clean run as proof:

- **Unbackticked identifiers.** The parameter check only looks at names in
  backticks with a parameter-ish shape. A wrong name inside a code comment
  (`// includeShared`) or a plain table cell slips through.
- **Return-type prose.** "returns an array" vs the spec's `integer` is not
  detected — the wording is too free-form. Check response types by hand for any
  article that documents return values (see the recipe below).
- **Semantic drift.** A parameter that exists but is *described* wrongly (wrong
  meaning, wrong default) looks fine to the script.
- **No declared maximum ≠ safe.** Most list parameters declare a default but no
  maximum, so a huge `take` can only be flagged as suspicious, not proven wrong.
  Don't claim a value "exceeds the documented maximum" unless the spec has one.
- **Wrong `settings` keys inside a string dictionary.** The spec types model-field
  and container settings as free-form, so it can never say a key is invented. The
  only way to check is to read a real model or container back from a live instance
  (`get_content_model_details` / `get_containers`) and compare. Do this whenever an
  article documents a settings table.
- **"Only documented for X" notes.** `check_sdk_drift.py` deliberately ignores
  these, because they describe *our docs*, not the SDK, so no surface can refute
  them. They're still worth a human read — an undocumented-but-present method is a
  coverage gap — but that's judgement, not a diff.
- **.NET argument order and full signatures.** The assembly gives reliable method
  *names*; the articles' `Task<...>` signature lines are not machine-checked beyond
  the method name. Verify those by hand or against the .NET repo.

## Procedure

1. **Run both scripts.** Note the spec path/schema counts and the SDK method counts
   — if they change a lot between runs, the API or an SDK moved and a broader review
   is due. Also note the .NET package version: it has only ever shipped prereleases,
   so a jump there is worth a full pass over the cross-SDK tables.
2. **Verify every HIGH** by opening the article (`get_content_item`) and reading the
   claim in context. Confirm against the spec before writing it up.
3. **Triage MEDIUMs** against the false-positive list above.
4. **Spot-check return types by hand** for articles that document them:

   ```bash
   python3 - <<'PY'
   import json, urllib.request
   spec = json.load(urllib.request.urlopen("https://mgmt.aglty.io/swagger/v1/swagger.json"))
   op = spec["paths"]["/api/v1/instance/{guid}/{locale}/item"]["post"]
   print({c: list(r.get("content", {}).keys()) for c, r in op["responses"].items()})
   print(op["responses"]["200"]["content"]["application/json"]["schema"])
   PY
   ```

5. **Report** confirmed findings grouped by article, each with the spec evidence
   (path + parameter/schema + what the spec actually says). Rank by blast radius:
   a wrong "required" field or a bad endpoint breaks someone's integration;
   a coverage gap doesn't.
6. **Feed the plan.** Put confirmed drift in
   [docs/content-refresh-plan-2026.md](../../../docs/content-refresh-plan-2026.md).
   API-side problems (not doc problems) belong in the SDK-discrepancy list in §5
   Phase 3 — e.g. the `Webhook` schema leaking Azure Table Storage fields
   (`partitionKey`, `rowKey`, `eTag`, `timestamp`) into the public contract.

## Guardrails

- **Read-only.** Never edit, publish, or unpublish. Remediation goes through the
  [authoring skill](../authoring-agility-docs/SKILL.md) as a separate, deliberate step.
- **The spec is authoritative for the REST API — not for SDK surfaces.** The SDKs
  wrap it and legitimately differ (method names, argument order, wrapper types).
  Don't "correct" an SDK signature to match a REST parameter.
- **Don't assert unspecified behaviour.** If the spec marks a field optional but
  says nothing about the default, say exactly that. Recommend the safe practice;
  don't invent the fallback.
- **Never verify by mutating the instance.** Do not create tokens, save content, or
  publish just to test a claim. If a claim can only be settled by a live call, say
  so and let a human decide.
- A clean run means "no mechanical contradiction found", not "the docs are correct".
  Say it that way.
