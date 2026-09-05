import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import type { EnvConfig } from "../config.js";

async function getSearchconsole() {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
  return google.searchconsole({ version: "v1", auth });
}

function wrapCredsError(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);
  if (/Could not load the default credentials|Unable to authenticate|ENOENT|credentials/i.test(msg)) {
    throw new Error(
      `GSC credentials missing or invalid. Set GOOGLE_APPLICATION_CREDENTIALS to the SA JSON path (ADC). Original: ${msg}`,
    );
  }
  throw err instanceof Error ? err : new Error(msg);
}

export async function searchAnalytics(
  env: EnvConfig,
  params: {
    startDate: string;
    endDate: string;
    dimensions?: string[];
    rowLimit?: number;
    startRow?: number;
    searchType?: string;
  },
) {
  try {
    const sc = await getSearchconsole();
    const res = await sc.searchanalytics.query({
      siteUrl: env.gscSiteUrl,
      requestBody: {
        startDate: params.startDate,
        endDate: params.endDate,
        dimensions: params.dimensions ?? ["query"],
        rowLimit: params.rowLimit ?? 100,
        startRow: params.startRow ?? 0,
        ...(params.searchType ? { type: params.searchType } : {}),
      },
    });
    return {
      siteUrl: env.gscSiteUrl,
      rows: res.data.rows ?? [],
      responseAggregationType: res.data.responseAggregationType,
    };
  } catch (err) {
    wrapCredsError(err);
  }
}

export async function inspectUrl(env: EnvConfig, inspectionUrl: string) {
  try {
    const sc = await getSearchconsole();
    const res = await sc.urlInspection.index.inspect({
      requestBody: {
        inspectionUrl,
        siteUrl: env.gscSiteUrl,
      },
    });
    return {
      siteUrl: env.gscSiteUrl,
      inspectionUrl,
      inspectionResult: res.data.inspectionResult ?? null,
    };
  } catch (err) {
    wrapCredsError(err);
  }
}

export async function listSitemaps(env: EnvConfig) {
  try {
    const sc = await getSearchconsole();
    const res = await sc.sitemaps.list({ siteUrl: env.gscSiteUrl });
    return {
      siteUrl: env.gscSiteUrl,
      sitemap: res.data.sitemap ?? [],
    };
  } catch (err) {
    wrapCredsError(err);
  }
}
