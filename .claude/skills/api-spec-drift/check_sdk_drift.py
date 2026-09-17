#!/usr/bin/env python3
"""
Check the Management SDK docs against the SDKs themselves.

check_drift.py diffs doc prose against the REST OpenAPI specs. That leaves a hole
the specs cannot cover: the docs also make claims *about the SDKs* — method names,
signatures, and above all "not available in the JavaScript/.NET SDK yet" notes.
Those are invisible to a REST diff, and on 2026-07-30 that hole turned out to be
where the real errors were hiding, including an install command for a NuGet
package that does not exist.

Ground truth here is the published packages:
  - JavaScript: @agility/management-sdk (npm)  -> parse the shipped .d.ts files
  - .NET:       Agility.Management.SDK (NuGet) -> read the assembly metadata

Read-only. Reports; never edits, publishes, or deletes.

Usage:
    python3 .claude/skills/api-spec-drift/check_sdk_drift.py
    python3 .claude/skills/api-spec-drift/check_sdk_drift.py --matrix
    python3 .claude/skills/api-spec-drift/check_sdk_drift.py --json report.json

.NET parsing needs `dnfile` (pip install dnfile). Without it the script still runs
and still checks everything JavaScript-side, but it will say so rather than
silently reporting a half-check — a missing half looks exactly like a clean half
in a report, which is how a checker starts lying.
"""

from __future__ import annotations

import argparse
import io
import json
import os
import re
import sys
import tarfile
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
CACHE = ROOT / ".spec-cache"

NPM_PKG = "@agility/management-sdk"
NUGET_PKG = "Agility.Management.SDK"

# The package name the docs currently tell .NET users to install. The assembly
# inside the package is management.api.sdk.dll, which is where the wrong name
# came from; the *package* id is different, and `dotnet add package
# management.api.sdk` fails outright.
NUGET_ASSEMBLY_NAME = "management.api.sdk"

DOC_CONTAINERS = ["ManagementSDKArticles"]

# Phrases that claim a capability is MISSING FROM AN SDK. These are falsifiable
# against the real surface, so they are what this script checks.
UNAVAILABLE_PATTERNS = [
    r"[Nn]ot available in the JavaScript SDK",
    r"[Nn]ot available in the \.NET SDK",
    r"\.NET only",
    r"JavaScript only",
]

# Deliberately NOT checked: "not documented for the JavaScript SDK", "this example
# is only documented for .NET", and similar. Those describe the state of OUR
# DOCS, not the state of the SDK, so the SDK surface cannot contradict them —
# treating them as availability claims produced a flood of false positives. They
# are still worth a human read (an undocumented-but-present method is a coverage
# gap worth closing), but that is a judgement call, not a mechanical diff.
COVERAGE_PHRASES = [
    r"[Nn]ot documented for the JavaScript SDK",
    r"[Nn]ot documented for the \.NET SDK",
    r"only documented for JavaScript",
    r"only documented for \.NET",
]


def log(msg: str = "") -> None:
    print(msg, flush=True)


# A note usually names the workaround as well as the gap: "getContentList is
# JavaScript only. From .NET, use GetContentItems." The workaround is not the
# subject of the claim, so everything from the hand-off onwards is dropped.
ALTERNATIVE_HINT = re.compile(
    r"\b(from \.NET|from JavaScript|use |call |instead|see )", re.IGNORECASE
)


def strip_alternative(text: str) -> str:
    m = ALTERNATIVE_HINT.search(text)
    return text[: m.start()] if m else text


def _known(names: set[str], js_fold: set[str], net_fold: set[str]) -> set[str]:
    return {n for n in names if n.lower() in js_fold or n.lower() in net_fold}


def candidates(text: str) -> set[str]:
    """Method names a note could be about: called, or merely named in backticks."""
    t = strip_alternative(text)
    return set(ANY_CALL.findall(t)) | set(BACKTICK_IDENT.findall(t))


def http_get(url: str, binary: bool = False):
    req = urllib.request.Request(url, headers={"User-Agent": "agility-docs-sdk-drift"})
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read()
    return raw if binary else raw.decode("utf-8-sig")


# ---------------------------------------------------------------- JavaScript


def fetch_js_sdk(offline: bool = False) -> Path:
    """Download + extract the latest @agility/management-sdk. Returns dist/."""
    dest = CACHE / "js-sdk"
    dist = dest / "package" / "dist"
    if offline:
        if not dist.is_dir():
            raise SystemExit(f"--offline but no cached JS SDK at {dist}")
        return dist

    meta = json.loads(http_get(f"https://registry.npmjs.org/{NPM_PKG}"))
    version = meta["dist-tags"]["latest"]
    tarball = meta["versions"][version]["dist"]["tarball"]

    stamp = dest / ".version"
    if dist.is_dir() and stamp.is_file() and stamp.read_text().strip() == version:
        log(f"  JS SDK {NPM_PKG}@{version} (cached)")
        return dist

    if dest.exists():
        import shutil

        shutil.rmtree(dest)
    dest.mkdir(parents=True, exist_ok=True)
    blob = http_get(tarball, binary=True)
    with tarfile.open(fileobj=io.BytesIO(blob), mode="r:gz") as tf:
        # Guard against path traversal in the archive.
        for m in tf.getmembers():
            p = (dest / m.name).resolve()
            if not str(p).startswith(str(dest.resolve())):
                raise SystemExit(f"unsafe path in tarball: {m.name}")
        tf.extractall(dest)
    stamp.write_text(version)
    log(f"  JS SDK {NPM_PKG}@{version} (downloaded)")
    return dist


METHOD_RE = re.compile(r"^\s{4}([a-z][A-Za-z0-9_]*)\((.*?)\)\s*:\s*(.+?);\s*$")


def parse_js_surface(dist: Path) -> dict[str, dict[str, str]]:
    """{'containerMethods': {'getContainerList': '(guid: string): Promise<...>'}}"""
    surface: dict[str, dict[str, str]] = {}
    for f in sorted((dist / "apiMethods").glob("*.d.ts")):
        group = f.name[: -len(".d.ts")]  # containerMethods.d.ts -> containerMethods
        if group in ("clientInstance",):
            continue
        methods: dict[str, str] = {}
        for line in f.read_text().splitlines():
            m = METHOD_RE.match(line)
            if not m:
                continue
            name, args, ret = m.groups()
            if name == "constructor":
                continue
            methods[name] = f"({args}): {ret}"
        if methods:
            surface[group] = methods
    return surface


# ---------------------------------------------------------------------- .NET


def fetch_dotnet_sdk(offline: bool = False) -> tuple[Path | None, str | None]:
    dest = CACHE / "dotnet-sdk"
    if offline:
        dll = next(dest.rglob("*.dll"), None) if dest.is_dir() else None
        return dll, "cached"

    # Flat-container index lists every version, prerelease included. This package
    # has only ever shipped -beta versions, which is itself worth reporting.
    try:
        idx = json.loads(
            http_get(
                f"https://api.nuget.org/v3-flatcontainer/{NUGET_PKG.lower()}/index.json"
            )
        )
    except urllib.error.HTTPError as e:
        log(f"  !! NuGet lookup for {NUGET_PKG} failed: {e}")
        return None, None
    version = idx["versions"][-1]

    stamp = dest / ".version"
    if stamp.is_file() and stamp.read_text().strip() == version:
        dll = next(dest.rglob("*.dll"), None)
        if dll:
            log(f"  .NET SDK {NUGET_PKG} {version} (cached)")
            return dll, version

    if dest.exists():
        import shutil

        shutil.rmtree(dest)
    dest.mkdir(parents=True, exist_ok=True)
    url = (
        f"https://api.nuget.org/v3-flatcontainer/{NUGET_PKG.lower()}"
        f"/{version}/{NUGET_PKG.lower()}.{version}.nupkg"
    )
    blob = http_get(url, binary=True)
    with zipfile.ZipFile(io.BytesIO(blob)) as zf:
        for n in zf.namelist():
            if n.endswith(".dll") or n.endswith(".nuspec"):
                target = dest / Path(n).name
                target.write_bytes(zf.read(n))
    stamp.write_text(version)
    dll = next(dest.rglob("*.dll"), None)
    log(f"  .NET SDK {NUGET_PKG} {version} (downloaded)")
    return dll, version


def parse_dotnet_surface(dll: Path) -> dict[str, list[str]] | None:
    """{'ContainerMethods': ['GetContainerList', ...]} or None if dnfile absent.

    Deliberately NOT done with `strings`: the ECMA-335 #Strings heap lets one
    name be stored as a suffix of another, so `strings` never emits
    "PublishContent" when "UnPublishContent" is present. Absence would look
    proven when it isn't.
    """
    try:
        import dnfile  # type: ignore
    except ImportError:
        return None

    d = dnfile.dnPE(str(dll))
    S = lambda h: (h.value if hasattr(h, "value") else str(h)) if h is not None else ""
    surface: dict[str, list[str]] = {}
    for t in d.net.mdtables.TypeDef.rows:
        tn = S(t.TypeName)
        if not tn.endswith("Methods"):
            continue
        names = set()
        for m in t.MethodList:
            r = getattr(m, "row", None)
            if r is None:
                continue
            nm = S(r.Name)
            if nm in (".ctor", ".cctor"):
                continue
            flags = r.Flags
            if getattr(flags, "mdPublic", True):
                names.add(nm)
        if names:
            surface[tn] = sorted(names)
    return surface


# --------------------------------------------------------------------- docs


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    f = ROOT / ".env.local"
    if f.is_file():
        for line in f.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def fetch_articles(container: str, env: dict[str, str]) -> list[dict]:
    guid = env.get("AGILITY_GUID") or env.get("NEXT_PUBLIC_AGILITY_GUID")
    key = env.get("AGILITY_API_PREVIEW_KEY") or env.get(
        "NEXT_PUBLIC_AGILITY_API_PREVIEW_KEY"
    )
    if not (guid and key):
        raise SystemExit(
            "Need AGILITY_GUID and AGILITY_API_PREVIEW_KEY in .env.local "
            "(preview, so unpublished corrections are checked too)."
        )
    # No `fields=` filter: the Fetch API matches those names case-sensitively and
    # silently returns an empty `fields` object when they don't line up, which
    # reads as "every article is clean" instead of as an error.
    url = f"https://api.aglty.io/{guid}/preview/en-us/list/{container}?take=250"
    req = urllib.request.Request(url, headers={"APIKey": key, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.loads(r.read().decode("utf-8"))
    return data.get("items", [])


# ------------------------------------------------------------------- checks

BACKTICK_METHOD = re.compile(r"`([a-z][A-Za-z0-9_]*)\(")
DOTNET_METHOD = re.compile(r"`([A-Z][A-Za-z0-9_]*)\(")
# Any call-shaped identifier, backticks or not. Used only where the result is
# intersected against a real SDK surface.
ANY_CALL = re.compile(r"\b([A-Za-z][A-Za-z0-9_]*)\s*\(")
# Prose often names a method without its parens: "`getContentList` is JavaScript only".
BACKTICK_IDENT = re.compile(r"`([A-Za-z][A-Za-z0-9_]*)`")
# "**.NET signature:** `Task<Container?> GetContainerById(int? id, string guid)`"
SIGNATURE_LINE = re.compile(
    r"\*\*(?P<which>[^*]*signature:)\*\*\s*`(?P<sig>[^`]+)`", re.IGNORECASE
)


def check(articles, js, net, net_version, findings):
    js_all = {m for g in js.values() for m in g}
    net_all = {m for g in (net or {}).values() for m in g} if net else set()
    # Case-folded lookup: the two SDKs differ only by convention (camel vs Pascal).
    js_fold = {m.lower() for m in js_all}
    net_fold = {m.lower() for m in net_all}

    for art in articles:
        f = art.get("fields", {})
        title = f.get("title") or f.get("Title") or "?"
        body = f.get("markdownContent") or f.get("markdowncontent") or ""
        if not body:
            continue
        cid = art.get("contentID")
        where = f"{title} ({cid})"

        # 1. Wrong install command for the .NET package.
        if re.search(rf"dotnet add package\s+{re.escape(NUGET_ASSEMBLY_NAME)}\b", body):
            findings.append(
                dict(
                    grade="HIGH",
                    article=where,
                    kind="bad-package-name",
                    detail=(
                        f"Documents `dotnet add package {NUGET_ASSEMBLY_NAME}`. That is the "
                        f"assembly name, not the NuGet package id — it 404s. The package is "
                        f"`{NUGET_PKG}`"
                        + (
                            f", and every published version is prerelease "
                            f"(latest {net_version}), so it needs --prerelease "
                            f"or an explicit --version."
                            if net_version and "-" in net_version
                            else "."
                        )
                    ),
                )
            )

        # 2. "Not available in <other SDK>" claims that the real surface refutes.
        lines = body.splitlines()
        for idx, line in enumerate(lines):
            if not any(re.search(p, line) for p in UNAVAILABLE_PATTERNS):
                continue
            claims_js_missing = bool(
                re.search(r"JavaScript SDK|\.NET only", line)
            )
            claims_net_missing = bool(
                re.search(r"\.NET SDK|JavaScript only", line)
            )
            # Scope matters more than recall. A note inside a table row is about
            # that row's cell; a standalone blockquote note is about the single
            # nearest preceding method. Widening either window sweeps in every
            # method mentioned nearby and manufactures false positives.
            # Order matters: a short table row is still a table row, so the cell
            # test comes before the standalone-note test.
            if "|" in line:
                # "| `publishContent()` | `batchWorkflowContent()` (JavaScript only) |"
                # says batchWorkflowContent is JS-only, not publishContent.
                cell = next(
                    (
                        c
                        for c in line.split("|")
                        if any(re.search(p, c) for p in UNAVAILABLE_PATTERNS)
                    ),
                    line,
                )
                named = candidates(cell)
            else:
                # The note line itself is the best evidence. Only walk backwards
                # when it names nothing, and stop at a heading — a heading ends
                # the section, so anything above it belongs to a different method.
                named = _known(candidates(line), js_fold, net_fold)
                if not named:
                    for back in range(idx - 1, max(-1, idx - 8), -1):
                        if lines[back].lstrip().startswith("#"):
                            break
                        hits = _known(candidates(lines[back]), js_fold, net_fold)
                        if hits:
                            named = hits
                            break
            # An ambiguous subject is worse than a missed finding: acting on the
            # wrong method means "correcting" a sentence that was right.
            named = _known(named, js_fold, net_fold)
            if len(named) != 1:
                continue
            for meth in sorted(named):
                low = meth.lower()
                if claims_js_missing and low in js_fold:
                    actual = next(m for m in js_all if m.lower() == low)
                    findings.append(
                        dict(
                            grade="HIGH",
                            article=where,
                            kind="wrong-availability",
                            detail=(
                                f'Claims "{line.strip()[:90]}" but the JavaScript SDK '
                                f"does export `{actual}`."
                            ),
                        )
                    )
                if claims_net_missing and net is not None and low in net_fold:
                    actual = next(m for m in net_all if m.lower() == low)
                    findings.append(
                        dict(
                            grade="HIGH",
                            article=where,
                            kind="wrong-availability",
                            detail=(
                                f'Claims "{line.strip()[:90]}" but the .NET SDK '
                                f"does expose `{actual}`."
                            ),
                        )
                    )

        # 3. A ".NET signature:" line naming a method .NET does not have (or the
        #    JavaScript equivalent). This catches an entire section attributed to
        #    the wrong SDK, which the availability check above cannot see because
        #    the section makes no "not available" claim at all.
        for m in SIGNATURE_LINE.finditer(body):
            which, sig = m.group("which"), m.group("sig")
            call = ANY_CALL.findall(sig)
            if not call:
                continue
            name = call[-1]  # the method name sits just before its arg list
            # Articles label these either "**.NET signature:**" or plain
            # "**Signature:**". `Task<` is unambiguously C#, so it settles the
            # plain case without guessing from position.
            is_dotnet = ".NET" in which or "Task<" in sig
            if is_dotnet and net is not None and name.lower() not in net_fold:
                if name.lower() in js_fold:
                    findings.append(
                        dict(
                            grade="HIGH",
                            article=where,
                            kind="wrong-sdk-attribution",
                            detail=(
                                f"Presents `{name}` as a .NET method (\"{which.strip()}\"), but "
                                f".NET has no such method — it exists only in the JavaScript SDK. "
                                f"The section is attributed to the wrong SDK."
                            ),
                        )
                    )
                else:
                    findings.append(
                        dict(
                            grade="MEDIUM",
                            article=where,
                            kind="unknown-dotnet-method",
                            detail=f"`{name}` documented as .NET but absent from {NUGET_PKG} {net_version}.",
                        )
                    )

        # 4. Parameter-level availability claims, e.g. "`otherLocale` | .NET only".
        #    Verified against the other SDK's real signature text.
        js_sig_text = " ".join(s for g in js.values() for s in g.values())
        for line in body.splitlines():
            if not re.search(r"\.NET only", line):
                continue
            for tok in re.findall(r"`([a-zA-Z][A-Za-z0-9_]*)`", line):
                if re.search(rf"\b{re.escape(tok)}\s*[?:]", js_sig_text):
                    findings.append(
                        dict(
                            grade="HIGH",
                            article=where,
                            kind="wrong-param-availability",
                            detail=(
                                f"Calls `{tok}` \".NET only\", but it is a parameter in the "
                                f"JavaScript SDK's own signature too."
                            ),
                        )
                    )

        # 5. Method names documented that exist in neither SDK.
        for meth in sorted(set(BACKTICK_METHOD.findall(body))):
            if meth.lower() in js_fold or meth.lower() in net_fold:
                continue
            # Skip plain JS/helper calls that are obviously not SDK surface.
            if meth in {
                "log", "warn", "error", "push", "filter", "map", "find", "forEach",
                "test", "then", "catch", "require", "parse", "stringify", "join",
                "toISOString", "keys", "values", "entries", "includes", "slice",
                "split", "trim", "replace", "length", "add", "has", "get", "set",
                "async", "function", "if", "for", "while", "return", "await",
            }:
                continue
            findings.append(
                dict(
                    grade="MEDIUM",
                    article=where,
                    kind="unknown-method",
                    detail=(
                        f"`{meth}()` appears in prose but is in neither SDK surface. "
                        f"Could be a local helper defined in the sample — check before reporting."
                    ),
                )
            )


def print_matrix(js, net):
    log("## Verified cross-SDK method matrix")
    log()
    if net is None:
        log("> .NET column unavailable (dnfile not installed) — JavaScript only.")
        log()
    net_all = {m.lower(): m for g in (net or {}).values() for m in g} if net else {}
    log("| Group | JavaScript | .NET |")
    log("|---|---|---|")
    for group in sorted(js):
        for name in sorted(js[group]):
            hit = net_all.get(name.lower())
            log(f"| {group} | `{name}` | {'`' + hit + '`' if hit else '—'} |")
    if net:
        js_fold = {m.lower() for g in js.values() for m in g}
        for group in sorted(net):
            for name in sorted(net[group]):
                if name.lower() not in js_fold:
                    log(f"| {group} | — | `{name}` |")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--offline", action="store_true", help="reuse cached packages")
    ap.add_argument("--matrix", action="store_true", help="print the cross-SDK matrix")
    ap.add_argument("--json", metavar="PATH", help="write findings as JSON")
    ap.add_argument("--containers", default=",".join(DOC_CONTAINERS))
    args = ap.parse_args()

    CACHE.mkdir(exist_ok=True)

    log("Fetching SDK surfaces…")
    dist = fetch_js_sdk(args.offline)
    js = parse_js_surface(dist)
    log(f"  JavaScript: {sum(len(v) for v in js.values())} methods in {len(js)} groups")

    dll, net_version = fetch_dotnet_sdk(args.offline)
    net = parse_dotnet_surface(dll) if dll else None
    if net is None:
        log("  .NET: NOT PARSED — install dnfile (pip install dnfile) for the .NET half.")
    else:
        log(f"  .NET: {sum(len(v) for v in net.values())} methods in {len(net)} groups")
    log()

    if args.matrix:
        print_matrix(js, net)
        return 0

    findings: list[dict] = []
    env = load_env()
    for c in [c.strip() for c in args.containers.split(",") if c.strip()]:
        arts = fetch_articles(c, env)
        log(f"Checked {len(arts)} articles in {c}")
        check(arts, js, net, net_version, findings)

    log()
    order = {"HIGH": 0, "MEDIUM": 1, "INFO": 2}
    findings.sort(key=lambda f: (order.get(f["grade"], 9), f["article"]))
    # Same finding can be reached from several context windows; report once.
    seen, unique = set(), []
    for f in findings:
        k = (f["grade"], f["article"], f["detail"])
        if k in seen:
            continue
        seen.add(k)
        unique.append(f)

    highs = [f for f in unique if f["grade"] == "HIGH"]
    for f in unique:
        log(f"[{f['grade']}] {f['article']} — {f['kind']}")
        log(f"    {f['detail']}")
    log()
    log(f"{len(highs)} HIGH, {len([f for f in unique if f['grade']=='MEDIUM'])} MEDIUM")
    if net is None:
        log("NOTE: .NET half not checked — this run cannot be called clean.")

    if args.json:
        Path(args.json).write_text(json.dumps(unique, indent=2))

    return 1 if highs else 0


if __name__ == "__main__":
    sys.exit(main())
