import { describe, it, expect } from "vitest";
import {
  rejectFreeSql,
  assertNamedQueryOnly,
  SAVED_QUERIES,
  loadSavedSql,
  injectProject,
} from "../src/clients/bq.js";
import type { EnvConfig } from "../src/config.js";

const EXPECTED = [
  "ga4_28d_channels",
  "ga4_28d_sessions",
  "gsc_28d_by_page",
  "gsc_28d_summary",
].sort();

const fakeEnv = { gcpProject: "sem-seo-uniiku" } as EnvConfig;

describe("bq_run_saved_query guards", () => {
  it("rejects free SQL", () => {
    expect(() => rejectFreeSql("SELECT 1")).toThrow(/Free SQL/);
  });

  it("rejects unknown saved query", () => {
    expect(() => assertNamedQueryOnly("drop_all")).toThrow(/Unknown saved query/);
  });

  it("allows known saved queries", () => {
    for (const name of EXPECTED) {
      expect(() => assertNamedQueryOnly(name)).not.toThrow();
    }
    expect(Object.keys(SAVED_QUERIES).sort()).toEqual(EXPECTED);
  });

  it("loads SQL files and injects project placeholder", () => {
    const sql = loadSavedSql("gsc_28d_summary", fakeEnv);
    expect(sql).toContain("`sem-seo-uniiku.searchconsole_uniiku.searchdata_site_impression`");
    expect(sql).not.toContain("{{gcp_project}}");
    expect(injectProject("SELECT * FROM `__GCP_PROJECT__.x.y`", "p1")).toContain("`p1.x.y`");
  });

  it("builders return SQL with project injected", () => {
    for (const name of EXPECTED) {
      const { sql } = SAVED_QUERIES[name]({}, fakeEnv);
      expect(sql.length).toBeGreaterThan(20);
      expect(sql).toContain("sem-seo-uniiku");
    }
  });
});
