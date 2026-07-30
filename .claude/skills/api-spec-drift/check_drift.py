#!/usr/bin/env python3
"""
Diff the Agility docs against the live OpenAPI specs for the Management and
Fetch APIs, and report where the prose disagrees with the contract.

Why this exists: every API claim in the docs was written by hand, so nothing
tied it to the spec. A 2026-07-30 spot check found four wrong claims in minutes
(a field documented as required that isn't, a single-item save documented as
returning an array, two parameter names that don't exist, and examples paging
far past the default). This script makes that check repeatable.

Findings are graded, because the cheap heuristics DO produce false positives:

  HIGH   — mechanical contradiction of the spec. Trust these, but still open the
           article and confirm the sentence really means what the match implies.
  MEDIUM — a heuristic. Often right, sometimes a false positive (an SDK argument
           name legitimately differs from the REST parameter name, for example).
  INFO   — coverage, not correctness.

Read-only. Touches nothing in the CMS.

Usage:
    python3 check_drift.py                    # fetch specs, check default containers
    python3 check_drift.py --offline          # reuse ./.spec-cache/*.json
    python3 check_drift.py --containers ManagementSDKArticles,DeveloperArticles
    python3 check_drift.py --json report.json

Env (read from .env.local at the repo root if present):
    AGILITY_GUID, AGILITY_API_PREVIEW_KEY
"""

import argparse
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

SPECS = {
    "management": "https://mgmt.aglty.io/swagger/v1/swagger.json",
    "fetch": "https://api.aglty.io/swagger/v1/swagger.json",
}

DEFAULT_CONTAINERS = [
    "ManagementSDKArticles",
    "JavaScriptArticles",
    "dotNetArticles",
    "DeveloperArticles",
]

# Page-size literals above this are worth a look even when the spec declares no
# maximum: the Management API defaults are 50 (list) and 20 (paged), and this
# repo's own guidance caps list queries at 250.
PAGE_SIZE_SANITY = 250

CACHE = Path(__file__).parent / ".spec-cache"


# ---------------------------------------------------------------- fetching


def load_env(repo_root: Path) -> dict:
    env = {}
    f = repo_root / ".env.local"
    if f.exists():
        for line in f.read_text().splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, _, v = line.partition("=")
                env[k.strip()] = v.strip()
    for k in ("AGILITY_GUID", "AGILITY_API_PREVIEW_KEY"):
        if os.environ.get(k):
            env[k] = os.environ[k]
    return env


def get_json(url: str, headers: dict | None = None) -> dict:
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def load_specs(offline: bool) -> dict:
    CACHE.mkdir(exist_ok=True)
    out = {}
    for name, url in SPECS.items():
        cached = CACHE / f"{name}.json"
        if offline:
            if not cached.exists():
                sys.exit(f"--offline but {cached} is missing; run once online first.")
            out[name] = json.loads(cached.read_text())
        else:
            try:
                out[name] = get_json(url)
                cached.write_text(json.dumps(out[name]))
            except Exception as e:  # noqa: BLE001
                if cached.exists():
                    print(f"warn: {name} spec fetch failed ({e}); using cache", file=sys.stderr)
                    out[name] = json.loads(cached.read_text())
                else:
                    sys.exit(f"could not fetch {name} spec and no cache: {e}")
    return out


def load_docs(guid: str, key: str, containers: list[str]) -> list[dict]:
    """Every article in the given containers, via the preview (staging) API so
    unpublished edits are checked too."""
    items = []
    for c in containers:
        url = f"https://api.aglty.io/{guid}/preview/en-us/list/{c}?take=250"
        try:
            data = get_json(url, {"APIKey": key})
        except Exception as e:  # noqa: BLE001
            print(f"warn: could not read {c}: {e}", file=sys.stderr)
            continue
        for it in data.get("items", []):
            f = it.get("fields", {}) or {}
            # Normalise CRLF up front — mixed line endings silently break every
            # line-anchored regex downstream.
            body = ((f.get("markdownContent") or "") + "\n" + json.dumps(f.get("content") or "")).replace("\r\n", "\n")
            items.append(
                {
                    "container": c,
                    "contentID": it.get("contentID"),
                    "title": f.get("title"),
                    "slug": f.get("slug"),
                    "body": body,
                }
            )
    return items


# ---------------------------------------------------------------- spec index


def index_spec(spec: dict) -> dict:
    """Flatten the bits we compare against: paths, per-op params, and the
    required-field sets of every schema."""
    paths = {}
    param_names: set[str] = set()
    param_meta: dict[str, list[dict]] = {}
    for path, ops in (spec.get("paths") or {}).items():
        methods = {}
        for method, op in ops.items():
            if method not in ("get", "post", "put", "delete", "patch"):
                continue
            ps = []
            for pr in op.get("parameters", []) or []:
                s = pr.get("schema", {}) or {}
                meta = {
                    "name": pr.get("name"),
                    "in": pr.get("in"),
                    "required": bool(pr.get("required")),
                    "type": s.get("type"),
                    "default": s.get("default"),
                    "maximum": s.get("maximum"),
                }
                ps.append(meta)
                if meta["name"]:
                    param_names.add(meta["name"].lower())
                    param_meta.setdefault(meta["name"].lower(), []).append(
                        {**meta, "path": path, "method": method}
                    )
            resp = {}
            for code, r in (op.get("responses") or {}).items():
                for _ct, media in (r.get("content") or {}).items():
                    s = media.get("schema") or {}
                    if s.get("type") == "array":
                        it = s.get("items") or {}
                        resp[code] = f"array<{it.get('$ref','').split('/')[-1] or it.get('type')}>"
                    else:
                        resp[code] = s.get("$ref", "").split("/")[-1] or s.get("type")
                    break
            methods[method] = {"params": ps, "responses": resp}
        if methods:
            paths[path] = methods

    schemas = (spec.get("components") or {}).get("schemas") or spec.get("definitions") or {}
    required_of: dict[str, set[str]] = {}
    props_of: dict[str, set[str]] = {}
    for name, s in schemas.items():
        required_of[name] = {r.lower() for r in (s.get("required") or [])}
        props_of[name] = {p.lower() for p in (s.get("properties") or {})}

    all_required = set().union(*required_of.values()) if required_of else set()
    all_props = set().union(*props_of.values()) if props_of else set()
    return {
        "paths": paths,
        "param_names": param_names,
        "param_meta": param_meta,
        "required_of": required_of,
        "props_of": props_of,
        "all_required": all_required,
        "all_props": all_props,
    }


def path_pattern(path: str) -> re.Pattern:
    """`/api/v1/instance/{guid}/{locale}/item` -> matches the same path with any
    placeholder spelling (`{guid}`, `:guid`, an actual GUID, `en-us`, ...)."""
    esc = re.escape(path)
    esc = re.sub(r"\\\{[a-zA-Z0-9_]+\\\}", r"[^/\\s\"'`)]+", esc)
    return re.compile(esc, re.I)


# ---------------------------------------------------------------- checks

FINDINGS: list[dict] = []


def add(sev, kind, article, detail, evidence=""):
    FINDINGS.append(
        {
            "severity": sev,
            "kind": kind,
            "article": f"{article['container']}/{article['contentID']} {article['title']!r}",
            "detail": detail,
            "evidence": evidence.strip()[:220],
        }
    )


def check_unknown_paths(articles, idx_all):
    """HIGH: an API-looking path in the docs that no spec declares."""
    known = []
    for idx in idx_all.values():
        known += [path_pattern(p) for p in idx["paths"]]
    cand = re.compile(r"(/api/v1/[A-Za-z0-9_{}\-/\.]+|/v1/\{[A-Za-z]+\}/[A-Za-z0-9_{}\-/]+)")
    for a in articles:
        for m in set(cand.findall(a["body"])):
            p = m.rstrip("/.,`\"')")
            if len(p) < 12:
                continue
            if any(rx.search(p) or rx.fullmatch(p) for rx in known):
                continue
            # tolerate a trailing query string or fragment in prose
            base = p.split("?")[0]
            if any(rx.search(base) for rx in known):
                continue
            add("HIGH", "unknown-endpoint", a, f"path not in either spec: {p}")


def check_required_claims(articles, idx_all):
    """HIGH: docs assert a field is required, but no schema marks it required.

    Only fires when the field IS a known schema property — an unknown name is a
    different problem (and is caught by the parameter check).
    """
    all_req = set().union(*[i["all_required"] for i in idx_all.values()])
    all_props = set().union(*[i["all_props"] for i in idx_all.values()])
    pats = [
        re.compile(r"`(?P<f>[A-Za-z][A-Za-z0-9_]{2,})`[^.\n]{0,60}?\bis\s+required\b", re.I),
        re.compile(r"\*\*`(?P<f>[A-Za-z][A-Za-z0-9_]{2,})`\s+is\s+required\*\*", re.I),
        re.compile(r"\brequired\b[^.\n]{0,40}?`(?P<f>[A-Za-z][A-Za-z0-9_]{2,})`", re.I),
    ]
    for a in articles:
        for pat in pats:
            for m in pat.finditer(a["body"]):
                f = m.group("f").lower()
                if f in all_props and f not in all_req:
                    add(
                        "HIGH",
                        "required-mismatch",
                        a,
                        f"`{m.group('f')}` is documented as required, but no schema lists it in `required`",
                        m.group(0),
                    )


def check_unknown_params(articles, idx_all):
    """MEDIUM: an identifier presented as an API parameter that the spec never
    declares. Heuristic — SDK argument names may legitimately differ."""
    known = set().union(*[i["param_names"] for i in idx_all.values()])
    known |= set().union(*[i["all_props"] for i in idx_all.values()])
    # Only look at identifiers that read like parameters: inside backticks, and
    # camelCase with a meaningful prefix/suffix we associate with API params.
    cand = re.compile(r"`(include[A-Z][A-Za-z]*|[a-z][A-Za-z]*(?:ID|Id|Guid|Locale|Name|Date|Count|Size|Offset))`")
    for a in articles:
        seen = set()
        for m in cand.finditer(a["body"]):
            name = m.group(1)
            if name.lower() in known or name in seen:
                continue
            seen.add(name)
            add("MEDIUM", "unknown-parameter", a, f"`{name}` is not a parameter or property in either spec")


def check_page_sizes(articles, idx_all):
    """MEDIUM: page-size literals well past the spec's defaults/maximums."""
    maxima = {}
    for idx in idx_all.values():
        for nm, metas in idx["param_meta"].items():
            if nm in ("take", "pagesize", "skip", "recordoffset"):
                for meta in metas:
                    if meta.get("maximum") is not None:
                        maxima[nm] = min(maxima.get(nm, 10**9), meta["maximum"])
    pat = re.compile(r"\b(take|pageSize|pagesize)\b\s*[:=]\s*(\d{3,})")
    for a in articles:
        for m in pat.finditer(a["body"]):
            name, val = m.group(1), int(m.group(2))
            cap = maxima.get(name.lower())
            if cap is not None and val > cap:
                add("HIGH", "page-size", a, f"{name}: {val} exceeds the spec maximum of {cap}", m.group(0))
            elif val > PAGE_SIZE_SANITY:
                add(
                    "MEDIUM",
                    "page-size",
                    a,
                    f"{name}: {val} — spec declares no maximum, but this is far past the defaults "
                    f"(50 list / 20 paged); confirm the example paginates instead of assuming one full page",
                    m.group(0),
                )


def check_coverage(articles, idx_all):
    """INFO: spec operations the docs never mention."""
    blob = "\n".join(a["body"] for a in articles).lower()
    for api, idx in idx_all.items():
        missing = []
        for path in idx["paths"]:
            # last two meaningful segments are the recognisable part
            segs = [s for s in path.split("/") if s and not s.startswith("{")]
            tail = "/".join(segs[-2:]).lower()
            if tail and tail not in blob:
                missing.append(path)
        if missing:
            FINDINGS.append(
                {
                    "severity": "INFO",
                    "kind": "coverage",
                    "article": f"({api} API)",
                    "detail": f"{len(missing)} of {len(idx['paths'])} paths unmentioned in the checked containers",
                    "evidence": ", ".join(sorted(missing)[:8]) + (" …" if len(missing) > 8 else ""),
                }
            )


# ---------------------------------------------------------------- main


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--offline", action="store_true", help="reuse cached specs")
    ap.add_argument("--containers", default=",".join(DEFAULT_CONTAINERS))
    ap.add_argument("--json", metavar="FILE", help="also write findings as JSON")
    args = ap.parse_args()

    repo = Path(__file__).resolve().parents[3]
    env = load_env(repo)
    guid, key = env.get("AGILITY_GUID"), env.get("AGILITY_API_PREVIEW_KEY")
    if not guid or not key:
        sys.exit("AGILITY_GUID / AGILITY_API_PREVIEW_KEY not found (.env.local or environment)")

    specs = load_specs(args.offline)
    idx_all = {name: index_spec(s) for name, s in specs.items()}
    for name, idx in idx_all.items():
        print(f"spec[{name}]: {len(idx['paths'])} paths, {len(idx['required_of'])} schemas")

    containers = [c.strip() for c in args.containers.split(",") if c.strip()]
    articles = load_docs(guid, key, containers)
    print(f"docs: {len(articles)} articles across {len(containers)} containers\n")

    check_unknown_paths(articles, idx_all)
    check_required_claims(articles, idx_all)
    check_unknown_params(articles, idx_all)
    check_page_sizes(articles, idx_all)
    check_coverage(articles, idx_all)

    order = {"HIGH": 0, "MEDIUM": 1, "INFO": 2}
    FINDINGS.sort(key=lambda f: (order[f["severity"]], f["kind"], f["article"]))
    for f in FINDINGS:
        print(f"[{f['severity']:6}] {f['kind']}")
        print(f"          {f['article']}")
        print(f"          {f['detail']}")
        if f["evidence"]:
            print(f"          evidence: {f['evidence']}")
        print()

    counts = {s: sum(1 for f in FINDINGS if f["severity"] == s) for s in order}
    print(f"{counts['HIGH']} HIGH, {counts['MEDIUM']} MEDIUM, {counts['INFO']} INFO")

    if args.json:
        Path(args.json).write_text(json.dumps(FINDINGS, indent=2))
        print(f"wrote {args.json}")

    return 1 if counts["HIGH"] else 0


if __name__ == "__main__":
    sys.exit(main())
