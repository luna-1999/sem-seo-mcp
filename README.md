# Uniiku SEM/SEO MCP

Read-only Streamable HTTP MCP for Cloud Run europe-west1.

Auth inbound: Authorization Bearer = MCP_BEARER_TOKEN.
Auth Google: ADC / GOOGLE_APPLICATION_CREDENTIALS (never commit keys).
WRITE_ENABLED=false by default.

## Stack
Node 22, TypeScript, @modelcontextprotocol/sdk (Streamable HTTP stateless),
Express, zod, vitest, @google-analytics/data, googleapis, @google-cloud/bigquery, Octokit.

## Local
cd sem-seo/mcp
cp .env.example .env  # set MCP_BEARER_TOKEN
Run scripts from package.json: install, test, build, start.
Health public: GET /health on PORT (default 8080).

## Tools
- meta: health, list_config
- GA4: ga4_run_report, ga4_realtime
- GSC: gsc_search_analytics, gsc_inspect_url, gsc_sitemaps_list
- BQ: bq_run_saved_query (named only: gsc_28d_summary, ga4_28d_sessions)
- Ads stubs -> { status: not_configured }
- Repo: repo_get_file, repo_search_code, repo_list_open_prs
- Metricool: mtr_status (Free / hosted MCP; no REST calls)
- Write stubs ads_pause_keyword, repo_propose_patch blocked when WRITE_ENABLED=false or no confirmation_token

## Cloud Run (europe-west1)
- Project: sem-seo-uniiku
- SA: sa-sem-seo-reader@sem-seo-uniiku.iam.gserviceaccount.com
- Env: WRITE_ENABLED=false, GCP_PROJECT, BQ_LOCATION, GA4_PROPERTY_ID, GSC_SITE_URL, GITHUB_REPO
- Secret Manager: mcp-bearer-token -> MCP_BEARER_TOKEN
- Probe: GET /health (public); /mcp requires bearer

Multi-stage Dockerfile uses node:22-slim. Push to Artifact Registry, deploy Cloud Run.

## Secret Manager
- mcp-bearer-token -> MCP_BEARER_TOKEN
- github-token optional -> GITHUB_TOKEN
- SA JSON optional -> mount + GOOGLE_APPLICATION_CREDENTIALS

## Grok Custom connector
1. URL: https://<cloud-run-url>/mcp
2. Auth: Bearer = MCP_BEARER_TOKEN
3. Transport: Streamable HTTP
4. Confirm WRITE_ENABLED=false via health / list_config

Metricool social: https://ai.metricool.com/mcp (OAuth). This server does not call Metricool REST on Free.

## Env defaults
WRITE_ENABLED=false
GCP_PROJECT=sem-seo-uniiku
BQ_LOCATION=europe-west1
GA4_PROPERTY_ID=properties/511565561
GSC_SITE_URL=sc-domain:uniiku.net
GITHUB_REPO=luna-1999/uniiku_landing
PORT=8080

## Contract
config/sem-seo.contract.yaml — no secrets. list_config exposes it.
See ops/RUNBOOK.md.
