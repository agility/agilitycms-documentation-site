import { OpenApiDocument, OpenApiParameter, OpenApiSchema } from "lib/api-specs/types";

/**
 * Inline a parameter's `$ref` schema before it crosses to the client.
 *
 * The explorer needs the ENUM VALUES to render a select — `apitype` is
 * `$ref: "#/components/schemas/APIType"`, whose enum is ["preview", "fetch"] —
 * but the reference alone says nothing, and shipping the whole
 * `components.schemas` map to the browser to resolve one string would be a lot
 * of bytes for very little.
 *
 * One level deep is enough: no parameter schema in either Agility spec points
 * at another reference. Anything more nested keeps its `$ref` and falls back to
 * a text input, which is the correct degradation.
 */
export const resolveParameters = (
	parameters: OpenApiParameter[],
	spec: OpenApiDocument
): OpenApiParameter[] => {
	const schemas = spec.components?.schemas || {};

	const resolve = (schema?: OpenApiSchema): OpenApiSchema | undefined => {
		if (!schema?.$ref) return schema;
		const name = schema.$ref.split("/").pop() || "";
		const target = schemas[name];
		// Keep the $ref when it can't be resolved, so describeSchema can still
		// print the type name rather than "string".
		return target ? { ...target, ...(schema.description ? { description: schema.description } : {}) } : schema;
	};

	return parameters.map((param) => ({ ...param, schema: resolve(param.schema) }));
};

/**
 * Required parameters first, then optional, each keeping spec order.
 *
 * Purely presentational, and the reason is that a flat list of fifteen inputs
 * gives no clue which three actually have to be filled in. The `*` markers are
 * easy to miss when they're scattered.
 */
export const requiredFirst = (parameters: OpenApiParameter[]): OpenApiParameter[] => [
	...parameters.filter((p) => p.required),
	...parameters.filter((p) => !p.required),
];
