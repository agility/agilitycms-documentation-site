/*
  Server-side analytics for AI agents and crawlers reading the docs.

  The browser tracker (lib/analytics/posthog.ts) can't see these visitors: an
  agent fetching /docs/llms.txt or an article's .md twin never runs JavaScript.
  So the request itself is reported, from the two places every such request
  passes through on its way into this app: proxy.ts (pages, .md twins,
  llms.txt) and the MCP route handler (/api/mcp, which the proxy skips).

  What this can and can't see:
  - agilitycms.com (Netlify) caches docs HTML for up to an hour in front of
    this app, so a bot re-reading a popular page within that window is answered
    at the edge and never reaches us. HTML counts are therefore a FLOOR. The
    .md twins and llms.txt are only edge-cached for 60 seconds and MCP calls
    are never cached, so for the agent-specific endpoints coverage is close to
    complete. See HOSTING.md for the cache headers.
  - User agents can be spoofed, and some assistants browse with an ordinary
    browser UA. Classification is a best effort over published crawler names.

  Privacy: one fixed distinct_id per agent ("agent:GPTBot"), person profiles
  off, no IP, no cookies, and only production sends anything. Human page views
  are left to the browser tracker so nothing is counted twice.

  Never throws and never delays a response: callers hand the returned promise
  to waitUntil()/after(), and every failure is swallowed.
*/

export type AgentCategory =
	| "ai-training" // crawls to train models
	| "ai-search" // builds an AI search/answer index
	| "ai-assistant" // fetches a page because a person asked an assistant to
	| "search-engine"
	| "seo-tool"
	| "http-client" // scripts and SDKs: curl, python-requests, node fetch…
	| "other-bot";

export type EndpointType = "markdown" | "llms-txt" | "mcp" | "html";

interface AgentRule {
	pattern: RegExp;
	agent: string;
	operator: string;
	category: AgentCategory;
}

// Order matters: the first match wins, so specific names come before the
// generic bot/crawler fallbacks at the end. Names are the published user-agent
// tokens of each crawler.
const AGENT_RULES: AgentRule[] = [
	// OpenAI
	{ pattern: /ChatGPT-User/i, agent: "ChatGPT-User", operator: "OpenAI", category: "ai-assistant" },
	{ pattern: /OAI-SearchBot/i, agent: "OAI-SearchBot", operator: "OpenAI", category: "ai-search" },
	{ pattern: /GPTBot/i, agent: "GPTBot", operator: "OpenAI", category: "ai-training" },
	// Anthropic
	{ pattern: /Claude-User/i, agent: "Claude-User", operator: "Anthropic", category: "ai-assistant" },
	{ pattern: /Claude-SearchBot/i, agent: "Claude-SearchBot", operator: "Anthropic", category: "ai-search" },
	{ pattern: /ClaudeBot|anthropic-ai/i, agent: "ClaudeBot", operator: "Anthropic", category: "ai-training" },
	// Perplexity
	{ pattern: /Perplexity-User/i, agent: "Perplexity-User", operator: "Perplexity", category: "ai-assistant" },
	{ pattern: /PerplexityBot/i, agent: "PerplexityBot", operator: "Perplexity", category: "ai-search" },
	// Others
	{ pattern: /MistralAI-User/i, agent: "MistralAI-User", operator: "Mistral", category: "ai-assistant" },
	{ pattern: /DuckAssistBot/i, agent: "DuckAssistBot", operator: "DuckDuckGo", category: "ai-assistant" },
	{ pattern: /meta-externalfetcher/i, agent: "Meta-ExternalFetcher", operator: "Meta", category: "ai-assistant" },
	{ pattern: /meta-externalagent/i, agent: "Meta-ExternalAgent", operator: "Meta", category: "ai-training" },
	{ pattern: /cohere-ai|cohere-training/i, agent: "Cohere", operator: "Cohere", category: "ai-training" },
	{ pattern: /Bytespider/i, agent: "Bytespider", operator: "ByteDance", category: "ai-training" },
	{ pattern: /CCBot/i, agent: "CCBot", operator: "Common Crawl", category: "ai-training" },
	{ pattern: /Amazonbot/i, agent: "Amazonbot", operator: "Amazon", category: "ai-training" },
	{ pattern: /Applebot/i, agent: "Applebot", operator: "Apple", category: "search-engine" },
	{ pattern: /YouBot/i, agent: "YouBot", operator: "You.com", category: "ai-search" },
	{ pattern: /Diffbot/i, agent: "Diffbot", operator: "Diffbot", category: "ai-training" },
	// Search engines (Bing's index also grounds Copilot)
	{ pattern: /Googlebot|Google-InspectionTool|GoogleOther/i, agent: "Googlebot", operator: "Google", category: "search-engine" },
	{ pattern: /bingbot|BingPreview/i, agent: "Bingbot", operator: "Microsoft", category: "search-engine" },
	{ pattern: /DuckDuckBot/i, agent: "DuckDuckBot", operator: "DuckDuckGo", category: "search-engine" },
	{ pattern: /YandexBot/i, agent: "YandexBot", operator: "Yandex", category: "search-engine" },
	{ pattern: /Baiduspider/i, agent: "Baiduspider", operator: "Baidu", category: "search-engine" },
	// SEO tools
	{ pattern: /AhrefsBot/i, agent: "AhrefsBot", operator: "Ahrefs", category: "seo-tool" },
	{ pattern: /SemrushBot/i, agent: "SemrushBot", operator: "Semrush", category: "seo-tool" },
	{ pattern: /MJ12bot/i, agent: "MJ12bot", operator: "Majestic", category: "seo-tool" },
	{ pattern: /DotBot/i, agent: "DotBot", operator: "Moz", category: "seo-tool" },
	// Scripts and SDKs (often agents and coding tools fetching docs)
	{ pattern: /^curl\//i, agent: "curl", operator: "", category: "http-client" },
	{ pattern: /python-requests|python-httpx|aiohttp|Python-urllib/i, agent: "python", operator: "", category: "http-client" },
	{ pattern: /node-fetch|undici|axios|^node$/i, agent: "node", operator: "", category: "http-client" },
	{ pattern: /Go-http-client/i, agent: "go", operator: "", category: "http-client" },
	{ pattern: /^Wget/i, agent: "wget", operator: "", category: "http-client" },
	// Generic fallback for anything that announces itself as a bot
	{ pattern: /bot\b|crawler|spider|slurp/i, agent: "other-bot", operator: "", category: "other-bot" },
];

export interface AgentMatch {
	agent: string;
	operator: string;
	category: AgentCategory;
}

/** Identify a known agent or bot from a user agent, or null for a regular browser. */
export function classifyAgent(userAgent: string | null | undefined): AgentMatch | null {
	if (!userAgent) return null;
	for (const rule of AGENT_RULES) {
		if (rule.pattern.test(userAgent)) {
			return { agent: rule.agent, operator: rule.operator, category: rule.category };
		}
	}
	return null;
}

/** Which docs surface a request is for. `pathname` excludes the /docs basePath. */
export function endpointType(pathname: string): EndpointType | null {
	if (pathname === "/llms.txt") return "llms-txt";
	if (pathname.startsWith("/api/mcp")) return "mcp";
	if (pathname.endsWith(".md")) return "markdown";
	// Other files (images, the IndexNow key…) and the rest of /api aren't reading.
	if (pathname.startsWith("/api/") || pathname.startsWith("/_next") || pathname.includes(".")) return null;
	return "html";
}

/**
 * The agent endpoints are reported whatever the user agent, since everything
 * reading them is a program. HTML is reported only for identified bots: human
 * page views already reach PostHog from the browser.
 */
export function shouldReport(endpoint: EndpointType | null, match: AgentMatch | null): boolean {
	if (!endpoint) return false;
	if (endpoint === "html") return match !== null;
	return true;
}

const isProduction = () =>
	process.env.VERCEL_ENV ? process.env.VERCEL_ENV === "production" : process.env.NODE_ENV === "production";

const posthogHost = () => {
	const host = process.env.POSTHOG_API_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || "";
	// A relative client host (a reverse-proxy path like "/ingest") is useless
	// from the server; fall back to PostHog's US ingestion host.
	return /^https?:\/\//.test(host) ? host.replace(/\/+$/, "") : "https://us.i.posthog.com";
};

/**
 * Report one request to PostHog as a `docs_agent_request` event when it is
 * worth reporting. Resolves (never rejects) once sent, skipped or failed.
 */
export async function reportAgentRequest(input: {
	pathname: string;
	userAgent: string | null;
	method: string;
}): Promise<void> {
	try {
		const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
		if (!key || !isProduction()) return;

		const endpoint = endpointType(input.pathname);
		const match = classifyAgent(input.userAgent);
		if (!shouldReport(endpoint, match)) return;

		const agent = match?.agent ?? "unidentified";
		await fetch(`${posthogHost()}/i/v0/e/`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				api_key: key,
				event: "docs_agent_request",
				distinct_id: `agent:${agent}`,
				properties: {
					agent,
					agent_operator: match?.operator || null,
					agent_category: match?.category ?? "unidentified",
					endpoint,
					// The docs path as readers see it, so it lines up with $pathname
					// on browser pageviews.
					path: `/docs${input.pathname === "/" ? "" : input.pathname}`,
					method: input.method,
					user_agent: (input.userAgent || "").slice(0, 300),
					$process_person_profile: false,
					$lib: "docs-server",
				},
			}),
			signal: AbortSignal.timeout(2000),
		});
	} catch {
		// Analytics must never affect serving.
	}
}

/**
 * Report one Knowledgebase MCP tool call as a `docs_mcp_tool_call` event.
 * The query is what an agent searched the docs for, so zero-hit searches are
 * a direct list of content gaps. Same no-throw, production-only contract as
 * reportAgentRequest.
 */
export async function reportMcpToolCall(input: {
	tool: string;
	args: Record<string, unknown>;
	success: boolean;
	durationMs: number;
}): Promise<void> {
	try {
		const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
		if (!key || !isProduction()) return;

		const { query, objectID, hits, blocked } = input.args as Record<string, unknown>;
		await fetch(`${posthogHost()}/i/v0/e/`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				api_key: key,
				event: "docs_mcp_tool_call",
				distinct_id: "agent:mcp",
				properties: {
					tool: input.tool,
					query: typeof query === "string" ? query.slice(0, 200) : null,
					object_id: typeof objectID === "string" ? objectID : null,
					hits: typeof hits === "number" ? hits : null,
					zero_results: hits === 0,
					blocked: typeof blocked === "string" ? blocked : null,
					success: input.success,
					duration_ms: Math.round(input.durationMs),
					$process_person_profile: false,
					$lib: "docs-server",
				},
			}),
			signal: AbortSignal.timeout(2000),
		});
	} catch {
		// Analytics must never affect serving.
	}
}
