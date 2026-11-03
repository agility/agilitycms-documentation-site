import { NextRequest } from "next/server";

import { DEFAULT_MANAGER_URL } from "lib/explorer/classicCall";
import { createSupportTicket, supportConfigured } from "lib/support/hubspotTickets";
import { PRODUCT_AREAS } from "lib/support/productAreas";
import { getSupportUser } from "lib/support/supportUser";

/**
 * The support page's API (`/docs/support`, website plans/36 §B1).
 *
 *   GET   who is this, and which instances can they file against?
 *         -> { signedIn, resolved, firstName?, instances[], managerUrl, configured }
 *   POST  file a ticket in HubSpot as the signed-in user
 *         { subject, description, instanceGuid?, productArea, page? }
 *         -> 201 { ok: true, ticketId } | 4xx/5xx { ok: false, error }
 *
 * The user is ALWAYS the one in the Agility session cookie, read server-side.
 * Nothing in the request body can choose whose ticket this is, and an
 * instanceGuid is accepted only if it is one of that user's own instances.
 *
 * Never returns the email address, the auth cookie or anything from HubSpot
 * beyond the new ticket's ID.
 */

const NO_STORE = {
	// Per-visitor. The Netlify apex in front of /docs caches anything it isn't told not to.
	"Cache-Control": "private, no-store",
	"Netlify-CDN-Cache-Control": "no-store",
};

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: NO_STORE });

export async function GET() {
	const result = await getSupportUser();
	return json({
		signedIn: result.state !== "signed-out",
		resolved: result.state !== "unresolved",
		firstName: result.state === "signed-in" ? result.user.firstName : undefined,
		instances: result.state === "signed-in" ? result.user.instances : [],
		managerUrl: DEFAULT_MANAGER_URL,
		configured: supportConfigured(),
	});
}

/**
 * The auth cookie is scoped to `.agilitycms.com` and rides along on any request
 * to it, so a page elsewhere must not be able to file tickets as the visitor.
 * Require an Origin that is agilitycms.com or this deployment itself (Vercel
 * previews, localhost). Browsers always send Origin on a cross-site POST.
 */
const sameSite = (request: NextRequest): boolean => {
	const origin = request.headers.get("origin");
	if (!origin) return false;
	try {
		const { host } = new URL(origin);
		return host === "agilitycms.com" || host === "www.agilitycms.com" || host === request.headers.get("host");
	} catch {
		return false;
	}
};

const text = (v: unknown, max: number): string | null => {
	if (typeof v !== "string") return null;
	const t = v.trim();
	return t && t.length <= max ? t : null;
};

export async function POST(request: NextRequest) {
	if (!sameSite(request)) return json({ ok: false, error: "forbidden" }, 403);
	if (!supportConfigured()) return json({ ok: false, error: "not-configured" }, 503);

	const result = await getSupportUser();
	if (result.state === "signed-out") return json({ ok: false, error: "signed-out" }, 401);
	if (result.state === "unresolved") return json({ ok: false, error: "unavailable" }, 503);
	const { user } = result;

	const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	const subject = text(body?.subject, 200);
	const description = text(body?.description, 10_000);
	const productArea = PRODUCT_AREAS.find((a) => a === body?.productArea);
	if (!subject || !description || !productArea) return json({ ok: false, error: "invalid" }, 400);

	const guid = typeof body?.instanceGuid === "string" ? body.instanceGuid.trim() : "";
	const instance = guid ? user.instances.find((i) => i.guid === guid) : undefined;
	if (guid && !instance) return json({ ok: false, error: "invalid-instance" }, 400);

	const page = text(body?.page, 500);

	try {
		const ticket = await createSupportTicket({
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			subject,
			description,
			instance,
			productArea,
			page: page?.startsWith("https://agilitycms.com/") ? page : undefined,
		});
		return json({ ok: true, ticketId: ticket.id }, 201);
	} catch (err) {
		console.error("[support] ticket not created:", err instanceof Error ? err.message : err);
		return json({ ok: false, error: "unavailable" }, 502);
	}
}
