# Application Insights Integration

This document describes the Application Insights telemetry integration for the Agility Knowledgebase MCP Server.

## Overview

The MCP server is integrated with Azure Application Insights (resource: **Agility-Docs-MCP-Server**) to provide monitoring and telemetry. This integration tracks:

1. **MCP Tool Calls** — Every `search_docs` and `fetch_doc` invocation with timing, arguments, and success/failure status
2. **Algolia Dependencies** — Every search and getObject call to Algolia with duration and result counts
3. **Errors and Exceptions** — Automatic tracking of errors with stack traces and context
4. **Performance Metrics** — Auto-collected performance data, exceptions, and console logs

## Configuration

### Environment Variable

Set `AZURE_APP_INSIGHTS_CONNECTION_STRING` in your `.env.local` file (for local dev) and in Vercel (for production):

```bash
AZURE_APP_INSIGHTS_CONNECTION_STRING=InstrumentationKey=...;IngestionEndpoint=https://...
```

You can find your connection string in the Azure Portal under the **Agility-Docs-MCP-Server** Application Insights resource.

### Graceful Degradation

If the connection string is not set, the application runs normally with telemetry disabled. A warning will be logged to the console.

## What Gets Tracked

### 1. MCP Tool Calls

Every MCP tool invocation is tracked as both a **Request** and a **Custom Event**:

**Request** (visible in Performance blade):
- **Name**: `MCP Tool: search_docs` or `MCP Tool: fetch_doc`
- **URL**: `/mcp-tool/{tool_name}`
- **Duration**: End-to-end time for the tool call
- **Result Code**: 200 for success, 500 for errors

**Custom Event** (`MCPToolCall`):
- **Properties**:
  - `toolName`: `search_docs` or `fetch_doc`
  - `arguments`: JSON string of the input arguments (query, page, objectID)
  - `success`: Whether the call succeeded
  - `error` / `errorStack`: Error details if the call failed
- **Measurements**:
  - `duration`: Time taken in milliseconds

### 2. Algolia Dependencies

Every Algolia API call is tracked as a **Dependency**:
- **Type**: `Algolia`
- **Name**: `Algolia: search` or `Algolia: getObject`
- **Data**: The search query or objectID
- **Duration**: Time for the Algolia call specifically
- **Properties**:
  - `operation`: `search` or `getObject`
  - `query`: The search query or objectID
  - `resultCount`: Number of results returned
  - `success`: Whether the call succeeded

### 3. Exceptions

Errors are tracked with full context:
- **Exception**: The error object with stack trace
- **Properties**: `toolName` and the relevant query/objectID for debugging

## Viewing Telemetry in Azure

### Application Insights Dashboard

1. Navigate to **Agility-Docs-MCP-Server** in the Azure Portal
2. **Transaction search** — See individual MCP tool calls and Algolia dependencies
3. **Performance** — View timing analysis for tool calls
4. **Failures** — Monitor errors and exceptions
5. **Application map** — Visualize the MCP server → Algolia dependency

### KQL Queries

Use the **Logs** section to run custom queries:

#### MCP Tool Usage Over Time
```kusto
customEvents
| where name == "MCPToolCall"
| summarize count() by tostring(customDimensions.toolName), bin(timestamp, 1h)
| order by timestamp desc
```

#### Most Popular Search Queries
```kusto
customEvents
| where name == "MCPToolCall" and customDimensions.toolName == "search_docs"
| extend args = parse_json(tostring(customDimensions.arguments))
| summarize count() by tostring(args.query)
| order by count_ desc
| take 20
```

#### Failed Tool Calls
```kusto
customEvents
| where name == "MCPToolCall" and customDimensions.success == "false"
| project timestamp, tool=customDimensions.toolName, error=customDimensions.error, args=customDimensions.arguments
| order by timestamp desc
```

#### Algolia Response Times
```kusto
dependencies
| where type == "Algolia"
| summarize avg(duration), percentile(duration, 95), count() by name
| order by count_ desc
```

#### End-to-End Tool Call Performance
```kusto
requests
| where name startswith "MCP Tool:"
| summarize avg(duration), percentile(duration, 95), count() by name, bin(timestamp, 1h)
| order by timestamp desc
```

#### Documents Fetched Most Often
```kusto
customEvents
| where name == "MCPToolCall" and customDimensions.toolName == "fetch_doc"
| extend args = parse_json(tostring(customDimensions.arguments))
| summarize count() by tostring(args.objectID)
| order by count_ desc
| take 20
```

## Implementation Details

### Files

| File | Purpose |
|---|---|
| `lib/telemetry.ts` | Core telemetry module — initialization, tracking functions |
| `app/api/mcp/route.ts` | MCP route — calls tracking functions for each tool |

### Key Functions

- `initializeTelemetry()` — Initializes Application Insights (idempotent, called at module load)
- `trackMcpToolCall()` — Tracks an MCP tool invocation as request + custom event
- `trackAlgoliaCall()` — Tracks an Algolia API call as a dependency
- `trackException()` — Tracks an exception with context properties
- `flushTelemetry()` — Flushes pending telemetry (for graceful shutdown)

## Troubleshooting

### Telemetry Not Appearing

1. **Check connection string** — Verify `AZURE_APP_INSIGHTS_CONNECTION_STRING` is set in both `.env.local` and Vercel
2. **Console logs** — Look for "Application Insights telemetry initialized" on startup
3. **Delays** — Telemetry may take 1-2 minutes to appear in the Azure Portal
4. **Azure Portal** — Check that data ingestion is enabled on the Application Insights resource

### Build Warnings

Some warnings about OpenTelemetry dependencies are expected and can be safely ignored. These are related to Application Insights' internal instrumentation libraries.
