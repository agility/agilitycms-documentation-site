import "server-only";

import { getAuthCookie } from "lib/explorer/agilitySession";
import { ClassicAuthError, classicCall } from "lib/explorer/classicCall";

/**
 * Who is filing a support request, read server-side from their Agility session.
 *
 * Same source as the API explorer (`GetCurrentServerUser`), but this one keeps
 * the email address and names, because a ticket has to be filed against a
 * contact. They are used ONLY on the server, to talk to HubSpot. Nothing here
 * is ever returned to the browser except `firstName` and the instance list,
 * which the explorer already exposes.
 *
 * The browser never tells us who it is. A request body that names an email or
 * an instance is checked against this, never trusted on its own.
 */

export interface SupportInstance {
	guid: string;
	name: string;
	orgName?: string;
}

export interface SupportUser {
	email: string;
	firstName?: string;
	lastName?: string;
	instances: SupportInstance[];
}

export type SupportUserResult =
	| { state: "signed-out" }
	/** Signed in, but Classic couldn't be reached. Not the same as signed out. */
	| { state: "unresolved" }
	| { state: "signed-in"; user: SupportUser };

interface RawUser {
	EmailAddress?: string;
	FirstName?: string;
	LastName?: string;
	WebsiteAccess?: RawWebsite[];
	websiteAccess?: RawWebsite[];
}

interface RawWebsite {
	Guid?: string;
	guid?: string;
	WebsiteName?: string;
	websiteName?: string;
	DisplayName?: string;
	displayName?: string;
	OrgName?: string;
	orgName?: string;
}

export const getSupportUser = async (): Promise<SupportUserResult> => {
	const cookieValue = await getAuthCookie();
	if (!cookieValue) return { state: "signed-out" };

	try {
		const data = await classicCall<RawUser>({
			path: "/json/User/GetCurrentServerUser",
			body: {},
			cookieValue,
		});
		const email = data?.EmailAddress?.trim();
		if (!data || !email) return { state: "unresolved" };

		const raw = data.WebsiteAccess || data.websiteAccess || [];
		const instances = raw
			.map((w): SupportInstance | null => {
				const guid = (w.Guid || w.guid || "").trim();
				if (!guid) return null;
				const name = (w.DisplayName || w.displayName || w.WebsiteName || w.websiteName || guid).trim();
				return { guid, name, orgName: (w.OrgName || w.orgName || "").trim() || undefined };
			})
			.filter((i): i is SupportInstance => i !== null);

		return {
			state: "signed-in",
			user: {
				email,
				firstName: data.FirstName?.trim() || undefined,
				lastName: data.LastName?.trim() || undefined,
				instances,
			},
		};
	} catch (err) {
		if (err instanceof ClassicAuthError) return { state: "signed-out" };
		return { state: "unresolved" };
	}
};
