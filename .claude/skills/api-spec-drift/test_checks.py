#!/usr/bin/env python3
"""
Control suite for the two drift checkers.

A checker that reports "0 HIGH" is only useful if it would still say something
when something is wrong. Both scripts were tuned hard for precision on 2026-07-30
(one pass reported 28 findings, most of them artifacts of my own scoping), and
every loosening risked the opposite failure: going quiet. These cases pin both
directions — known-bad input must flag, known-good input must not.

Run it after touching either checker:

    python3 .claude/skills/api-spec-drift/test_checks.py

Needs the caches populated (run either checker once without --offline first) and
`dnfile` for the SDK half. No network, no CMS access, no credentials.
"""

from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import check_drift as SPEC  # noqa: E402
import check_sdk_drift as SDK  # noqa: E402

PASS, FLAG = "pass", "flag"

# ---------------------------------------------------------------- spec checker

# Endpoint claims. The two interesting failure modes are a base-URL fragment in a
# code sample (must NOT flag — it's a building block, not a claim) and an invented
# suffix bolted onto a real route (MUST flag — the original substring match let
# these through).
ENDPOINT_CASES = [
    (PASS, "base-URL fragment in a sample",
     "const base = 'https://mgmt.aglty.io/api/v1/instance';"),
    (FLAG, "endpoint that exists nowhere",
     "`GET /api/v1/instance/{guid}/teleport/{id}`"),
    (FLAG, "invented suffix on a real route",
     "`PATCH /api/v1/instance/{guid}/locales/{localeId}/obliterate`"),
    (PASS, "real endpoint", "`GET /api/v1/instance/{guid}/locales/all`"),
    (PASS, "real endpoint with query string",
     "`GET /api/v1/instance/{guid}/fetch-api-status?mode=fetch`"),
    (PASS, "real unauthenticated endpoint", "`GET /api/v1/types`"),
    (PASS, "real nested content route",
     "`GET /api/v1/instance/{guid}/{locale}/item/{contentID}/history`"),
    (PASS, "real route with concrete values",
     "`GET /api/v1/instance/67bc73e6-u/en-us/item/1608/publish`"),
]

# "X is required" claims. The subtle one: prose *about* a property named `required`
# is not a claim that some neighbouring field is mandatory.
REQUIRED_CASES = [
    (FLAG, "field wrongly called required", "`expiryDate` is required for a PAT."),
    (PASS, "discussing the `required` property itself",
     "A field has no `required` (it's a `settings` entry, as the string 'True')."),
    (PASS, "genuinely required field", "`name` is required."),
]


def article(body: str) -> dict:
    return {"container": "T", "contentID": 0, "title": "t", "body": body}


def run_spec() -> list[str]:
    failures = []
    idx_all = {n: SPEC.index_spec(s) for n, s in SPEC.load_specs(offline=True).items()}

    for want, label, body in ENDPOINT_CASES:
        SPEC.FINDINGS.clear()
        SPEC.check_unknown_paths([article(body)], idx_all)
        got = FLAG if SPEC.FINDINGS else PASS
        ok = got == want
        print(f"  {'OK ' if ok else 'BAD'} endpoint/{label}: want={want} got={got}")
        if not ok:
            failures.append(f"endpoint/{label}")

    for want, label, body in REQUIRED_CASES:
        SPEC.FINDINGS.clear()
        SPEC.check_required_claims([article(body)], idx_all)
        got = FLAG if SPEC.FINDINGS else PASS
        ok = got == want
        print(f"  {'OK ' if ok else 'BAD'} required/{label}: want={want} got={got}")
        if not ok:
            failures.append(f"required/{label}")

    return failures


# ----------------------------------------------------------------- SDK checker

# Verbatim wording from the articles as they were published before the 2026-07-30
# corrections. If any of these stops flagging, the SDK checker has gone blind.
SDK_CASES = [
    (FLAG, "install command naming the assembly",
     "```bash\ndotnet add package management.api.sdk\n```"),
    (FLAG, "paged listing attributed to .NET",
     "### Get containers (paged)\n\n"
     "**Signature:** `Task<PagedResult<Container>?> GetContainerListPaged(string guid)`\n\n"
     "> Not available in the JavaScript SDK yet.\n"),
    (FLAG, "method wrongly called missing from JavaScript",
     "### Get containers by model\n\n"
     "**Signature:** `Task<List<Container?>> GetContainersByModel(int? modelId, string guid)`\n\n"
     "> Not available in the JavaScript SDK yet.\n"),
    (FLAG, "parameter wrongly called .NET only",
     "| `otherLocale` | .NET only — the source locale when copying. |"),
    # Precision guards: these are correct statements and must stay quiet.
    (PASS, "correct install command",
     "```bash\ndotnet add package Agility.Management.SDK --prerelease\n```"),
    (PASS, "genuinely JavaScript-only method, with a REST fallback",
     "## Page history\n\n"
     "```ts\nawait apiClient.pageMethods.getPageHistory(locale, guid, pageID);\n```\n\n"
     "> JavaScript SDK only. From .NET, call `GET /api/v1/instance/{guid}/{locale}/page/{id}/history`.\n"),
    (PASS, "docs-coverage note, not an availability claim",
     "> This example is only documented for JavaScript.\n"),
    (PASS, "batch row where the JS-only method is one cell of several",
     "| `publishContent()` | **`batchWorkflowContent()`** (JavaScript only) | Publishing many items |"),
]


def run_sdk() -> list[str]:
    failures = []
    try:
        dist = SDK.fetch_js_sdk(offline=True)
    except SystemExit as e:
        print(f"  SKIP JavaScript surface unavailable: {e}")
        return ["sdk/js-surface-missing"]
    js = SDK.parse_js_surface(dist)

    dll, _ = SDK.fetch_dotnet_sdk(offline=True)
    net = SDK.parse_dotnet_surface(dll) if dll else None
    if net is None:
        print("  SKIP .NET surface unavailable (install dnfile) — half the suite is inert")
        failures.append("sdk/dotnet-surface-missing")

    for want, label, body in SDK_CASES:
        found: list[dict] = []
        SDK.check(
            [{"contentID": 0, "fields": {"title": label, "markdownContent": body}}],
            js, net, "1.0.11-beta", found,
        )
        got = FLAG if found else PASS
        ok = got == want
        print(f"  {'OK ' if ok else 'BAD'} sdk/{label}: want={want} got={got}")
        if not ok:
            failures.append(f"sdk/{label}")

    return failures


def main() -> int:
    print("Spec checker (docs vs OpenAPI):")
    failures = run_spec()
    print("\nSDK checker (docs vs published packages):")
    failures += run_sdk()

    print()
    if failures:
        print(f"FAILED — {len(failures)} case(s): {', '.join(failures)}")
        return 1
    print(f"PASSED — {len(ENDPOINT_CASES) + len(REQUIRED_CASES) + len(SDK_CASES)} cases")
    return 0


if __name__ == "__main__":
    sys.exit(main())
