import { getExplorerSession } from "lib/explorer/agilitySession";
import { DEFAULT_MANAGER_URL } from "lib/explorer/classicCall";

/**
 * The instances the signed-in visitor can reach, for the API explorer's
 * instance picker.
 *
 * Returns `{ signedIn, resolved, firstName?, instances[], managerUrl }`.
 * `resolved: false` means "someone is signed in, but we couldn't enumerate
 * their instances" — the UI then falls back to manual GUID entry rather than
 * claiming they have none.
 *
 * `managerUrl` is the Classic host the client builds its sign-in link against:
 *
 *     {managerUrl}/login?returnUrl={encodeURIComponent(location.href)}
 *
 * That is the Manager app's own pattern (LoginRequired.tsx), and it needs no
 * Auth0 configuration: Classic's `/login` puts the returnUrl in its OWIN
 * AuthenticationProperties and hands Auth0 only its OWN registered callback
 * (`https://manager.agilitycms.com/`), so Auth0 never sees — and never has to
 * allow — an agilitycms.com/docs URL. The session then rides back on the
 * `.agilitycms.com`-scoped cookie, which /docs can already read.
 *
 * It is sent from the server rather than inlined in the bundle so that
 * AGILITY_MANAGER_URL stays a runtime setting; NEXT_PUBLIC_* would bake it in
 * at build time and need a redeploy to change.
 *
 * Never returns the auth cookie, the email address, or any API key.
 */
export async function GET() {
	const session = await getExplorerSession();

	return Response.json(
		{ ...session, managerUrl: DEFAULT_MANAGER_URL },
		{
			headers: {
				// Per-visitor. No shared cache may store this, and the Netlify apex
				// in front of /docs will cache anything it is not told not to.
				"Cache-Control": "private, no-store",
				"Netlify-CDN-Cache-Control": "no-store",
			},
		}
	);
}
