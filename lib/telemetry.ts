import * as appInsights from "applicationinsights";

let telemetryClient: appInsights.TelemetryClient | null = null;
let initialized = false;

/**
 * Initialize Application Insights telemetry.
 * Safe to call multiple times — only initializes once.
 */
export function initializeTelemetry() {
  if (initialized) return;
  initialized = true;

  const connectionString = process.env.AZURE_APP_INSIGHTS_CONNECTION_STRING;

  if (!connectionString) {
    console.warn(
      "AZURE_APP_INSIGHTS_CONNECTION_STRING not set. Telemetry will not be enabled."
    );
    return;
  }

  try {
    appInsights
      .setup(connectionString)
      .setAutoCollectRequests(false) // We track MCP requests manually
      .setAutoCollectPerformance(true, false)
      .setAutoCollectExceptions(true)
      .setAutoCollectDependencies(false) // We track Algolia calls manually
      .setAutoCollectConsole(true, false)
      .setUseDiskRetryCaching(true)
      .start();

    telemetryClient = appInsights.defaultClient;
    console.log("Application Insights telemetry initialized");
  } catch (error) {
    console.error("Failed to initialize Application Insights:", error);
  }
}

/**
 * Track an MCP tool call as a request + custom event.
 */
export function trackMcpToolCall(
  toolName: string,
  args: Record<string, unknown>,
  duration: number,
  success: boolean,
  error?: Error
) {
  if (!telemetryClient) return;

  const properties: Record<string, string> = {
    toolName,
    arguments: JSON.stringify(args),
    success: success.toString(),
  };

  if (error) {
    properties.error = error.message;
    properties.errorStack = error.stack || "";
  }

  // Track as a request for the Performance blade
  telemetryClient.trackRequest({
    name: `MCP Tool: ${toolName}`,
    url: `/mcp-tool/${toolName}`,
    duration,
    resultCode: success ? "200" : "500",
    success,
    properties,
  });

  // Track as a custom event for flexible querying
  telemetryClient.trackEvent({
    name: "MCPToolCall",
    properties,
    measurements: { duration },
  });
}

/**
 * Track an Algolia search/fetch call as a dependency.
 */
export function trackAlgoliaCall(
  operation: string,
  query: string,
  duration: number,
  success: boolean,
  resultCount?: number,
  error?: Error
) {
  if (!telemetryClient) return;

  const properties: Record<string, string> = {
    operation,
    query,
    success: success.toString(),
  };

  if (resultCount !== undefined) {
    properties.resultCount = resultCount.toString();
  }

  if (error) {
    properties.error = error.message;
  }

  telemetryClient.trackDependency({
    name: `Algolia: ${operation}`,
    data: query,
    duration,
    success,
    dependencyTypeName: "Algolia",
    properties,
  });
}

/**
 * Track an exception.
 */
export function trackException(
  exception: Error,
  properties?: Record<string, string>
) {
  if (!telemetryClient) return;

  telemetryClient.trackException({
    exception,
    properties,
  });
}

/**
 * Flush all pending telemetry data.
 */
export function flushTelemetry(): void {
  if (telemetryClient) {
    telemetryClient.flush();
  }
}
