"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import { OpenApiParameter } from "lib/api-specs/types";

/**
 * The "try it" panel: run a real request against an instance the reader
 * actually owns.
 *
 * HOW IT TALKS TO AGILITY
 * -----------------------
 * The request goes STRAIGHT FROM THE BROWSER to api.aglty.io. That is possible
 * because the Fetch API answers with `Access-Control-Allow-Origin: *` and
 * allows the `APIKey` request header (verified by preflight, 2026-09-20), and
 * it is worth doing for two reasons beyond latency:
 *
 *   1. No server proxy means no request-time IO on a docs route, so the 126
 *      reference pages stay static under Cache Components.
 *   2. The reader sees the true response — status, timing, headers, rate-limit
 *      counters — rather than our relay's version of it.
 *
 * Only two things go through our own server, and only because they need the
 * visitor's Agility cookie: the instance list and the per-instance API key.
 *
 * WHY THE KEY IS NEVER PERSISTED
 * ------------------------------
 * The key lives in component state and nowhere else — not localStorage, not
 * sessionStorage. Docs articles on this origin render author-supplied Markdown
 * with raw `<script>` execution enabled (see AGENTS.md, Rendering Model), so
 * anything in web storage on /docs is readable by anyone who can author an
 * article. A Fetch key is low-sensitivity by design, but "low" is not "nothing"
 * and there is no reason to leave one lying around between page loads.
 */

export interface ExplorerProps {
	/** Templated path, e.g. `/{guid}/{apitype}/{locale}/list/{referenceName}`. */
	path: string;
	method: string;
	parameters: OpenApiParameter[];
	/** Shown before an instance is chosen. */
	defaultHost: string;
	/** False for APIs whose explorer is read-only in this release. */
	runnable: boolean;
	/** Why it isn't runnable, when it isn't. */
	notRunnableReason?: string;
}

interface Instance {
	guid: string;
	displayName: string;
	orgName?: string;
	isDormant?: boolean;
}

interface SessionState {
	signedIn: boolean;
	resolved: boolean;
	instances: Instance[];
}

interface RunResult {
	status: number;
	statusText: string;
	durationMs: number;
	body: string;
	rateLimitRemaining?: string | null;
}

/** Region infix from an instance GUID — mirrors lib/api-specs/registry.ts. */
const REGION_INFIX: Record<string, string> = {
	u: "",
	c: "-ca",
	e: "-eu",
	a: "-aus",
	us2: "-usa2",
	d: "-dev",
};

const hostForGuid = (guid: string): string => {
	const suffix = (guid || "").split("-").pop()?.toLowerCase() || "u";
	return `https://api${REGION_INFIX[suffix] ?? ""}.aglty.io`;
};

const ApiExplorer = ({
	path,
	method,
	parameters,
	defaultHost,
	runnable,
	notRunnableReason,
}: ExplorerProps) => {
	const [session, setSession] = useState<SessionState | null>(null);
	const [guid, setGuid] = useState("");
	/**
	 * The key is stored WITH the instance it belongs to, and read back only when
	 * the two still agree. Keeping them in separate state let a render pair the
	 * previous instance's key with the newly selected instance — briefly, but
	 * long enough to send a request with it, which would 401 confusingly at best
	 * and read the wrong instance at worst. Deriving it this way makes the
	 * mismatch unrepresentable rather than merely unlikely.
	 */
	const [keyState, setKeyState] = useState<{
		guid: string;
		apiKey?: string;
		error?: string;
	} | null>(null);

	const forCurrentGuid = keyState?.guid === guid ? keyState : null;
	const apiKey = forCurrentGuid?.apiKey || null;
	const keyError = forCurrentGuid?.error || null;
	/**
	 * Derived rather than a third piece of state: we are loading exactly when
	 * the guid is worth asking about and no answer for THAT guid has landed yet.
	 * One less thing that can disagree with the other two.
	 */
	const loadingKey = isGuidShaped(guid) && !forCurrentGuid;
	const [values, setValues] = useState<Record<string, string>>(() => initialValues(parameters));
	const [result, setResult] = useState<RunResult | null>(null);
	const [running, setRunning] = useState(false);
	const [runError, setRunError] = useState<string | null>(null);

	// Who is this, and which instances can they reach? One call, on mount.
	useEffect(() => {
		let cancelled = false;
		fetch("/docs/api/explorer/instances", { cache: "no-store" })
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				if (cancelled || !data) return;
				setSession(data);
				// Pre-select when there is no choice to make.
				const usable = (data.instances || []).filter((i: Instance) => !i.isDormant);
				if (usable.length === 1) setGuid(usable[0].guid);
			})
			.catch(() => {
				if (!cancelled) setSession({ signedIn: false, resolved: true, instances: [] });
			});
		return () => {
			cancelled = true;
		};
	}, []);

	// Fetch the key whenever the chosen instance changes. The key is scoped to
	// this component's lifetime — see the note at the top.
	useEffect(() => {
		if (!guid || !isGuidShaped(guid)) return;

		let cancelled = false;
		fetch(`/docs/api/explorer/fetch-key?guid=${encodeURIComponent(guid)}`, { cache: "no-store" })
			.then(async (res) => {
				const data = await res.json().catch(() => null);
				if (cancelled) return;
				if (!res.ok || !data?.apiKey) {
					setKeyState({
						guid,
						error: data?.error || "Could not get an API key for that instance.",
					});
					return;
				}
				setKeyState({ guid, apiKey: data.apiKey });
			})
			.catch(() => {
				if (!cancelled) setKeyState({ guid, error: "Could not reach the key service." });
			});
		return () => {
			cancelled = true;
		};
	}, [guid]);

	// Path params are filled from the instance picker where we know the answer
	// (`guid`), and pinned where only one value is valid (`apitype`: we issue
	// published-content keys, so `preview` would 401).
	const effectiveValues = useMemo(
		() => ({ ...values, ...(guid ? { guid } : {}), apitype: "fetch" }),
		[values, guid]
	);

	const requestUrl = useMemo(
		() => buildUrl(guid ? hostForGuid(guid) : defaultHost, path, parameters, effectiveValues),
		[guid, defaultHost, path, parameters, effectiveValues]
	);

	const missing = useMemo(
		() =>
			parameters
				.filter((p) => p.required && p.name !== "guid" && p.name !== "apitype")
				.filter((p) => !(effectiveValues[p.name] || "").trim())
				.map((p) => p.name),
		[parameters, effectiveValues]
	);

	const run = useCallback(async () => {
		if (!apiKey) return;
		setRunning(true);
		setRunError(null);
		setResult(null);
		const started = performance.now();
		try {
			const res = await fetch(requestUrl, {
				method: method.toUpperCase(),
				headers: { APIKey: apiKey, Accept: "application/json" },
			});
			const text = await res.text();
			setResult({
				status: res.status,
				statusText: res.statusText,
				durationMs: Math.round(performance.now() - started),
				body: prettyJson(text),
				rateLimitRemaining: res.headers.get("x-rate-limit-remaining"),
			});
		} catch {
			// A browser-level failure here is almost always the network or an
			// extension blocking the call — CORS is known-good for this API.
			setRunError("The request could not be sent. Check your connection and try again.");
		} finally {
			setRunning(false);
		}
	}, [apiKey, requestUrl, method]);

	const editable = parameters.filter((p) => p.name !== "guid" && p.name !== "apitype");

	return (
		<section
			className="mt-10 overflow-hidden"
			style={{
				border: "1px solid var(--border)",
				borderRadius: "var(--r-md)",
				background: "var(--surface)",
			}}
		>
			<header
				className="flex items-center justify-between gap-3 px-4 py-3"
				style={{ borderBottom: "1px solid var(--border)" }}
			>
				<h3 className="text-sm font-semibold" style={{ color: "var(--text)", margin: 0 }}>
					Try it
				</h3>
				{result && (
					<span
						style={{
							fontFamily: "var(--mono)",
							fontSize: ".72rem",
							color: result.status < 400 ? "var(--ok)" : "var(--err)",
						}}
					>
						{result.status} {result.statusText} · {result.durationMs}ms
					</span>
				)}
			</header>

			<div className="px-4 py-4">
				{!runnable ? (
					<p className="text-sm" style={{ color: "var(--text-2)", margin: 0 }}>
						{notRunnableReason}
					</p>
				) : (
					<>
						<InstancePicker
							session={session}
							guid={guid}
							onChange={setGuid}
							loadingKey={loadingKey}
							keyError={keyError}
							hasKey={!!apiKey}
						/>

						{editable.length > 0 && (
							<div className="mt-4 grid gap-3 sm:grid-cols-2">
								{editable.map((param) => (
									<label key={`${param.in}-${param.name}`} className="block min-w-0">
										<span
											className="mb-1 flex items-baseline gap-1.5"
											style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--muted)" }}
										>
											<span style={{ color: "var(--text)" }}>{param.name}</span>
											{param.required && <span style={{ color: "var(--err)" }}>*</span>}
											<span>{param.in}</span>
										</span>
										<input
											type="text"
											value={values[param.name] || ""}
											onChange={(e) =>
												setValues((v) => ({ ...v, [param.name]: e.target.value }))
											}
											placeholder={placeholderFor(param)}
											className="w-full px-2.5 py-1.5"
											style={{
												background: "var(--bg)",
												border: "1px solid var(--border)",
												borderRadius: "var(--r-xs)",
												color: "var(--text)",
												fontFamily: "var(--mono)",
												fontSize: ".8rem",
											}}
										/>
									</label>
								))}
							</div>
						)}

						<div className="mt-4">
							<div
								className="mb-2 break-all px-3 py-2"
								style={{
									background: "var(--code-bg)",
									border: "1px solid var(--border)",
									borderRadius: "var(--r-xs)",
									fontFamily: "var(--mono)",
									fontSize: ".74rem",
									color: "var(--text-2)",
								}}
							>
								<span style={{ color: "var(--primary-text)" }}>{method.toUpperCase()}</span>{" "}
								{requestUrl}
							</div>

							<button
								type="button"
								onClick={run}
								disabled={!apiKey || running || missing.length > 0}
								className="px-3.5 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
								style={{
									background: "var(--primary)",
									color: "var(--on-primary)",
									border: "none",
									borderRadius: "var(--r-xs)",
								}}
							>
								{running ? "Sending…" : "Send request"}
							</button>

							{missing.length > 0 && apiKey && (
								<span className="ml-3 text-xs" style={{ color: "var(--muted)" }}>
									Fill in {missing.join(", ")} first.
								</span>
							)}
						</div>

						{runError && (
							<p className="mt-3 text-sm" style={{ color: "var(--err)", margin: "0.75rem 0 0" }}>
								{runError}
							</p>
						)}

						{result && (
							<div className="mt-4">
								{result.rateLimitRemaining && (
									<p
										className="mb-1"
										style={{ fontFamily: "var(--mono)", fontSize: ".68rem", color: "var(--muted)", margin: "0 0 .25rem" }}
									>
										{result.rateLimitRemaining} requests remaining this second
									</p>
								)}
								<pre
									className="max-h-96 overflow-auto px-3 py-2.5"
									style={{
										background: "var(--code-bg)",
										border: "1px solid var(--border)",
										borderRadius: "var(--r-xs)",
										fontFamily: "var(--mono)",
										fontSize: ".74rem",
										color: "var(--text)",
										margin: 0,
									}}
								>
									<code>{result.body}</code>
								</pre>
							</div>
						)}
					</>
				)}
			</div>
		</section>
	);
};

/** Instance chooser, with a graceful path for every session state. */
const InstancePicker = ({
	session,
	guid,
	onChange,
	loadingKey,
	keyError,
	hasKey,
}: {
	session: SessionState | null;
	guid: string;
	onChange: (guid: string) => void;
	loadingKey: boolean;
	keyError: string | null;
	hasKey: boolean;
}) => {
	if (!session) {
		return (
			<p className="text-sm" style={{ color: "var(--muted)", margin: 0 }}>
				Checking your Agility session…
			</p>
		);
	}

	// Signed out, or signed in but we couldn't enumerate instances: fall back to
	// manual entry rather than asserting they have none.
	const manualOnly = !session.signedIn || !session.resolved || session.instances.length === 0;

	return (
		<div>
			{manualOnly ? (
				<>
					<label className="block">
						<span
							className="mb-1 block"
							style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--muted)" }}
						>
							Instance GUID
						</span>
						<input
							type="text"
							value={guid}
							onChange={(e) => onChange(e.target.value.trim())}
							placeholder="00000000-u"
							className="w-full max-w-sm px-2.5 py-1.5"
							style={{
								background: "var(--bg)",
								border: "1px solid var(--border)",
								borderRadius: "var(--r-xs)",
								color: "var(--text)",
								fontFamily: "var(--mono)",
								fontSize: ".8rem",
							}}
						/>
					</label>
					{!session.signedIn && (
						<p className="mt-2 text-xs" style={{ color: "var(--muted)", margin: ".5rem 0 0" }}>
							<a
								href="https://app.agilitycms.com"
								style={{ color: "var(--primary-text)", textDecoration: "underline" }}
							>
								Sign in to Agility
							</a>{" "}
							to pick from the instances you have access to.
						</p>
					)}
				</>
			) : (
				<label className="block">
					<span
						className="mb-1 block"
						style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--muted)" }}
					>
						Your instance
					</span>
					<select
						value={guid}
						onChange={(e) => onChange(e.target.value)}
						className="w-full max-w-sm px-2.5 py-1.5"
						style={{
							background: "var(--bg)",
							border: "1px solid var(--border)",
							borderRadius: "var(--r-xs)",
							color: "var(--text)",
							fontFamily: "var(--mono)",
							fontSize: ".8rem",
						}}
					>
						<option value="">Choose an instance…</option>
						{session.instances.map((i) => (
							<option key={i.guid} value={i.guid} disabled={i.isDormant}>
								{i.displayName}
								{i.orgName ? ` — ${i.orgName}` : ""}
								{i.isDormant ? " (dormant)" : ""}
							</option>
						))}
					</select>
				</label>
			)}

			<p className="mt-2 text-xs" style={{ color: hasKey ? "var(--ok)" : "var(--muted)", margin: ".5rem 0 0" }}>
				{loadingKey
					? "Getting the Fetch API key…"
					: keyError
						? keyError
						: hasKey
							? "Ready — requests run against published content in this instance."
							: "Choose an instance to load its API key."}
			</p>
		</div>
	);
};

// ---- helpers -------------------------------------------------------------

/** Seed the form from the spec's own defaults and examples. */
const initialValues = (parameters: OpenApiParameter[]): Record<string, string> => {
	const out: Record<string, string> = {};
	for (const p of parameters) {
		if (p.example != null) out[p.name] = String(p.example);
		else if (p.schema?.default != null) out[p.name] = String(p.schema.default);
		else if (p.name.toLowerCase() === "locale") out[p.name] = "en-us";
	}
	return out;
};

const placeholderFor = (p: OpenApiParameter): string => {
	if (p.schema?.enum?.length) return String(p.schema.enum[0]);
	if (p.schema?.type === "integer") return "0";
	if (p.schema?.type === "boolean") return "true";
	return p.name;
};

/**
 * A GUID is `<8 hex>-<region>`. Checked before asking the server for a key so
 * a half-typed value doesn't fire a request per keystroke.
 */
const isGuidShaped = (guid: string): boolean => /^[0-9a-z]{6,}-[a-z0-9]{1,4}$/i.test(guid.trim());

/** Fill the path template, then append the non-empty query parameters. */
const buildUrl = (
	host: string,
	path: string,
	parameters: OpenApiParameter[],
	values: Record<string, string>
): string => {
	const filled = path.replace(/\{([^}]+)\}/g, (_, name: string) => {
		const value = (values[name] || "").trim();
		return value ? encodeURIComponent(value) : `{${name}}`;
	});

	const query = new URLSearchParams();
	for (const p of parameters) {
		if (p.in !== "query") continue;
		const value = (values[p.name] || "").trim();
		if (value) query.set(p.name, value);
	}

	const qs = query.toString();
	return `${host}${filled}${qs ? `?${qs}` : ""}`;
};

/** Pretty-print a JSON response; leave anything else exactly as it came. */
const prettyJson = (text: string): string => {
	try {
		return JSON.stringify(JSON.parse(text), null, 2);
	} catch {
		return text;
	}
};

export default ApiExplorer;
