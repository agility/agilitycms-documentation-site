import { getExplorerSession } from "lib/explorer/agilitySession";

/**
 * The instances the signed-in visitor can reach, for the API explorer's
 * instance picker.
 *
 * Returns `{ signedIn, resolved, firstName?, instances[] }`. `resolved: false`
 * means "someone is signed in, but we couldn't enumerate their instances" —
 * either AGILITY_MANAGER_URL is unset or Classic didn't answer — and the UI
 * falls back to manual GUID entry rather than claiming they have no instances.
 *
 * Never returns the auth cookie, the email address, or any API key.
 */
export async function GET() {
	const session = await getExplorerSession();

	return Response.json(session, {
		headers: {
			// Per-visitor. No shared cache may store this, and the Netlify apex in
			// front of /docs will cache anything it is not told not to.
			"Cache-Control": "private, no-store",
			"Netlify-CDN-Cache-Control": "no-store",
		},
	});
}
