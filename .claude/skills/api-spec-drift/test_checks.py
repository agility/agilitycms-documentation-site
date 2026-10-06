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
`dnfile` for the SDK half. The SDK cases assume the cached .NET package is the
default pick (newest stable, 2.x), not a `--dotnet-version` override. No network,
no CMS access, no credentials.
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

# Mostly verbatim wording from the articles as they were published before the
# 2026-07-30 corrections. If any of these stops flagging, the SDK checker has gone
# blind. A fourth element overrides the NuGet version passed to check(); the
# default is whatever the cache holds.
#
# The original "paged listing attributed to .NET" case (GetContainerListPaged)
# was right to flag against 1.x, but 2.0.0 added GetContainerListPagedAsync, so
# it is now a precision guard for the Async suffix instead. The wrong-SDK case
# uses a method that is still JavaScript-only.
SDK_CASES = [
    (FLAG, "install command naming the assembly",
     "```bash\ndotnet add package management.api.sdk\n```"),
    (FLAG, "JavaScript-only method attributed to .NET",
     "### Get notifications\n\n"
     "**Signature:** `Task<List<Notification>?> GetNotificationList(string guid, int containerId)`\n\n"
     "> Not available in the JavaScript SDK yet.\n"),
    (PASS, "2.x Async method that both SDKs have",
     "### Get containers (paged)\n\n"
     "**.NET signature:** `Task<ContentContainerPagedResult?> GetContainerListPagedAsync(string guid)`\n"),
    (FLAG, "2.x Async method wrongly called missing from JavaScript",
     "### Get containers by model\n\n"
     "**.NET signature:** `Task<List<ContentContainer>?> GetContainersByModelAsync(int modelId)`\n\n"
     "> Not available in the JavaScript SDK yet.\n"),
    (FLAG, "method wrongly called missing from JavaScript",
     "### Get containers by model\n\n"
     "**Signature:** `Task<List<Container?>> GetContainersByModel(int? modelId, string guid)`\n\n"
     "> Not available in the JavaScript SDK yet.\n"),
    (FLAG, "parameter wrongly called .NET only",
     "| `otherLocale` | .NET only — the source locale when copying. |"),
    # Install guidance across the 1.x (prerelease) / 2.x (stable) boundary.
    (FLAG, "--prerelease install once a stable release exists",
     "```bash\ndotnet add package Agility.Management.SDK --prerelease\n```", "2.0.0"),
    (PASS, "--prerelease install while only prereleases exist",
     "```bash\ndotnet add package Agility.Management.SDK --prerelease\n```", "1.0.12-beta"),
    (FLAG, "1.x namespace once 2.x is stable",
     "```csharp\nusing management.api.sdk;\n```", "2.0.0"),
    # Precision guards: these are correct statements and must stay quiet.
    (PASS, "correct install command",
     "```bash\ndotnet add package Agility.Management.SDK\n```"),
    (PASS, "explicit 1.x pin for .NET 6-9",
     "```bash\ndotnet add package Agility.Management.SDK --version 1.0.12-beta\n```", "2.0.0"),
    (PASS, "2.x namespace",
     "```csharp\nusing Agility.Management.Sdk;\nvar client = new AgilityManagementClient(options);\n```",
     "2.0.0"),
    (PASS, "genuinely JavaScript-only method, with a REST fallback",
     "## Page history\n\n"
     "```ts\nawait apiClient.pageMethods.getPageHistory(locale, guid, pageID);\n```\n\n"
     "> JavaScript SDK only. From .NET, call `GET /api/v1/instance/{guid}/{locale}/page/{id}/history`.\n"),
    (PASS, "docs-coverage note, not an availability claim",
     "> This example is only documented for JavaScript.\n"),
    (PASS, "batch row where the JS-only method is one cell of several",
     "| `publishContent()` | **`batchWorkflowContent()`** (JavaScript only) | Publishing many items |"),
]


# Default NuGet pick: newest stable, prerelease only when nothing is stable.
VERSION_CASES = [
    ("2.0.0", ["1.0.0-beta", "1.0.12-beta", "2.0.0"]),
    ("1.0.12-beta", ["1.0.0-beta", "1.0.11-beta", "1.0.12-beta"]),
    ("2.0.0", ["1.0.12-beta", "2.0.0", "2.1.0-rc1"]),
]


def run_sdk() -> list[str]:
    failures = []
    for want, versions in VERSION_CASES:
        got = SDK.pick_version(versions)
        ok = got == want
        print(f"  {'OK ' if ok else 'BAD'} version/{versions[-1]}: want={want} got={got}")
        if not ok:
            failures.append(f"version/{versions[-1]}")

    try:
        dist = SDK.fetch_js_sdk(offline=True)
    except SystemExit as e:
        print(f"  SKIP JavaScript surface unavailable: {e}")
        return ["sdk/js-surface-missing"]
    js = SDK.parse_js_surface(dist)

    dll, cached_version = SDK.fetch_dotnet_sdk(offline=True)
    net = SDK.parse_dotnet_surface(dll) if dll else None
    if net is None:
        print("  SKIP .NET surface unavailable (install dnfile) — half the suite is inert")
        failures.append("sdk/dotnet-surface-missing")
    elif not net:
        # 2.0.0 shipped a new assembly layout and the parser silently found
        # nothing. An empty surface must fail loudly, never pass as "clean".
        print(f"  BAD .NET surface empty for {dll.name} ({cached_version})")
        failures.append("sdk/dotnet-surface-empty")
        net = None
    else:
        print(f"  .NET {cached_version}: {sum(map(len, net.values()))} methods in {len(net)} groups")

    for want, label, body, *version in SDK_CASES:
        found: list[dict] = []
        SDK.check(
            [{"contentID": 0, "fields": {"title": label, "markdownContent": body}}],
            js, net, version[0] if version else cached_version, found,
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
    total = len(ENDPOINT_CASES) + len(REQUIRED_CASES) + len(SDK_CASES) + len(VERSION_CASES)
    print(f"PASSED: {total} cases")
    return 0


if __name__ == "__main__":
    sys.exit(main())
