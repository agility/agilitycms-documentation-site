/** The "which part of Agility" choices on the support form. Shared by the form
 *  and the API route, which rejects anything not in this list. */
export const PRODUCT_AREAS = [
	"Content Manager",
	"Classic Content Manager",
	"APIs & SDKs",
	"CLI",
	"Apps & integrations",
	"Billing & account",
	"Something else",
] as const;

export type ProductArea = (typeof PRODUCT_AREAS)[number];
