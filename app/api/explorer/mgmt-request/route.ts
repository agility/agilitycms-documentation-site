import { NextRequest } from "next/server";

import { getAccessibleInstance, getAuthCookie } from "lib/explorer/agilitySession";
import { ClassicAuthError, DEFAULT_MANAGER_URL } from "lib/explorer/classicCall";
import { getMgmtAccessToken, mgmtFetch } from "lib/explorer/mgmtApi";
import { getOperation } from "lib/api-specs/loadSpec";
import { isInstanceScoped, isRunnable } from "lib/explorer/runnable";

/**
 * Run one read-only Management API operation on the caller's behalf.
 *
 * WHY THIS IS PROXIED, WHEN THE FETCH EXPLORER IS NOT
 * ---------------------------------------------------
 * The Fetch explorer calls api.aglty.io straight from the browser, because a
 * fetch key is low-sensitivity and CORS allows it. The Management API also
 * sends `Access-Control-Allow-Origin: *`, so the same trick would work — and
 * it is the wrong thing to do.
 *
 * It would mean putting a Management bearer token in the browser. That token
 * is WRITE-CAPABLE across every instance the user can reach, and this origin
 * renders author-supplied Markdown with raw `<script>` execution enabled, so
 * anyone who can author a docs article could read it out. There is no version
 * of that token that is safe to hand out, so it is minted per request, used
 * here, and never leaves the server.
 *
 * WHY THE CLIENT SENDS A SLUG, NOT A PATH
 * ---------------------------------------
 * If the browser could name the URL, this route would be a general-purpose
 * authenticated proxy into the Management API — an SSRF hole wearing a
 * documentation hat. Someone could ask it for `/oauth/getpreviewkey`, or for
 * another tenant's `{guid}`.
 *
 * So the client sends an operation SLUG and a bag of values. The server looks
 * the operation up in the spec, checks it against the runnable allowlist
 * (lib/explorer/runnable.ts), and rebuilds the path from the spec's own
 * template. A path the spec doesn't contain cannot be expressed, and the
 * `{guid}` is overwritten with the one the caller was authorized for rather
 * than taken from the request.
 */
export async function POST(request: NextRequest) {
	let body: { slug?: string; values?: Record<string, string> };
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "Invalid request." }, { status: 400, headers: NO_STORE });
	}

	const slug = (body.slug || "").trim();
	const values = body.values && typeof body.values === "object" ? body.values : {};

	const operation = slug ? getOperation("management", slug) : undefined;
	if (!operation) {
		return Response.json({ error: "Unknown operation." }, { status: 404, headers: NO_STORE });
	}
	if (!isRunnable("management", operation)) {
		// The UI doesn't offer these, so reaching here means the allowlist was
		// bypassed rather than a user mistake.
		return Response.json(
			{ error: "That operation can't be run from the docs." },
			{ status: 403, headers: NO_STORE }
		);
	}

	const cookieValue = await getAuthCookie();
	if (!cookieValue) {
		return Response.json(
			{ error: "Sign in to Agility to run this." },
			{ status: 401, headers: NO_STORE }
		);
	}

	// Instance-scoped operations are authorized against the caller's own
	// WebsiteAccess, and the authorized guid — not the submitted one — is what
	// gets substituted into the path below.
	let managerUrl = DEFAULT_MANAGER_URL;
	let authorizedGuid: string | null = null;

	if (isInstanceScoped(operation)) {
		const guid = (values.guid || "").trim();
		const instance = guid ? await getAccessibleInstance(guid) : null;
		if (!instance) {
			return Response.json(
				{ error: "No access to that instance." },
				{ status: 403, headers: NO_STORE }
			);
		}
		managerUrl = instance.managerUrl;
		authorizedGuid = instance.guid;
	}

	// Rebuild the path from the SPEC's template. Anything the template doesn't
	// mention is dropped, and guid is forced to the authorized value.
	const safeValues = { ...values, ...(authorizedGuid ? { guid: authorizedGuid } : {}) };
	const missing: string[] = [];
	const path = operation.path.replace(/\{([^}]+)\}/g, (_, name: string) => {
		const value = (safeValues[name] || "").trim();
		if (!value) missing.push(name);
		return encodeURIComponent(value);
	});

	if (missing.length > 0) {
		return Response.json(
			{ error: `Missing required ${missing.length > 1 ? "values" : "value"}: ${missing.join(", ")}.` },
			{ status: 400, headers: NO_STORE }
		);
	}

	// Only parameters the spec declares as query parameters are forwarded —
	// the client cannot smuggle extras onto the request.
	const query = new URLSearchParams();
	for (const param of operation.operation.parameters || []) {
		if (param.in !== "query") continue;
		const value = (safeValues[param.name] || "").trim();
		if (value) query.set(param.name, value);
	}
	const qs = query.toString();

	const started = Date.now();
	try {
		const token = await getMgmtAccessToken(managerUrl, cookieValue);
		if (!token) {
			return Response.json(
				{ error: "Could not authenticate against the Management API." },
				{ status: 502, headers: NO_STORE }
			);
		}

		// `path` already starts with /api/v1/, and the base ends at the host —
		// see mgmtFetch.
		const result = await mgmtFetch(managerUrl, `${path}${qs ? `?${qs}` : ""}`, token);

		return Response.json(
			{
				status: result.status,
				statusText: result.statusText,
				durationMs: Date.now() - started,
				body: result.body,
				// So the panel can show exactly what ran, without the client
				// having had any say in what that was.
				url: result.url,
			},
			{ headers: NO_STORE }
		);
	} catch (err) {
		if (err instanceof ClassicAuthError) {
			return Response.json(
				{ error: "Your Agility session has expired. Sign in again." },
				{ status: 401, headers: NO_STORE }
			);
		}
		console.error(`[explorer] mgmt request failed for ${slug} via ${managerUrl}:`, err);
		return Response.json(
			{ error: "Could not reach the Management API. Try again." },
			{ status: 502, headers: NO_STORE }
		);
	}
}

const NO_STORE = {
	"Cache-Control": "private, no-store",
	"Netlify-CDN-Cache-Control": "no-store",
};
