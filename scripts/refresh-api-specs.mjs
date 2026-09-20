#!/usr/bin/env node
/**
 * Refresh the checked-in OpenAPI snapshots that the API reference is built
 * from (lib/api-specs/snapshots/).
 *
 * The reference reads these files, not the live spec endpoints — see the long
 * note in lib/api-specs/loadSpec.ts for why. The short version: the set of
 * operation slugs is a public URL contract that appears in sitemap.xml and
 * llms.txt, so it changes by pull request, not because a vendor deployed.
 *
 *   npm run specs:refresh          # update both snapshots
 *   npm run specs:refresh -- --check   # exit 1 if either is stale, change nothing
 *
 * `--check` is the CI-friendly form: it reports drift without touching the
 * tree. The api-spec-drift skill does the deeper job of checking the PROSE
 * against the specs; this only tracks the specs themselves.
 *
 * Output is written with sorted keys and 1-space indent so that a refresh
 * produces a reviewable diff instead of a reformatting of the whole file.
 */

import { writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SPECS = {
	fetch: "https://api.aglty.io/swagger/v1/swagger.json",
	management: "https://mgmt.aglty.io/swagger/v1/swagger.json",
};

const here = dirname(fileURLToPath(import.meta.url));
const snapshotDir = join(here, "..", "lib", "api-specs", "snapshots");

const checkOnly = process.argv.includes("--check");

/** Match the on-disk format exactly: sorted keys, 1-space indent. */
const format = (spec) => {
	const sortKeys = (value) => {
		if (Array.isArray(value)) return value.map(sortKeys);
		if (value && typeof value === "object") {
			return Object.fromEntries(
				Object.keys(value)
					.sort()
					.map((k) => [k, sortKeys(value[k])])
			);
		}
		return value;
	};
	return JSON.stringify(sortKeys(spec), null, 1);
};

let stale = false;

for (const [id, url] of Object.entries(SPECS)) {
	const target = join(snapshotDir, `${id}.json`);

	let live;
	try {
		const res = await fetch(url);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		live = await res.json();
	} catch (err) {
		console.error(`✗ ${id}: could not fetch ${url} — ${err.message}`);
		process.exitCode = 1;
		continue;
	}

	// A spec with no paths is an error page, not a spec. Never overwrite a good
	// snapshot with one.
	if (!live?.paths || Object.keys(live.paths).length === 0) {
		console.error(`✗ ${id}: response had no paths — refusing to overwrite the snapshot.`);
		process.exitCode = 1;
		continue;
	}

	const next = format(live);
	const current = await readFile(target, "utf8").catch(() => null);

	if (current === next) {
		console.log(`✓ ${id}: up to date (${Object.keys(live.paths).length} paths)`);
		continue;
	}

	stale = true;
	if (checkOnly) {
		console.log(`△ ${id}: STALE — live spec differs from the snapshot.`);
		continue;
	}

	await writeFile(target, next);
	console.log(`↻ ${id}: updated (${Object.keys(live.paths).length} paths)`);
}

if (checkOnly && stale) {
	console.error(
		"\nSnapshots are behind the live specs. Run `npm run specs:refresh`, review the diff\n" +
			"(especially any added/removed operation — those are public URLs), and commit."
	);
	process.exitCode = 1;
}
