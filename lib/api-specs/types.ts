/** Minimal OpenAPI 3.x shapes — only what the reference and explorer read. */

export interface OpenApiParameter {
	name: string;
	in: "path" | "query" | "header" | "cookie";
	description?: string;
	required?: boolean;
	schema?: OpenApiSchema;
	example?: unknown;
}

export interface OpenApiSchema {
	type?: string;
	format?: string;
	description?: string;
	nullable?: boolean;
	enum?: unknown[];
	items?: OpenApiSchema;
	properties?: Record<string, OpenApiSchema>;
	required?: string[];
	$ref?: string;
	default?: unknown;
}

export interface OpenApiOperation {
	tags?: string[];
	summary?: string;
	description?: string;
	parameters?: OpenApiParameter[];
	requestBody?: {
		required?: boolean;
		content?: Record<string, { schema?: OpenApiSchema }>;
	};
	responses?: Record<
		string,
		{ description?: string; content?: Record<string, { schema?: OpenApiSchema }> }
	>;
}

export interface OpenApiDocument {
	openapi?: string;
	info?: { title?: string; version?: string; description?: string };
	paths: Record<string, Record<string, OpenApiOperation>>;
	components?: {
		schemas?: Record<string, OpenApiSchema>;
		securitySchemes?: Record<string, unknown>;
	};
}

export type HttpMethod = "get" | "post" | "put" | "delete" | "patch";

export const HTTP_METHODS: HttpMethod[] = ["get", "post", "put", "delete", "patch"];

/** One documented operation, resolved out of a spec and given a stable slug. */
export interface ApiOperation {
	/** URL segment for this operation — stable across spec revisions. */
	slug: string;
	method: HttpMethod;
	/** The templated path, e.g. `/{guid}/{apitype}/{locale}/list/{referenceName}`. */
	path: string;
	/**
	 * Other templated paths that serve the identical operation (the Fetch API
	 * publishes `/v1`-prefixed twins of five of its routes). Documented on the
	 * canonical page rather than as duplicate pages competing for the same query.
	 */
	aliases: string[];
	tag: string;
	summary: string;
	operation: OpenApiOperation;
}
