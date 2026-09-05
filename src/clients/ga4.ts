import { BetaAnalyticsDataClient } from "@google-analytics/data";
import type { EnvConfig } from "../config.js";

const ALLOWED_DIMENSIONS = new Set([
  "date",
  "country",
  "city",
  "deviceCategory",
  "sessionDefaultChannelGroup",
  "sessionSource",
  "sessionMedium",
  "pagePath",
  "pageTitle",
  "landingPage",
  "hostName",
  "language",
  "newVsReturning",
]);

const ALLOWED_METRICS = new Set([
  "sessions",
  "totalUsers",
  "newUsers",
  "activeUsers",
  "screenPageViews",
  "engagedSessions",
  "engagementRate",
  "averageSessionDuration",
  "bounceRate",
  "conversions",
  "eventCount",
  "sessionsPerUser",
]);

let client: BetaAnalyticsDataClient | null = null;

function getClient(): BetaAnalyticsDataClient {
  if (!client) {
    client = new BetaAnalyticsDataClient();
  }
  return client;
}

export function assertGa4Allowlist(dimensions: string[], metrics: string[]): void {
  for (const d of dimensions) {
    if (!ALLOWED_DIMENSIONS.has(d)) {
      throw new Error(`Dimension not allowlisted: ${d}. Allowed: ${[...ALLOWED_DIMENSIONS].join(", ")}`);
    }
  }
  for (const m of metrics) {
    if (!ALLOWED_METRICS.has(m)) {
      throw new Error(`Metric not allowlisted: ${m}. Allowed: ${[...ALLOWED_METRICS].join(", ")}`);
    }
  }
}

export async function runGa4Report(
  env: EnvConfig,
  params: {
    dimensions: string[];
    metrics: string[];
    startDate: string;
    endDate: string;
    limit?: number;
    dimensionFilter?: unknown;
  },
) {
  assertGa4Allowlist(params.dimensions, params.metrics);
  try {
    const [response] = await getClient().runReport({
      property: env.ga4PropertyId,
      dateRanges: [{ startDate: params.startDate, endDate: params.endDate }],
      dimensions: params.dimensions.map((name) => ({ name })),
      metrics: params.metrics.map((name) => ({ name })),
      limit: params.limit ?? 100,
      ...(params.dimensionFilter
        ? { dimensionFilter: params.dimensionFilter as object }
        : {}),
    });
    return {
      property: env.ga4PropertyId,
      rowCount: response.rowCount ?? response.rows?.length ?? 0,
      dimensionHeaders: response.dimensionHeaders?.map((h) => h.name) ?? [],
      metricHeaders: response.metricHeaders?.map((h) => h.name) ?? [],
      rows: (response.rows ?? []).map((row) => ({
        dimensions: row.dimensionValues?.map((v) => v.value) ?? [],
        metrics: row.metricValues?.map((v) => v.value) ?? [],
      })),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/Could not load the default credentials|Unable to authenticate|ENOENT|credentials/i.test(msg)) {
      throw new Error(
        `GA4 credentials missing or invalid. Set GOOGLE_APPLICATION_CREDENTIALS to the SA JSON path (ADC). Original: ${msg}`,
      );
    }
    throw err;
  }
}

export async function runGa4Realtime(env: EnvConfig, metrics: string[]) {
  const allowed = metrics.length ? metrics : ["activeUsers"];
  for (const m of allowed) {
    if (!["activeUsers", "eventCount", "screenPageViews"].includes(m)) {
      throw new Error(`Realtime metric not allowlisted: ${m}`);
    }
  }
  try {
    const [response] = await getClient().runRealtimeReport({
      property: env.ga4PropertyId,
      metrics: allowed.map((name) => ({ name })),
    });
    return {
      property: env.ga4PropertyId,
      metricHeaders: response.metricHeaders?.map((h) => h.name) ?? [],
      rows: (response.rows ?? []).map((row) => ({
        metrics: row.metricValues?.map((v) => v.value) ?? [],
      })),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/Could not load the default credentials|Unable to authenticate|ENOENT|credentials/i.test(msg)) {
      throw new Error(
        `GA4 credentials missing or invalid. Set GOOGLE_APPLICATION_CREDENTIALS to the SA JSON path (ADC). Original: ${msg}`,
      );
    }
    throw err;
  }
}

export { ALLOWED_DIMENSIONS, ALLOWED_METRICS };
