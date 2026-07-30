---
name: api-spec-drift
description: Check the documentation's API claims against the live OpenAPI specs for the Agility Management API and Fetch API — endpoints that don't exist, fields documented as required that aren't, parameter names absent from the spec, oversized page-size examples, and coverage gaps. Use on a cadence (monthly / before an API or SDK release), after authoring any API documentation, or whenever asked whether the API docs are accurate. Read-only: it reports; it does not edit, publish, or delete.
---

# Check API docs against the OpenAPI specs

Every API claim in these docs was written by hand, so nothing tied the prose to the
actual contract. A spot check on 2026-07-30 found **four wrong claims in minutes**:

- `expiryDate` documented as **required** for Personal Access Tokens — the spec requires only `name`.
- a single-item save documented as returning `number[]` — `POST /item` returns one `integer` (batches use `/item/multi`).
- parameters named `includeShared` / `includeDeleted` — neither exists; the real ones are `includeDefaults` / `includeModules`.
- examples paging with `take: 1000` and `take: 5000`, where the default is 50.

This skill makes that check repeatable so those errors don't accumulate again.

## The specs (authoritative)

| API | Spec | Interactive |
|---|---|---|
| Management | `https://mgmt.aglty.io/swagger/v1/swagger.json` | `https://mgmt.aglty.io/swagger` |
| Fetch (content delivery) | `https://api.aglty.io/swagger/v1/swagger.json` | `https://api.aglty.io/swagger` |

Regional Management hosts follow the instance GUID suffix (`-u` → `mgmt.aglty.io`,
`-c` → `mgmt-ca.aglty.io`, `-e` → `mgmt-eu.aglty.io`, `-a` → `mgmt-aus.aglty.io`,
`-us2` → `mgmt-usa2.aglty.io`, `-d` → `mgmt-dev.aglty.io`); the schema is the same.

## Run it

```bash
python3 .claude/skills/api-spec-drift/check_drift.py
```

Reads `AGILITY_GUID` / `AGILITY_API_PREVIEW_KEY` from `.env.local`. Fetches both
specs (caching to `.spec-cache/`) and reads articles through the **preview** API,
so unpublished edits are checked too — which also means a correction shows up as
fixed here before it's published.

Options: `--offline` (reuse cached specs), `--containers A,B`
(default: `ManagementSDKArticles,JavaScriptArticles,dotNetArticles,DeveloperArticles`),
`--json report.json`. Exits non-zero when there is a HIGH finding.

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
  fields, not REST parameters — correctly absent from the spec.
- **Non-Agility parameters.** Deployment guides mention things like `webAppName`
  (Azure); nothing to do with our API.
- **Legitimate SDK/REST naming differences.** An SDK argument may be named
  differently from the REST parameter it maps to. That's only a bug if the docs
  present the name *as* the API's parameter.

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

## Procedure

1. **Run the script.** Note the spec path/schema counts — if they change a lot
   between runs, the API itself moved and a broader review is due.
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
