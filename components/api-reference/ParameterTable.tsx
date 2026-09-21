import React from "react";

import { OpenApiParameter, OpenApiSchema } from "lib/api-specs/types";

/**
 * Render a parameter's type the way a reader thinks about it, not the way
 * OpenAPI stores it: `integer($int32)` rather than a nested type/format pair,
 * `string[]` for arrays, and the enum values inline when there are few enough
 * to be useful.
 *
 * `$ref`s resolve to the bare schema name — the component schemas are rendered
 * separately, and inlining them here would bury the parameter list.
 */
export const describeSchema = (schema?: OpenApiSchema): string => {
	if (!schema) return "string";
	if (schema.$ref) return schema.$ref.split("/").pop() || "object";
	if (schema.type === "array") return `${describeSchema(schema.items)}[]`;
	if (schema.enum && schema.enum.length > 0 && schema.enum.length <= 6) {
		return schema.enum.map((v) => `"${v}"`).join(" | ");
	}
	return schema.format ? `${schema.type} (${schema.format})` : schema.type || "string";
};

interface Props {
	title: string;
	parameters: OpenApiParameter[];
}

const ParameterTable = ({ title, parameters }: Props) => {
	if (parameters.length === 0) return null;

	return (
		<section className="mt-8">
			<h3 className="mb-3 text-base font-semibold" style={{ color: "var(--text)" }}>
				{title}
			</h3>
			<div
				className="overflow-hidden"
				style={{ border: "1px solid var(--border)", borderRadius: "var(--r-md)" }}
			>
				{parameters.map((param, i) => (
					<div
						key={`${param.in}-${param.name}`}
						className="grid grid-cols-1 gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]"
						style={{
							borderTop: i === 0 ? undefined : "1px solid var(--border)",
							background: "var(--surface)",
						}}
					>
						<div className="min-w-0">
							<code
								className="break-words font-semibold"
								style={{ fontFamily: "var(--mono)", fontSize: ".82rem", color: "var(--text)" }}
							>
								{param.name}
							</code>
							<div
								className="mt-0.5 flex flex-wrap items-center gap-x-2"
								style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--muted)" }}
							>
								<span>{describeSchema(param.schema)}</span>
								{param.required && (
									<span style={{ color: "var(--err)" }}>required</span>
								)}
							</div>
						</div>
						<p
							className="min-w-0 text-sm"
							style={{ color: "var(--text-2)", margin: 0 }}
						>
							{/* The Agility specs prefix optional params with a literal
							    "[Optional]" marker. The `required` flag already says that,
							    and more legibly, so the marker is stripped rather than
							    shown twice. */}
							{(param.description || "").replace(/^\[Optional\]\s*/i, "") || "—"}
						</p>
					</div>
				))}
			</div>
		</section>
	);
};

export default ParameterTable;
