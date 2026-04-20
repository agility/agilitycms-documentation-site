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
      .setAutoCollectRequests(false)
      .setAutoCollectPerformance(false, false)
      .setAutoCollectExceptions(true)
      .setAutoCollectDependencies(false)
      .setAutoCollectConsole(true, false)
      .setUseDiskRetryCaching(false) // No disk in serverless
      .start();

    telemetryClient = appInsights.defaultClient;

    // Reduce buffer time for serverless — flush more aggressively
    telemetryClient.config.maxBatchSize = 1;

    console.log("Application Insights telemetry initialized");
  } catch (error) {
    console.error("Failed to initialize Application Insights:", error);
  }
}

/**
 * Track an MCP tool call as a custom event and flush immediately.
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

  telemetryClient.trackEvent({
    name: "MCPToolCall",
    properties,
    measurements: { duration },
  });

  telemetryClient.flush();
}

/**
 * Track an Algolia search/fetch call as a custom event and flush immediately.
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

  telemetryClient.trackEvent({
    name: "AlgoliaCall",
    properties,
    measurements: { duration },
  });

  telemetryClient.flush();
}

/**
 * Track an exception and flush immediately.
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

  telemetryClient.flush();
}
