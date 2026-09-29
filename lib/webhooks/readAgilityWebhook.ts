import { Webhook } from "standardwebhooks";

/**
 * Read an Agility webhook request, verifying its signature when a secret is
 * configured.
 *
 * Agility's secure delivery follows Standard Webhooks: `webhook-id`,
 * `webhook-timestamp` and `webhook-signature` headers, an HMAC-SHA256 over
 * `${id}.${timestamp}.${rawBody}`, and a 5-minute timestamp tolerance — all
 * checked by `standardwebhooks` (the package name has no hyphen). The HMAC is
 * over the exact bytes sent, so the raw body is read before any JSON parse.
 *
 * Each webhook has its own `whsec_…` secret, so each route passes its own env
 * var. Unset = unsigned requests are accepted, which is what lets this ship
 * before secure delivery is switched on in Agility; set it and every request
 * must carry a valid signature. During a secret roll Agility sends several
 * space-separated signatures and any one matching is enough.
 *
 * On failure the caller returns `response` (401) as-is. Agility counts any 2xx
 * as delivered, so a rejection shows in the webhook's Delivery History.
 */
export async function readAgilityWebhook<T>(
	req: Request,
	secretEnvName: string
): Promise<{ ok: true; body: T } | { ok: false; response: Response }> {
	const rawBody = await req.text();
	const secret = process.env[secretEnvName];

	if (secret) {
		try {
			new Webhook(secret).verify(rawBody, {
				"webhook-id": req.headers.get("webhook-id") ?? "",
				"webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
				"webhook-signature": req.headers.get("webhook-signature") ?? "",
			});
		} catch (e) {
			console.warn(
				`readAgilityWebhook: rejected ${req.headers.get("webhook-id") ?? "(no id)"}`,
				e instanceof Error ? e.message : e
			);
			return { ok: false, response: new Response("Invalid signature", { status: 401 }) };
		}
	}

	try {
		return { ok: true, body: JSON.parse(rawBody) as T };
	} catch {
		return { ok: false, response: new Response("Invalid JSON", { status: 400 }) };
	}
}
