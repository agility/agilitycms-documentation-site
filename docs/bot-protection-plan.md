# Plan: switching Vercel Bot Protection from Log to Challenge

Status: **on hold** (2026-10-29). Nothing below has been done yet. Bot Protection stays in Log mode until this plan is carried out.

## Background

- On 2026-10-20 13:22 UTC, the Vercel Bot Protection managed ruleset was turned on in **Log** mode for `agilitycms-documentation-site` (project `prj_JTVfe5RE34c7vgvWw2T9QO2wXPTs`, team `agility-cms`). This followed a harmless SQL-injection scanner spike from `3.124.228.43` (AWS Frankfurt) that hit the raw `agilitycms-documentation-site.vercel.app` hostname.
- The active firewall config also has the OWASP groups `sqli`, `xss`, `rce` and `gen` in Log mode. There are no custom rules and no IP bypasses.
- The original idea was to add bypasses for legitimate traffic, switch Bot Protection to **Challenge**, and redirect the raw `vercel.app` hostname to `docs.agilitycms.com`.

## What the logs showed (2026-10-20 13:22 to 2026-10-29 13:13 UTC)

Bot Protection logged **174,355** requests, about 15–28k a day.

| Traffic | Logged | Notes |
|---|---|---|
| `agilitycms-documentation-site.vercel.app` from Amazon IPs | 146,897 | **This is the agilitycms.com/docs proxy.** agilitycms.com is on Netlify, and `Agility-Website-Nextjs/public/_redirects` lines 16–17 proxy `/docs` and `/docs/*` to this hostname. Netlify makes those requests from AWS IPs, so real readers look like bots. |
| `docs.agilitycms.com`: `/docs/api/mcp` and the MCP OAuth discovery URLs (`/.well-known/oauth-*`, `/docs/api/mcp/.well-known/*`) | ~12,500 | MCP clients (e.g. `codex-mcp-client`). 11,163 from one RISQ (Quebec) IP. Verified agents such as `claude-user` were not logged. |
| `vercel.app` from Tencent | 7,402 | Probably a scraper. Fine to challenge. |
| Pingdom | 2,579 | Uptime monitor. 977 of these were marked unverified. |
| `*.publishwithagility.com` preview deploys | ~1,400 | Branch previews. |
| Named crawlers and SEO tools | thousands | Semrush, Ahrefs, Meta, OpenAI, Bytespider and others. |

`/docs/api/article-md/` didn't show up in the top paths, but it should be bypassed anyway. The `agilitybot` user agent (Agility's own crawler) was logged 4,727 times.

## Why the original plan would break things

- **Challenge mode as-is breaks agilitycms.com/docs.** A challenge is a JavaScript page. Netlify's proxy can't complete it, so almost every reader would get a broken page.
- **Challenge mode as-is breaks the docs MCP.** MCP clients, including the Agility CMS Knowledgebase connector, can't complete a challenge either.
- **Redirecting `agilitycms-documentation-site.vercel.app` to `docs.agilitycms.com` breaks the proxy.** It's the proxy's target, so readers on agilitycms.com/docs would be bounced or stuck. It would also break the preview links the authoring skill gives out (`.claude/skills/authoring-agility-docs/SKILL.md`).

## The plan

### 1. Mark the proxy's requests (Agility-Website-Nextjs, Netlify)

`_redirects` can't add request headers to a proxy rule, but `netlify.toml` can.

- Remove the two `#doc site proxy` lines from `public/_redirects`. `_redirects` rules run before `netlify.toml` rules, so leaving them in would win.
- Add the equivalent rules to `netlify.toml`, with a secret header:

  ```toml
  [[redirects]]
    from = "/docs"
    to = "https://agilitycms-documentation-site.vercel.app/docs"
    status = 200
    force = true
    headers = { X-Docs-Proxy = "<secret>" }

  [[redirects]]
    from = "/docs/*"
    to = "https://agilitycms-documentation-site.vercel.app/docs/:splat"
    status = 200
    force = true
    headers = { X-Docs-Proxy = "<secret>" }
  ```

- Generate a long random value for the secret. Keep it out of git if possible (a Netlify build-time substitution), or accept that it's in a private repo. It only skips bot checks; it doesn't grant access to anything.
- Check the deploy preview: agilitycms.com/docs pages, search, the `/docs/api/*` routes and preview mode all still work.

### 2. Add bypass rules (Vercel firewall, free)

Custom rules with action **bypass** for Bot Protection:

1. Header `x-docs-proxy` equals the secret: the agilitycms.com/docs proxy.
2. Path starts with `/docs/api/mcp`: the docs MCP.
3. Path starts with `/.well-known/`: MCP OAuth discovery.
4. Path starts with `/docs/api/article-md/`: the Markdown endpoint for agents.
5. User agent contains `Pingdom`: uptime monitoring. Check whether any other monitors are in use and add them too.
6. Optional: user agent `agilitybot`, if that crawler should keep working.

Previews: either bypass hostnames ending in `.publishwithagility.com`, or leave them challenged, since people open them in a browser and can pass a challenge.

Then **leave Bot Protection in Log mode for 2–3 days** and re-run the queries below. The proxy and MCP rows should disappear from the logged traffic. What's left should be traffic you're happy to challenge.

### 3. Switch Bot Protection to Challenge

- Only after step 2's logs look clean.
- Watch for a day: PostHog `docs_search` and `docs_mcp_tool_call` volumes, the PostHog low-confidence and fallback alerts, Pingdom status, and the firewall's challenge counts.
- Challenged traffic isn't billed.

### 4. Lock down the raw hostname

Once the proxy is marked, any traffic to `agilitycms-documentation-site.vercel.app` **without** the header isn't a reader on agilitycms.com, so the scanner can be dealt with safely. Two options:

- **Challenge it:** a custom rule on hostname `agilitycms-documentation-site.vercel.app` with no `x-docs-proxy` header, action challenge. Safer.
- **Redirect it** to `https://docs.agilitycms.com` under the same condition. Do this in `proxy.ts` or as a firewall redirect, never as a Vercel domain-level redirect, because that would also redirect the proxy.

Before either one, change the preview link in `.claude/skills/authoring-agility-docs/SKILL.md` (and anywhere else that uses `agilitycms-documentation-site.vercel.app`) to `docs.agilitycms.com`, and check that preview mode works there. A known open issue is that preview fails through agilitycms.com but works directly.

### 5. Optional: the OWASP rule groups

`sqli`, `xss`, `rce` and `gen` are still in Log mode. Review what they logged (filter `rule_category`) before moving any to Deny. Same caution: the proxy and the MCP have to pass.

## Rollback

Each step can be undone independently. The firewall config is versioned in the Vercel dashboard. Switching Bot Protection back to Log, or deleting a custom rule, takes effect within seconds. On Netlify, rolling back the deploy restores the old `_redirects`.

## How to re-run the analysis

```bash
vercel --scope agility-cms metrics vercel.firewall_action.count \
  -p agilitycms-documentation-site -s 3d -g 1d -l 200 --json \
  -f "waf_rule_id eq 'managed_bot_protection'" \
  --group-by request_hostname --group-by asn_name
```

Useful `--group-by` dimensions: `request_path`, `bot_name`, `bot_category`, `bot_verified`, `client_user_agent`, `client_ip`, `waf_action`, `waf_rule_id`. Read the active config with:

```bash
vercel --scope agility-cms api "/v1/security/firewall/config/active?projectId=prj_JTVfe5RE34c7vgvWw2T9QO2wXPTs&teamId=team_UNpzObkeavoCnysUgOZYDJAm"
```

(The Vercel MCP's `get_firewall_config` and observability tools returned 404 for this project on 2026-10-29. Use the CLI.)
