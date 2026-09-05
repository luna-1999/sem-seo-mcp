import { describe, it, expect } from "vitest";
import { rejectFreeSql, assertNamedQueryOnly, SAVED_QUERIES } from "../src/clients/bq.js";

describe("bq_run_saved_query guards", () => {
  it("rejects free SQL", () => {
    expect(() => rejectFreeSql("SELECT 1")).toThrow(/Free SQL/);
  });

  it("rejects unknown saved query", () => {
    expect(() => assertNamedQueryOnly("drop_all")).toThrow(/Unknown saved query/);
  });

  it("allows known saved queries", () => {
    expect(() => assertNamedQueryOnly("gsc_28d_summary")).not.toThrow();
    expect(() => assertNamedQueryOnly("ga4_28d_sessions")).not.toThrow();
    expect(Object.keys(SAVED_QUERIES).sort()).toEqual(["ga4_28d_sessions", "gsc_28d_summary"]);
  });
});
