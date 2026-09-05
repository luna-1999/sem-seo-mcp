import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EnvConfig } from "../config.js";
import { loadContract, publicConfig } from "../config.js";
import { textResult, withToolLog } from "../util.js";
import { runGa4Report, runGa4Realtime, ALLOWED_DIMENSIONS, ALLOWED_METRICS } from "../clients/ga4.js";
import * as gsc from "../clients/gsc.js";
import { runSavedQuery, rejectFreeSql, assertNamedQueryOnly, SAVED_QUERIES } from "../clients/bq.js";
import * as github from "../clients/github.js";

export function registerTools(server: McpServer, env: EnvConfig): void {
  // --- meta ---
  server.registerTool(
    "health",
    {
      description: "Health ping: version, write_enabled, project, property ids (no secrets)",
      inputSchema: {},
    },
    async () =>
      withToolLog("health", {}, async () => {
        const contract = loadContract(env.contractPath);
        return {
          ok: true,
          service: "uniiku-sem-seo-mcp",
          version: "0.1.0",
          write_enabled: env.writeEnabled,
          gcp_project: env.gcpProject,
          bq_location: env.bqLocation,
          ga4_property_id: env.ga4PropertyId,
          gsc_site_url: env.gscSiteUrl,
          github_repo: env.githubRepo,
          github_configured: github.hasGithubToken(env),
          ads_status: (contract.ads as Record<string, unknown>)?.status ?? "not_opened",
          metricool_status: (contract.metricool as Record<string, unknown>)?.status ?? "free_mcp_only",
          ts: new Date().toISOString(),
        };
      }, textResult),
  );

  server.registerTool(
    "list_config",
    {
      description: "Public SEM/SEO contract snapshot (no secrets)",
      inputSchema: {},
    },
    async () =>
      withToolLog("list_config", {}, async () => {
        const contract = loadContract(env.contractPath);
        return publicConfig(env, contract);
      }, textResult),
  );

  // --- GA4 ---
  server.registerTool(
    "ga4_run_report",
    {
      description: `Run a GA4 Data API report. Allowlisted dimensions: ${[...ALLOWED_DIMENSIONS].join(", ")}. Metrics: ${[...ALLOWED_METRICS].join(", ")}.`,
      inputSchema: {
        dimensions: z.array(z.string()).min(1).describe("Allowlisted GA4 dimensions"),
        metrics: z.array(z.string()).min(1).describe("Allowlisted GA4 metrics"),
        startDate: z.string().describe("YYYY-MM-DD or relative like 28daysAgo"),
        endDate: z.string().describe("YYYY-MM-DD or today"),
        limit: z.number().int().positive().max(10000).optional(),
      },
    },
    async (args) =>
      withToolLog("ga4_run_report", args, () => runGa4Report(env, args), textResult),
  );

  server.registerTool(
    "ga4_realtime",
    {
      description: "Optional GA4 realtime report (activeUsers / eventCount / screenPageViews)",
      inputSchema: {
        metrics: z.array(z.string()).optional(),
      },
    },
    async (args) =>
      withToolLog("ga4_realtime", args, () => runGa4Realtime(env, args.metrics ?? ["activeUsers"]), textResult),
  );

  // --- GSC ---
  server.registerTool(
    "gsc_search_analytics",
    {
      description: "Search Console search analytics query",
      inputSchema: {
        startDate: z.string(),
        endDate: z.string(),
        dimensions: z.array(z.string()).optional(),
        rowLimit: z.number().int().positive().max(25000).optional(),
        startRow: z.number().int().nonnegative().optional(),
        searchType: z.string().optional(),
      },
    },
    async (args) =>
      withToolLog("gsc_search_analytics", args, () => gsc.searchAnalytics(env, args), textResult),
  );

  server.registerTool(
    "gsc_inspect_url",
    {
      description: "Inspect a single URL in Search Console (1 URL per call)",
      inputSchema: {
        inspectionUrl: z.string().url(),
      },
    },
    async (args) =>
      withToolLog("gsc_inspect_url", args, () => gsc.inspectUrl(env, args.inspectionUrl), textResult),
  );

  server.registerTool(
    "gsc_sitemaps_list",
    {
      description: "List sitemaps for the configured GSC property",
      inputSchema: {},
    },
    async () =>
      withToolLog("gsc_sitemaps_list", {}, () => gsc.listSitemaps(env), textResult),
  );

  // --- BQ ---
  server.registerTool(
    "bq_run_saved_query",
    {
      description: `Run a named BigQuery saved query only. Allowed: ${Object.keys(SAVED_QUERIES).join(", ")}. Free SQL is rejected.`,
      inputSchema: {
        name: z.string().describe("Saved query name"),
        params: z.record(z.unknown()).optional(),
        sql: z.string().optional().describe("Must not be provided — free SQL rejected"),
      },
    },
    async (args) =>
      withToolLog("bq_run_saved_query", args, async () => {
        rejectFreeSql(args.sql);
        assertNamedQueryOnly(args.name);
        return runSavedQuery(env, args.name, args.params ?? {});
      }, textResult),
  );

  // --- Ads stubs ---
  const adsStub = async (tool: string, args: unknown) =>
    withToolLog(tool, args, async () => ({ status: "not_configured" as const }), textResult);

  server.registerTool(
    "ads_list_campaigns",
    { description: "Ads stub — account not opened", inputSchema: {} },
    async (args) => adsStub("ads_list_campaigns", args),
  );
  server.registerTool(
    "ads_campaign_performance",
    { description: "Ads stub — account not opened", inputSchema: { campaign_id: z.string().optional() } },
    async (args) => adsStub("ads_campaign_performance", args),
  );
  server.registerTool(
    "ads_search_terms",
    { description: "Ads stub — account not opened", inputSchema: {} },
    async (args) => adsStub("ads_search_terms", args),
  );
  server.registerTool(
    "ads_keywords",
    { description: "Ads stub — account not opened", inputSchema: {} },
    async (args) => adsStub("ads_keywords", args),
  );
  server.registerTool(
    "ads_change_history",
    { description: "Ads stub — account not opened", inputSchema: {} },
    async (args) => adsStub("ads_change_history", args),
  );

  // --- Repo ---
  server.registerTool(
    "repo_get_file",
    {
      description: "Get a file from the landing repo (requires GITHUB_TOKEN)",
      inputSchema: {
        path: z.string(),
        ref: z.string().optional(),
      },
    },
    async (args) =>
      withToolLog("repo_get_file", args, () => github.getFile(env, args.path, args.ref), textResult),
  );

  server.registerTool(
    "repo_search_code",
    {
      description: "Search code in the landing repo (requires GITHUB_TOKEN)",
      inputSchema: { query: z.string() },
    },
    async (args) =>
      withToolLog("repo_search_code", args, () => github.searchCode(env, args.query), textResult),
  );

  server.registerTool(
    "repo_list_open_prs",
    {
      description: "List open PRs in the landing repo (requires GITHUB_TOKEN)",
      inputSchema: {},
    },
    async () =>
      withToolLog("repo_list_open_prs", {}, () => github.listOpenPrs(env), textResult),
  );

  // --- Metricool stub ---
  server.registerTool(
    "mtr_status",
    {
      description: "Metricool status: Free plan — use hosted Metricool MCP; REST not called here",
      inputSchema: {},
    },
    async () =>
      withToolLog("mtr_status", {}, async () => {
        const contract = loadContract(env.contractPath);
        const m = (contract.metricool as Record<string, unknown>) ?? {};
        return {
          status: m.status ?? "free_mcp_only",
          plan: m.plan ?? "free",
          message:
            "Metricool Free: do not call Metricool REST from this MCP. Use the hosted connector https://ai.metricool.com/mcp for IG/Threads social reads.",
          grok_custom_connector: m.grok_custom_connector,
        };
      }, textResult),
  );

  // --- Write stubs (always blocked when WRITE_ENABLED=false or no confirmation_token) ---
  server.registerTool(
    "ads_pause_keyword",
    {
      description: "WRITE stub: pause keyword — blocked unless WRITE_ENABLED and confirmation_token",
      inputSchema: {
        keyword_id: z.string(),
        confirmation_token: z.string().optional(),
        dry_run: z.boolean().optional(),
      },
    },
    async (args) =>
      withToolLog("ads_pause_keyword", args, async () => {
        assertWriteAllowed(env, args.confirmation_token);
        return { status: "not_configured", message: "Ads account not opened; no mutation performed" };
      }, textResult),
  );

  server.registerTool(
    "repo_propose_patch",
    {
      description: "WRITE stub: propose patch/PR — blocked unless WRITE_ENABLED and confirmation_token",
      inputSchema: {
        path: z.string(),
        patch: z.string(),
        confirmation_token: z.string().optional(),
        dry_run: z.boolean().optional(),
      },
    },
    async (args) =>
      withToolLog("repo_propose_patch", args, async () => {
        assertWriteAllowed(env, args.confirmation_token);
        return { status: "not_implemented", message: "Write path reserved for fase 4; no mutation performed" };
      }, textResult),
  );
}

export function assertWriteAllowed(env: EnvConfig, confirmationToken?: string): void {
  if (!env.writeEnabled) {
    throw new Error("WRITE_ENABLED=false — write tools are blocked");
  }
  if (!confirmationToken || confirmationToken.trim() === "") {
    throw new Error("confirmation_token required for write tools");
  }
}
