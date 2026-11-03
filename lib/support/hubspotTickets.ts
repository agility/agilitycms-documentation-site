import "server-only";

/**
 * Files a support ticket in HubSpot (portal 23239214) on behalf of a signed-in
 * Agility user.
 *
 * WHY THE CRM API AND NOT A HUBSPOT FORM
 * --------------------------------------
 * A form submission creates or updates a CONTACT. Turning that into a ticket
 * needs a workflow in HubSpot, which is a second moving part that the support
 * pipeline clean-up could break without anyone noticing. Creating the ticket
 * directly sets the pipeline, stage and associations in one place, in code, and
 * fails loudly. (Website plans/36, decision D6.)
 *
 * The ticket is associated with the contact (found or created by email) and with
 * that contact's company, so it sits on the company record next to renewal and
 * tier data, where Customer Success reads it.
 *
 * CONFIGURATION (server-only env vars; never NEXT_PUBLIC_*)
 *   HUBSPOT_SUPPORT_TOKEN           service key "Docs support" (created
 *                                   2026-11-03): crm.objects.tickets.read/write,
 *                                   crm.objects.contacts.read/write,
 *                                   crm.objects.companies.read
 *   HUBSPOT_SUPPORT_PIPELINE        default "0"         (Support)
 *   HUBSPOT_SUPPORT_STAGE           default "1"         (New)
 *   HUBSPOT_SUPPORT_STAGE_CRITICAL  default "66128003"  (Critical/Urgent)
 * Pipeline and stages are env vars so that the support plan's pipeline collapse
 * (system-overview plans/intercom-to-hubspot §2.1) is a config change, not a deploy.
 */

const API = "https://api.hubapi.com";
const TIMEOUT_MS = 10_000;

// HubSpot-defined association type IDs.
const TICKET_TO_CONTACT = 16;
const TICKET_TO_COMPANY = 26;

export const supportConfigured = (): boolean => Boolean(process.env.HUBSPOT_SUPPORT_TOKEN);

export interface NewTicket {
	email: string;
	firstName?: string;
	lastName?: string;
	subject: string;
	description: string;
	/** The instance it is about, already checked against the user's own instances. */
	instance?: { guid: string; name: string; orgName?: string };
	productArea: string;
	critical: boolean;
	/** The docs page they came from, if any. */
	page?: string;
}

class HubSpotError extends Error {}

const call = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
	try {
		const res = await fetch(`${API}${path}`, {
			method,
			headers: {
				Authorization: `Bearer ${process.env.HUBSPOT_SUPPORT_TOKEN}`,
				"Content-Type": "application/json",
			},
			body: body === undefined ? undefined : JSON.stringify(body),
			cache: "no-store",
			signal: controller.signal,
		});
		if (!res.ok) {
			// Log the status and HubSpot's message, never the request body: it holds
			// the customer's email and whatever they wrote.
			const detail = await res.text().catch(() => "");
			throw new HubSpotError(`HubSpot ${method} ${path.split("?")[0]} -> ${res.status}: ${detail.slice(0, 300)}`);
		}
		return (await res.json()) as T;
	} finally {
		clearTimeout(timer);
	}
};

const findOrCreateContact = async (t: NewTicket): Promise<string> => {
	const found = await call<{ results: { id: string }[] }>("POST", "/crm/v3/objects/contacts/search", {
		filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: t.email }] }],
		properties: ["email"],
		limit: 1,
	});
	if (found.results[0]) return found.results[0].id;

	const created = await call<{ id: string }>("POST", "/crm/v3/objects/contacts", {
		properties: { email: t.email, firstname: t.firstName ?? "", lastname: t.lastName ?? "" },
	});
	return created.id;
};

const primaryCompany = async (contactId: string): Promise<string | null> => {
	const assoc = await call<{
		results: { toObjectId: number; associationTypes: { label: string | null }[] }[];
	}>("GET", `/crm/v4/objects/contacts/${contactId}/associations/companies`);
	const primary = assoc.results.find((r) => r.associationTypes.some((a) => a.label === "Primary"));
	const pick = primary ?? assoc.results[0];
	return pick ? String(pick.toObjectId) : null;
};

const ticketBody = (t: NewTicket): string =>
	[
		t.description.trim(),
		"",
		"---",
		`Instance: ${t.instance ? `${t.instance.name} (${t.instance.guid})${t.instance.orgName ? `, ${t.instance.orgName}` : ""}` : "not about a specific instance"}`,
		`Product area: ${t.productArea}`,
		`Blocking: ${t.critical ? "yes" : "no"}`,
		t.page ? `Filed from: ${t.page}` : null,
		"Source: agilitycms.com/docs/support (signed in to Agility)",
	]
		.filter((l): l is string => l !== null)
		.join("\n");

export const createSupportTicket = async (t: NewTicket): Promise<{ id: string }> => {
	const contactId = await findOrCreateContact(t);
	const companyId = await primaryCompany(contactId).catch(() => null);

	const associations = [
		{ to: { id: contactId }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: TICKET_TO_CONTACT }] },
	];
	if (companyId) {
		associations.push({
			to: { id: companyId },
			types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: TICKET_TO_COMPANY }],
		});
	}

	const pipeline = process.env.HUBSPOT_SUPPORT_PIPELINE || "0";
	const stage = t.critical
		? process.env.HUBSPOT_SUPPORT_STAGE_CRITICAL || "66128003"
		: process.env.HUBSPOT_SUPPORT_STAGE || "1";

	const ticket = await call<{ id: string }>("POST", "/crm/v3/objects/tickets", {
		properties: {
			subject: t.subject.trim(),
			content: ticketBody(t),
			hs_pipeline: pipeline,
			hs_pipeline_stage: stage,
			hs_ticket_priority: t.critical ? "HIGH" : "MEDIUM",
		},
		associations,
	});
	return { id: ticket.id };
};
