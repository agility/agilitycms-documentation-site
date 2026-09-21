"use client";

import React from "react";

import { OpenApiParameter } from "lib/api-specs/types";

/**
 * One parameter input, shaped by what the parameter actually is.
 *
 * A single text box for every parameter makes the reader do work the spec
 * already answered: which values are legal, whether this is a number, whether
 * it's a date. Each of those is a chance to send a request that fails for a
 * reason the API won't explain well.
 *
 * Resolution order — most specific wins:
 *   1. `locale`  -> the instance's OWN enabled locales, when we know them.
 *   2. enum      -> a select of the legal values (`$ref`s are resolved to their
 *                   enum server-side, see lib/api-specs/resolveParams.ts).
 *   3. boolean   -> a true/false select with an empty "unset" option, so an
 *                   optional boolean can stay absent rather than defaulting to
 *                   false — which is a different request.
 *   4. integer / number -> a number input, with min/max where the description
 *                   states one (the Agility spec writes limits in prose, e.g.
 *                   "Maximum allowed is 250").
 *   5. date-time -> datetime-local; date -> date.
 *   6. otherwise -> text.
 */

const FIELD_STYLE: React.CSSProperties = {
	background: "var(--bg)",
	border: "1px solid var(--border)",
	borderRadius: "var(--r-xs)",
	color: "var(--text)",
	fontFamily: "var(--mono)",
	fontSize: ".8rem",
};

export interface LocaleOption {
	code: string;
	name: string;
}

interface Props {
	param: OpenApiParameter;
	value: string;
	onChange: (value: string) => void;
	/** Enabled locales for the chosen instance, when resolved. */
	locales?: LocaleOption[];
}

/**
 * The Agility specs state numeric limits in prose rather than in the schema
 * ("Default is 10. Maximum allowed is 250."). Reading them out is worth it:
 * `Take=5000` is a documented mistake this prevents, and the browser enforces
 * it before the request is ever sent.
 */
const numericBound = (description: string | undefined, pattern: RegExp): number | undefined => {
	const match = (description || "").match(pattern);
	return match ? Number(match[1]) : undefined;
};

const ParamInput = ({ param, value, onChange, locales }: Props) => {
	const schema = param.schema || {};
	const type = schema.type;
	const isLocale = param.name.toLowerCase() === "locale";

	// 1. Locale, when we know the instance's own list.
	if (isLocale && locales && locales.length > 0) {
		return (
			<select
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="w-full px-2.5 py-1.5"
				style={FIELD_STYLE}
			>
				{/* No empty option: locale is always required where it appears, and
				    the instance always has at least one. */}
				{locales.map((l) => (
					<option key={l.code} value={l.code}>
						{l.code}
						{l.name && l.name !== l.code ? ` — ${l.name}` : ""}
					</option>
				))}
			</select>
		);
	}

	// 2. Enum.
	if (schema.enum && schema.enum.length > 0) {
		return (
			<select
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="w-full px-2.5 py-1.5"
				style={FIELD_STYLE}
			>
				{!param.required && <option value="">—</option>}
				{schema.enum.map((v) => (
					<option key={String(v)} value={String(v)}>
						{String(v)}
					</option>
				))}
			</select>
		);
	}

	// 3. Boolean — three states, because "unset" is not "false".
	if (type === "boolean") {
		return (
			<select
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="w-full px-2.5 py-1.5"
				style={FIELD_STYLE}
			>
				<option value="">—</option>
				<option value="true">true</option>
				<option value="false">false</option>
			</select>
		);
	}

	// 4. Numbers.
	if (type === "integer" || type === "number") {
		return (
			<input
				type="number"
				inputMode="numeric"
				step={type === "integer" ? 1 : "any"}
				min={numericBound(param.description, /minimum(?:\s+allowed)?\s+is\s+(\d+)/i) ?? 0}
				max={numericBound(param.description, /maximum(?:\s+allowed)?\s+is\s+(\d+)/i)}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={schema.default != null ? String(schema.default) : "0"}
				className="w-full px-2.5 py-1.5"
				style={FIELD_STYLE}
			/>
		);
	}

	// 5. Dates. The schema carries `format: date-time` for some; others are
	//    plain strings whose NAME is the only signal (lastModifiedDate), so the
	//    name is used as a fallback rather than leaving those as free text.
	const looksLikeDate = /date$/i.test(param.name);
	if (schema.format === "date-time" || (looksLikeDate && schema.format !== "date")) {
		return (
			<input
				type="datetime-local"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="w-full px-2.5 py-1.5"
				style={FIELD_STYLE}
			/>
		);
	}
	if (schema.format === "date") {
		return (
			<input
				type="date"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="w-full px-2.5 py-1.5"
				style={FIELD_STYLE}
			/>
		);
	}

	// 6. Text.
	return (
		<input
			type="text"
			value={value}
			onChange={(e) => onChange(e.target.value)}
			placeholder={param.name}
			className="w-full px-2.5 py-1.5"
			style={FIELD_STYLE}
		/>
	);
};

export default ParamInput;
