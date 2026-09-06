import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BigQuery } from "@google-cloud/bigquery";
import type { EnvConfig } from "../config.js";

const ALLOWED_DATASETS = new Set(["analytics_511565561", "searchconsole_uniiku"]);

const __dirname = dirname(fileURLToPath(import.meta.url));
/** sql/saved relative to package root (src/clients -> ../../sql/saved; dist/clients -> same). */
const SAVED_SQL_DIR = join(__dirname, "..", "..", "sql", "saved");

export type SavedQueryBuilder = (
  params: Record<string, unknown>,
  env: EnvConfig,
) => { sql: string; params: Record<string, unknown> };

/**
 * Allowlist map: name -> optional params builder.
 * SQL body is loaded from sql/saved/{name}.sql; {{gcp_project}} / __GCP_PROJECT__ are injected.
 */
export const SAVED_QUERIES: Record<string, SavedQueryBuilder> = {
  gsc_28d_summary: (_params, env) => ({
    sql: loadSavedSql("gsc_28d_summary", env),
    params: {},
  }),
  ga4_28d_sessions: (_params, env) => ({
    sql: loadSavedSql("ga4_28d_sessions", env),
    params: {},
  }),
  gsc_28d_by_page: (_params, env) => ({
    sql: loadSavedSql("gsc_28d_by_page", env),
    params: {},
  }),
  ga4_28d_channels: (_params, env) => ({
    sql: loadSavedSql("ga4_28d_channels", env),
    params: {},
  }),
};

function loadSavedSql(name: string, env: EnvConfig): string {
  const path = join(SAVED_SQL_DIR, `${name}.sql`);
  if (!existsSync(path)) {
    throw new Error(
      `Saved SQL file missing for query "${name}": expected ${path}. Add mcp/sql/saved/${name}.sql`,
    );
  }
  const raw = readFileSync(path, "utf8");
  return injectProject(raw, env.gcpProject).trim();
}

function injectProject(sql: string, gcpProject: string): string {
  return sql
    .replaceAll("{{gcp_project}}", gcpProject)
    .replaceAll("__GCP_PROJECT__", gcpProject);
}

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

export { ALLOWED_DATASETS, SAVED_SQL_DIR, loadSavedSql, injectProject };
