import { describe, it, expect } from "vitest";
import { assertWriteAllowed } from "../src/tools/register.js";
import type { EnvConfig } from "../src/config.js";

function baseEnv(overrides: Partial<EnvConfig> = {}): EnvConfig {
  return {
    port: 8080,
    writeEnabled: false,
    gcpProject: "sem-seo-uniiku",
    bqLocation: "europe-west1",
    ga4PropertyId: "properties/511565561",
    gscSiteUrl: "sc-domain:uniiku.net",
    mcpBearerToken: "test",
    githubRepo: "luna-1999/uniiku_landing",
    contractPath: "config/sem-seo.contract.yaml",
    ...overrides,
  };
}

describe("write tools", () => {
  it("blocked when WRITE_ENABLED false", () => {
    expect(() => assertWriteAllowed(baseEnv({ writeEnabled: false }), "tok")).toThrow(
      /WRITE_ENABLED=false/,
    );
  });

  it("blocked when confirmation_token missing even if write enabled", () => {
    expect(() => assertWriteAllowed(baseEnv({ writeEnabled: true }), undefined)).toThrow(
      /confirmation_token/,
    );
    expect(() => assertWriteAllowed(baseEnv({ writeEnabled: true }), "")).toThrow(
      /confirmation_token/,
    );
  });

  it("allows when write enabled and token present", () => {
    expect(() => assertWriteAllowed(baseEnv({ writeEnabled: true }), "ok-token")).not.toThrow();
  });
});
