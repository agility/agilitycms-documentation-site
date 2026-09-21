"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import { OpenApiParameter } from "lib/api-specs/types";
import ParamInput, { LocaleOption } from "components/api-reference/ParamInput";
import { requiredFirst } from "lib/api-specs/resolveParams";

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
	/** False when this operation isn't on the runner's allowlist. */
	runnable: boolean;
	/** Why it isn't runnable, when it isn't. */
	notRunnableReason?: string;
	/**
	 * How the request is made.
	 *
	 * "direct" — straight from the browser to api.aglty.io with a fetch key.
	 * "proxy"  — through /api/explorer/mgmt-request, because the Management
	 *            API's bearer token must never reach the browser. See the note
	 *            on that route.
	 */
	transport: "direct" | "proxy";
	/** Operation slug; how the proxy identifies what to run. */
	slug: string;
	/** False for operations that act on the caller, not on an instance. */
	instanceScoped: boolean;
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
	/** Classic host to build the sign-in link against. */
	managerUrl?: string;
}

interface RunResult {
	status: number;
	statusText: string;
	durationMs: number;
	body: string;
	rateLimitRemaining?: string | null;
}

/**
 * Sign-in link that lands the reader back on the page they were reading.
 *
 * Classic's own pattern, lifted from the Manager app's LoginRequired.tsx:
 * `{managerUrl}/login?returnUrl={encodeURIComponent(href)}`. Classic stores the
 * returnUrl in its OWIN AuthenticationProperties and shows Auth0 only its own
 * registered callback, so no Auth0 redirect_uri has to be added for /docs.
 *
 * Coming back signed in is enough on its own — the auth cookie is scoped to
 * `.agilitycms.com`, so /docs sees it without any token exchange.
 */
const loginUrl = (managerUrl?: string): string => {
	const base = (managerUrl || "https://manager.agilitycms.com").replace(/\/$/, "");
	const here = typeof window === "undefined" ? "" : window.location.href;
	return `${base}/login?returnUrl=${encodeURIComponent(here)}`;
};

/** Region infix from an instance GUID — mirrors lib/api-specs/registry.ts. */
const REGION_INFIX: Record<string, string> = {
	u: "",
	c: "-ca",
	e: "-eu",
	a: "-aus",
	us2: "-usa2",
	d: "-dev",
};

/**
 * The last instance the reader chose, remembered across pages and visits.
 *
 * Only the GUID — never the key. A GUID is an identifier that already appears
 * in client bundles and URLs; the key is a credential and stays in memory for
 * the life of the component (see the note at the top of this file). Every
 * access is wrapped because storage throws in a private window or with site
 * data blocked, and the explorer has to work regardless.
 */
const REMEMBERED_GUID_KEY = "aglty-explorer-instance";

const readRememberedGuid = (): string => {
	try {
		return window.localStorage.getItem(REMEMBERED_GUID_KEY) || "";
	} catch {
		return "";
	}
};

const rememberGuid = (guid: string): void => {
	try {
		if (guid) window.localStorage.setItem(REMEMBERED_GUID_KEY, guid);
		else window.localStorage.removeItem(REMEMBERED_GUID_KEY);
	} catch {
		/* private window or blocked storage — the picker still works */
	}
};

/** Stable empty array — a fresh [] each render would churn every memo on it. */
const EMPTY_LOCALES: LocaleOption[] = [];

const regionOf = (guid: string): string => {
	const suffix = (guid || "").split("-").pop()?.toLowerCase() || "u";
	return REGION_INFIX[suffix] ?? "";
};

/**
 * The host the request will actually hit, for the URL preview.
 *
 * Both APIs are addressed per region off the instance GUID, and they use the
 * same infixes on different names — api-eu / mgmt-eu. Showing the wrong one
 * would be a small lie in the one place the reader is looking to learn the
 * shape of the call.
 */
const hostFor = (transport: "direct" | "proxy", guid: string, fallback: string): string => {
	if (!guid) return fallback;
	return transport === "proxy"
		? `https://mgmt${regionOf(guid)}.aglty.io`
		: `https://api${regionOf(guid)}.aglty.io`;
};

const ApiExplorer = ({
	path,
	method,
	parameters,
	defaultHost,
	runnable,
	notRunnableReason,
	transport,
	slug,
	instanceScoped,
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
	// A key is only ever fetched for the direct (Fetch API) transport. The
	// proxy transport authenticates server-side, so there is nothing to load.
	const needsKey = transport === "direct";
	const loadingKey = needsKey && isGuidShaped(guid) && !forCurrentGuid;
	/** Everything needed to send: a key when direct, an instance when scoped. */
	const ready = needsKey ? !!apiKey : !instanceScoped || !!guid;
	/**
	 * Locales are stored WITH the instance they came from, and read back only
	 * while the two still agree — the same shape as `keyState` above, for the
	 * same reason.
	 *
	 * Holding them in a bare array meant that changing instance left the
	 * PREVIOUS instance's locales on screen until the new fetch resolved, and
	 * left them there permanently if it failed or came back empty. That is not
	 * a cosmetic problem: `effectiveLocale` would then keep a locale the new
	 * instance doesn't have, and a wrong locale returns an empty result rather
	 * than an error — the precise failure this whole feature exists to avoid.
	 *
	 * Pairing them means switching instance drops straight back to the
	 * free-text fallback until the real list arrives, and a late response for
	 * an instance the reader has already moved off is ignored.
	 */
	const [localeState, setLocaleState] = useState<{
		guid: string;
		locales: LocaleOption[];
	} | null>(null);

	// Empty unless the stored locales belong to the instance currently selected.
	const locales = localeState?.guid === guid ? localeState.locales : EMPTY_LOCALES;
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
				const usable = (data.instances || []).filter((i: Instance) => !i.isDormant);
				// Prefer the instance they last used, if they still have access to
				// it; otherwise pre-select only when there is no choice to make.
				const remembered = readRememberedGuid();
				const match = usable.find((i: Instance) => i.guid === remembered);
				if (match) setGuid(match.guid);
				else if (usable.length === 1) setGuid(usable[0].guid);
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
		if (!needsKey || !guid || !isGuidShaped(guid)) return;

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
	}, [guid, needsKey]);

	// Remember the choice, and load that instance's OWN locales. Guessing the
	// locale is a real failure mode: a wrong one returns an empty result rather
	// than an error, which reads as "the API is broken".
	useEffect(() => {
		if (!guid || !isGuidShaped(guid)) return;
		rememberGuid(guid);

		let cancelled = false;
		fetch(`/docs/api/explorer/locales?guid=${encodeURIComponent(guid)}`, { cache: "no-store" })
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				if (cancelled) return;
				// Recorded even when the list is empty, so "we asked and this
				// instance has none" is distinguishable from "we haven't asked
				// yet" — otherwise a failed lookup would leave the previous
				// instance's locales on screen indefinitely.
				setLocaleState({ guid, locales: Array.isArray(data?.locales) ? data.locales : [] });
			})
			.catch(() => {
				if (!cancelled) setLocaleState({ guid, locales: [] });
			});
		return () => {
			cancelled = true;
		};
	}, [guid]);

	/**
	 * The locale actually used, DERIVED rather than stored.
	 *
	 * Carrying "en-us" over to an instance that is fr-ca only would silently
	 * return nothing — a wrong locale is not an error, just an empty result, so
	 * it reads as a broken API. Deriving means the field corrects itself the
	 * moment the instance's locales arrive, with no effect writing back into
	 * state and no render showing a value the instance doesn't have.
	 */
	const effectiveLocale = useMemo(() => {
		const current = values.locale || "";
		if (locales.length === 0) return current;
		if (current && locales.some((l) => l.code === current)) return current;
		return locales[0].code;
	}, [values.locale, locales]);

	// Path params are filled from the instance picker where we know the answer
	// (`guid`), and pinned where only one value is valid (`apitype`: we issue
	// published-content keys, so `preview` would 401).
	const effectiveValues = useMemo(
		() => ({
			...values,
			...(guid ? { guid } : {}),
			// Fetch-API only: we issue published-content keys, so `preview`
			// would 401. The Management API has no such parameter.
			...(transport === "direct" ? { apitype: "fetch" } : {}),
			locale: effectiveLocale,
		}),
		[values, guid, effectiveLocale, transport]
	);

	const requestUrl = useMemo(
		() => buildUrl(hostFor(transport, guid, defaultHost), path, parameters, effectiveValues),
		[transport, guid, defaultHost, path, parameters, effectiveValues]
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
		if (!ready) return;
		setRunning(true);
		setRunError(null);
		setResult(null);
		const started = performance.now();

		try {
			// PROXY — Management API. The server mints the bearer token, rebuilds
			// the path from the spec and makes the call; we send a slug and
			// values, never a URL. See app/api/explorer/mgmt-request/route.ts.
			if (transport === "proxy") {
				const res = await fetch("/docs/api/explorer/mgmt-request", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ slug, values: effectiveValues }),
				});
				const data = await res.json().catch(() => null);

				// Our own route failing (403, 401, 502) is a different thing from
				// the Management API answering with an error, and conflating them
				// would tell the reader their request was rejected when in fact it
				// never ran.
				if (!res.ok || !data || typeof data.status !== "number") {
					setRunError(data?.error || "The request could not be sent.");
					return;
				}

				setResult({
					status: data.status,
					statusText: data.statusText || "",
					durationMs: data.durationMs ?? Math.round(performance.now() - started),
					body: data.body || "",
					rateLimitRemaining: null,
				});
				return;
			}

			// DIRECT — Fetch API, browser to api.aglty.io.
			if (!apiKey) return;
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
			// extension blocking the call — CORS is known-good for both APIs.
			setRunError("The request could not be sent. Check your connection and try again.");
		} finally {
			setRunning(false);
		}
	}, [ready, transport, slug, effectiveValues, apiKey, requestUrl, method]);

	// Required first: a flat list of fifteen inputs gives no clue which three
	// must actually be filled in.
	const editable = requiredFirst(
		parameters.filter((p) => p.name !== "guid" && p.name !== "apitype")
	);

	return (
		<section
			className="overflow-hidden"
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
						{instanceScoped ? (
							<InstancePicker
								session={session}
								guid={guid}
								onChange={setGuid}
								loadingKey={loadingKey}
								keyError={keyError}
								hasKey={!!apiKey}
								needsKey={needsKey}
							/>
						) : (
							// users/me and types act on the caller, not on an
							// instance — asking which instance would be noise, and
							// answering it would change nothing.
							<p className="text-xs" style={{ color: "var(--muted)", margin: 0 }}>
								{session?.signedIn
									? "Runs as you — this operation isn't tied to an instance."
									: "Sign in to Agility to run this."}
							</p>
						)}

						{editable.length > 0 && (
							<div className="mt-4 grid gap-3 sm:grid-cols-2">
								{editable.map((param) => (
									<label key={`${param.in}-${param.name}`} className="block min-w-0">
										<span
											className="mb-1 flex flex-wrap items-baseline gap-x-1.5"
											style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "var(--muted)" }}
										>
											<span style={{ color: "var(--text)" }}>{param.name}</span>
											{/* Optional is stated in words, not just by the ABSENCE of a
											    red asterisk. Fifteen inputs where three are required is
											    the common case here, and "no marker" is far too quiet a
											    signal for "you can leave this alone". */}
											{param.required ? (
												<span style={{ color: "var(--err)" }}>required</span>
											) : (
												<span style={{ opacity: 0.75 }}>optional</span>
											)}
											<span style={{ opacity: 0.75 }}>· {param.in}</span>
										</span>
										<ParamInput
											param={param}
											value={effectiveValues[param.name] || ""}
											onChange={(v) => setValues((prev) => ({ ...prev, [param.name]: v }))}
											locales={locales}
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
								disabled={!ready || running || missing.length > 0}
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

							{missing.length > 0 && ready && (
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
	needsKey,
}: {
	session: SessionState | null;
	guid: string;
	onChange: (guid: string) => void;
	loadingKey: boolean;
	keyError: string | null;
	hasKey: boolean;
	/** Direct transport only — the proxy authenticates server-side. */
	needsKey: boolean;
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
					{/* Also shown when signedIn is true but resolved is false: a stale
					    cookie reads as signed in until Classic is asked, and telling
					    someone in that state that they have no instances would be
					    both wrong and unactionable. Signing in again fixes it. */}
					{(!session.signedIn || !session.resolved) && (
						<p className="mt-2 text-xs" style={{ color: "var(--muted)", margin: ".5rem 0 0" }}>
							<a
								href={loginUrl(session.managerUrl)}
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

			<p
				className="mt-2 text-xs"
				style={{
					color: keyError ? "var(--err)" : hasKey || (!needsKey && guid) ? "var(--ok)" : "var(--muted)",
					margin: ".5rem 0 0",
				}}
			>
				{!needsKey
					? guid
						? "Ready — runs read-only against this instance, as you."
						: "Choose an instance."
					: loadingKey
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
		// An <input type="datetime-local"> yields "2026-09-21T14:30" — local time,
		// no zone. Sending that as-is makes the API interpret it as UTC and the
		// reader gets results off by their offset. Normalise to a real ISO
		// instant, which is what a date-time parameter means.
		if (value) query.set(p.name, isLocalDateTime(value) ? new Date(value).toISOString() : value);
	}

	const qs = query.toString();
	return `${host}${filled}${qs ? `?${qs}` : ""}`;
};

/** "2026-09-21T14:30" or with seconds — the datetime-local wire format. */
const isLocalDateTime = (v: string): boolean => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(v);

/** Pretty-print a JSON response; leave anything else exactly as it came. */
const prettyJson = (text: string): string => {
	try {
		return JSON.stringify(JSON.parse(text), null, 2);
	} catch {
		return text;
	}
};

export default ApiExplorer;
