import { BigQuery } from "@google-cloud/bigquery";
import type { EnvConfig } from "../config.js";

const ALLOWED_DATASETS = new Set(["analytics_5115655661", "searchconsole_uniiku"]);

export const SAVED_QUERIES: Record<
  string,
  (params: Record<string, unknown>, env: EnvConfig) => { sql: string; params: Record<string, unknown> }
> = {
  gsc_28d_summary: (_params, env) => ({
    sql: `
SELECT
  COUNT(*) AS row_count,
  SUM(clicks) AS clicks,
  SUM(impressions) AS impressions,
  SAFE_DIVIDE(SUM(sum_position), SUM(impressions)) AS avg_position
FROM \`${env.gcpProject}.searchconsole_uniiku.searchdata_site_impression\`
WHERE data_date BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY) AND CURRENT_DATE()
`.trim(),
    params: {},
  }),
  ga4_28d_sessions: (_params, env) => ({
    sql: `
SELECT
  COUNT(*) AS event_rows,
  COUNT(DISTINCT user_pseudo_id) AS approx_users
FROM \`${env.gcpProject}.analytics_5115655661.events_*\`
WHERE _TABLE_SUFFIX BETWEEN
  FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY))
  AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
`.trim(),
    params: {},
  }),
};

let bq: BigQuery | null = null;

function getBq(env: EnvConfig): BigQuery {
  if (!bq) {
    bq = new BigQuery({ projectId: env.gcpProject, location: env.bqLocation });
  }
  return bq;
}

export function assertNamedQueryOnly(name: string): void {
  if (!name || typeof name !== "string") {
    throw new Error("Saved query name is required");
  }
  if (!(name in SAVED_QUERIES)) {
    throw new Error(
      `Unknown saved query: ${name}. Allowed: ${Object.keys(SAVED_QUERIES).join(", ")}. Free SQL is rejected.`,
    );
  }
}

export function rejectFreeSql(sql: unknown): void {
  if (sql !== undefined && sql !== null && String(sql).trim() !== "") {
    throw new Error("Free SQL is not allowed. Use bq_run_saved_query with a named query only.");
  }
}

export async function runSavedQuery(
  env: EnvConfig,
  name: string,
  params: Record<string, unknown> = {},
) {
  assertNamedQueryOnly(name);
  rejectFreeSql((params as { sql?: unknown }).sql);

  const builder = SAVED_QUERIES[name];
  const { sql, params: queryParams } = builder(params, env);

  // Safety: ensure only allowlisted datasets appear in SQL
  for (const ds of extractDatasets(sql)) {
    if (!ALLOWED_DATASETS.has(ds)) {
      throw new Error(`Dataset not allowlisted in saved query: ${ds}`);
    }
  }

  try {
    const [rows] = await getBq(env).query({
      query: sql,
      location: env.bqLocation,
      params: queryParams,
    });
    return {
      name,
      rowCount: rows.length,
      rows,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/Could not load the default credentials|Unable to authenticate|ENOENT|credentials/i.test(msg)) {
      throw new Error(
        `BigQuery credentials missing or invalid. Set GOOGLE_APPLICATION_CREDENTIALS to the SA JSON path (ADC). Original: ${msg}`,
      );
    }
    throw err;
  }
}

function extractDatasets(sql: string): string[] {
  const found = new Set<string>();
  const re = /`[^`]+\.([a-zA-Z0-9_]+)\.[^`]+`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql))) {
    found.add(m[1]);
  }
  return [...found];
}

export { ALLOWED_DATASETS };
