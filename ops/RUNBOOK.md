# RUNBOOK — Uniiku SEM/SEO MCP

Stub operativo. Completar tras el primer deploy a Cloud Run.

## Servicio

- Region: europe-west1
- Proyecto GCP: sem-seo-uniiku
- SA reader: sa-sem-seo-reader@sem-seo-uniiku.iam.gserviceaccount.com
- WRITE_ENABLED=false (no activar sin frase explicita de fase 4)

## Probes

- Liveness/Readiness: GET /health (publico, sin bearer)

## Auth

- Tools MCP: Authorization Bearer MCP_BEARER_TOKEN
- Token en Secret Manager (ej. mcp-bearer-token)

## Secretos (Secret Manager)

| Secret | Uso |
|--------|-----|
| mcp-bearer-token | Bearer inbound Grok to MCP |
| sa-sem-seo-reader | JSON key SA (montar como fichero; GOOGLE_APPLICATION_CREDENTIALS) |
| github-token | Opcional, repo tools |
| metricool-user-token | No usar en Free REST; reservado |

## Incidentes comunes

1. 401 en /mcp — Bearer ausente o distinto del secret.
2. GA4/GSC/BQ credentials missing — ADC / GOOGLE_APPLICATION_CREDENTIALS no montado o SA sin roles.
3. bq_run_saved_query unknown / free SQL — Solo gsc_28d_summary y ga4_28d_sessions.
4. Ads not_configured — Esperado hasta abrir cuenta Ads.

## Rollback

Redeploy imagen anterior; no hay migraciones de schema propias.
