import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === "") return defaultValue;
  const v = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(v)) return true;
  if (["0", "false", "no", "off"].includes(v)) return false;
  return defaultValue;
}

export interface EnvConfig {
  port: number;
  writeEnabled: boolean;
  gcpProject: string;
  bqLocation: string;
  ga4PropertyId: string;
  gscSiteUrl: string;
  mcpBearerToken: string;
  githubToken?: string;
  githubRepo: string;
  googleApplicationCredentials?: string;
  contractPath: string;
}

export function loadEnv(): EnvConfig {
  const token = process.env.MCP_BEARER_TOKEN ?? "";
  return {
    port: Number(process.env.PORT || process.env.MCP_PORT || 8080),
    writeEnabled: parseBool(process.env.WRITE_ENABLED, false),
    gcpProject: process.env.GCP_PROJECT || "sem-seo-uniiku",
    bqLocation: process.env.BQ_LOCATION || "europe-west1",
    ga4PropertyId: process.env.GA4_PROPERTY_ID || "properties/5115655661",
    gscSiteUrl: process.env.GSC_SITE_URL || "sc-domain:uniiku.net",
    mcpBearerToken: token,
    githubToken: process.env.GITHUB_TOKEN || undefined,
    githubRepo: process.env.GITHUB_REPO || "luna-1999/uniiku_landing",
    googleApplicationCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS || undefined,
    contractPath:
      process.env.CONTRACT_PATH ||
      join(dirname(fileURLToPath(import.meta.url)), "..", "config", "sem-seo.contract.yaml"),
  };
}

export function loadContract(path: string): Record<string, unknown> {
  const raw = readFileSync(path, "utf8");
  const data = yaml.load(raw);
  if (!data || typeof data !== "object") {
    throw new Error(`Invalid contract YAML at ${path}`);
  }
  return data as Record<string, unknown>;
}

/** Public config snapshot for list_config / health (no secrets). */
export function publicConfig(env: EnvConfig, contract: Record<string, unknown>) {
  return {
    schema_version: contract.schema_version ?? "0.1",
    status: contract.status ?? "unknown",
    write_enabled: env.writeEnabled,
    site: contract.site,
    ga4: {
      account_id: (contract.ga4 as Record<string, unknown>)?.account_id,
      property_id: env.ga4PropertyId,
      timezone: (contract.ga4 as Record<string, unknown>)?.timezone,
      currency: (contract.ga4 as Record<string, unknown>)?.currency,
    },
    gsc: {
      property: env.gscSiteUrl,
      bulk_export_dataset: (contract.gsc as Record<string, unknown>)?.bulk_export_dataset,
      bulk_export_location: env.bqLocation,
    },
    ads: {
      status: (contract.ads as Record<string, unknown>)?.status ?? "not_opened",
    },
    metricool: {
      status: (contract.metricool as Record<string, unknown>)?.status ?? "free_mcp_only",
      plan: (contract.metricool as Record<string, unknown>)?.plan,
      note: "Use hosted Metricool MCP for social; REST not called from this server on Free plan",
    },
    gcp: {
      project_id: env.gcpProject,
      region: env.bqLocation,
      datasets: (contract.gcp as Record<string, unknown>)?.datasets,
      service_accounts: {
        reader: ((contract.gcp as Record<string, unknown>)?.service_accounts as Record<string, unknown>)
          ?.reader,
      },
    },
    repo: {
      url: (contract.repo as Record<string, unknown>)?.url,
      default_branch: (contract.repo as Record<string, unknown>)?.default_branch,
      github_repo: env.githubRepo,
    },
    mcp: {
      host: "cloud_run",
      auth: "bearer",
      write_flag: env.writeEnabled,
    },
  };
}
