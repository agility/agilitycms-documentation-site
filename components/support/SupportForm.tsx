"use client";

import React, { useEffect, useState } from "react";

import { PRODUCT_AREAS } from "lib/support/productAreas";

/**
 * The support request form on /docs/support (website plans/36 §B1).
 *
 * Everything per-visitor arrives from /docs/api/support after mount, so the
 * page's HTML stays identical for every reader and the Netlify apex can cache it
 * (HOSTING.md). Who the visitor is comes from their Agility session on the
 * server; this component never sees or sends an email address.
 */

interface Instance {
	guid: string;
	name: string;
	orgName?: string;
}

interface Session {
	signedIn: boolean;
	resolved: boolean;
	firstName?: string;
	instances: Instance[];
	managerUrl?: string;
	configured: boolean;
}

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent"; ticketId: string } | { kind: "error"; message: string };

const SUPPORT_EMAIL = "support@agilitycms.com";

const FIELD_STYLE: React.CSSProperties = {
	background: "var(--bg)",
	border: "1px solid var(--border)",
	borderRadius: "var(--r-xs)",
	color: "var(--text)",
	fontSize: ".95rem",
};

const CARD_STYLE: React.CSSProperties = {
	background: "var(--surface)",
	border: "1px solid var(--border)",
	borderRadius: "var(--r-md)",
};

const BUTTON_STYLE: React.CSSProperties = {
	background: "var(--primary)",
	color: "var(--on-primary)",
	border: "none",
	borderRadius: "var(--r-xs)",
};

/** Sign in at Classic and come straight back here (the API explorer's pattern). */
const loginUrl = (managerUrl?: string): string => {
	const base = (managerUrl || "https://manager.agilitycms.com").replace(/\/$/, "");
	const here = typeof window === "undefined" ? "" : window.location.href;
	return `${base}/login?returnUrl=${encodeURIComponent(here)}`;
};

const ERRORS: Record<string, string> = {
	"signed-out": "Your Agility session has ended. Sign in again and resend.",
	invalid: "Add a subject and a description, then send again.",
	"invalid-instance": "That instance isn't on your account. Pick another, or choose \"Not about one instance\".",
	"not-configured": `Requests can't be sent from here yet. Email ${SUPPORT_EMAIL} and we'll pick it up.`,
};

const errorMessage = (code?: string): string =>
	(code && ERRORS[code]) || `Your request didn't go through. Try again, or email ${SUPPORT_EMAIL}.`;

const EmailUs = () => (
	<a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "var(--primary-text)" }}>
		{SUPPORT_EMAIL}
	</a>
);

export default function SupportForm() {
	const [session, setSession] = useState<Session | null>(null);
	const [subject, setSubject] = useState("");
	const [description, setDescription] = useState("");
	const [instanceGuid, setInstanceGuid] = useState("");
	const [productArea, setProductArea] = useState<string>(PRODUCT_AREAS[0]);
	const [critical, setCritical] = useState(false);
	const [status, setStatus] = useState<Status>({ kind: "idle" });

	useEffect(() => {
		let cancelled = false;
		fetch("/docs/api/support", { cache: "no-store" })
			.then((res) => (res.ok ? res.json() : null))
			.then((data: Session | null) => {
				if (cancelled) return;
				setSession(data ?? { signedIn: false, resolved: true, instances: [], configured: false });
				if (data?.instances?.length === 1) setInstanceGuid(data.instances[0].guid);
			})
			.catch(() => {
				if (!cancelled) setSession({ signedIn: false, resolved: true, instances: [], configured: false });
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const submit = async (e: React.FormEvent) => {
		e.preventDefault();
		setStatus({ kind: "sending" });
		try {
			const res = await fetch("/docs/api/support", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					subject,
					description,
					instanceGuid,
					productArea,
					critical,
					page: document.referrer || undefined,
				}),
			});
			const data = await res.json().catch(() => null);
			if (res.ok && data?.ok) setStatus({ kind: "sent", ticketId: data.ticketId });
			else setStatus({ kind: "error", message: errorMessage(data?.error) });
		} catch {
			setStatus({ kind: "error", message: errorMessage() });
		}
	};

	if (!session) {
		return (
			<div className="p-6" style={CARD_STYLE} aria-busy="true">
				<p style={{ color: "var(--text-2)" }}>Checking whether you&rsquo;re signed in…</p>
			</div>
		);
	}

	if (!session.signedIn) {
		return (
			<div className="p-6" style={CARD_STYLE}>
				<h2 className="text-lg font-semibold">Sign in to open a request</h2>
				<p className="mt-2" style={{ color: "var(--text-2)" }}>
					Sign in with your Agility account and we&rsquo;ll know who you are and which instances you
					work on, so you don&rsquo;t have to tell us. You&rsquo;ll come straight back here.
				</p>
				<div className="mt-5 flex flex-wrap items-center gap-4">
					<a href={loginUrl(session.managerUrl)} className="px-4 py-2 text-sm font-semibold" style={{ ...BUTTON_STYLE, textDecoration: "none" }}>
						Sign in to Agility
					</a>
					<span className="text-sm" style={{ color: "var(--text-2)" }}>
						No account? Email <EmailUs />.
					</span>
				</div>
			</div>
		);
	}

	if (!session.resolved || !session.configured) {
		return (
			<div className="p-6" style={CARD_STYLE}>
				<h2 className="text-lg font-semibold">Email us instead</h2>
				<p className="mt-2" style={{ color: "var(--text-2)" }}>
					We can&rsquo;t take requests on this page right now. Email <EmailUs /> and we&rsquo;ll pick it up
					from there.
				</p>
			</div>
		);
	}

	if (status.kind === "sent") {
		return (
			<div className="p-6" style={CARD_STYLE} role="status">
				<h2 className="text-lg font-semibold">Request received</h2>
				<p className="mt-2" style={{ color: "var(--text-2)" }}>
					Your request is in, reference <strong style={{ color: "var(--text)" }}>#{status.ticketId}</strong>.
					We&rsquo;ll reply by email to the address on your Agility account.
				</p>
				<button
					type="button"
					className="mt-5 px-4 py-2 text-sm font-semibold"
					style={BUTTON_STYLE}
					onClick={() => {
						setSubject("");
						setDescription("");
						setCritical(false);
						setStatus({ kind: "idle" });
					}}
				>
					Open another request
				</button>
			</div>
		);
	}

	const sending = status.kind === "sending";

	return (
		<form onSubmit={submit} className="p-6" style={CARD_STYLE}>
			<p style={{ color: "var(--text-2)" }}>
				{session.firstName ? `Hi ${session.firstName}. ` : ""}Tell us what&rsquo;s going on and we&rsquo;ll reply by
				email to the address on your Agility account.
			</p>

			<label className="mt-6 block text-sm font-semibold" htmlFor="support-subject">
				Subject
			</label>
			<input
				id="support-subject"
				required
				maxLength={200}
				value={subject}
				onChange={(e) => setSubject(e.target.value)}
				className="mt-1.5 w-full px-3 py-2"
				style={FIELD_STYLE}
			/>

			<div className="mt-5 grid gap-5 sm:grid-cols-2">
				<div>
					<label className="block text-sm font-semibold" htmlFor="support-instance">
						Instance
					</label>
					<select
						id="support-instance"
						value={instanceGuid}
						onChange={(e) => setInstanceGuid(e.target.value)}
						className="mt-1.5 w-full px-3 py-2"
						style={FIELD_STYLE}
					>
						<option value="">Not about one instance</option>
						{session.instances.map((i) => (
							<option key={i.guid} value={i.guid}>
								{i.name}
								{i.orgName ? ` (${i.orgName})` : ""}
							</option>
						))}
					</select>
				</div>
				<div>
					<label className="block text-sm font-semibold" htmlFor="support-area">
						Which part of Agility?
					</label>
					<select
						id="support-area"
						value={productArea}
						onChange={(e) => setProductArea(e.target.value)}
						className="mt-1.5 w-full px-3 py-2"
						style={FIELD_STYLE}
					>
						{PRODUCT_AREAS.map((a) => (
							<option key={a} value={a}>
								{a}
							</option>
						))}
					</select>
				</div>
			</div>

			<label className="mt-5 block text-sm font-semibold" htmlFor="support-description">
				What&rsquo;s happening?
			</label>
			<p className="mt-1 text-sm" style={{ color: "var(--text-2)" }}>
				What you expected, what happened instead, and the steps to see it. Links to the page or content item help.
			</p>
			<textarea
				id="support-description"
				required
				maxLength={10000}
				rows={8}
				value={description}
				onChange={(e) => setDescription(e.target.value)}
				className="mt-1.5 w-full px-3 py-2"
				style={FIELD_STYLE}
			/>

			<label className="mt-5 flex items-start gap-2.5 text-sm" htmlFor="support-critical">
				<input id="support-critical" type="checkbox" checked={critical} onChange={(e) => setCritical(e.target.checked)} className="mt-0.5" />
				<span>
					<strong>This is blocking us.</strong>{" "}
					<span style={{ color: "var(--text-2)" }}>For example, the site is down or no one can publish.</span>
				</span>
			</label>

			{status.kind === "error" && (
				<p className="mt-5 text-sm" role="alert" style={{ color: "var(--warn)" }}>
					{status.message}
				</p>
			)}

			<button
				type="submit"
				disabled={sending}
				className="mt-6 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
				style={BUTTON_STYLE}
			>
				{sending ? "Sending…" : "Send request"}
			</button>
		</form>
	);
}
