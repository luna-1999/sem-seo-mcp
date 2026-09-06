# RUNBOOK — Uniiku SEM/SEO MCP (mcp/ops)

**SoT:** `../../ops/RUNBOOK.md` (repo monorepo local `/workspace/sem-seo/ops/RUNBOOK.md`).

Este fichero se mantiene alineado con el SoT para el árbol `mcp/` / imagen. Si hay divergencia, gana el SoT en `ops/RUNBOOK.md`.

## Servicio (live)

| Campo | Valor |
|---|---|
| URL Cloud Run | `https://sem-seo-mcp-663802723424.europe-west1.run.app` |
| MCP endpoint | `https://sem-seo-mcp-663802723424.europe-west1.run.app/mcp` |
| Región | `europe-west1` |
| Proyecto GCP | `sem-seo-uniiku` |
| SA reader | `sa-sem-seo-reader@sem-seo-uniiku.iam.gserviceaccount.com` |
| `WRITE_ENABLED` | **`false`** — no activar sin la frase exacta «activa escritura fase 4» |

Live desde **2026-09-06**. Datasets BQ pueden seguir ausentes (ver incidentes).

## Connector Grok

- Nombre: `user-uniiku-sem-seo`
- Proxy: `/home/box/sem-seo-mcp-connector/proxy.py`
- Bearer: box-secrets `UNIUKU_SEM_SEO_MCP_BEARER` (no pegar en chat ni en git)

Social (IG/Threads): conector Metricool hosted / `user-metricool` (`blogId` 3031998), plan Free.

## Probes

```bash
curl -sS https://sem-seo-mcp-663802723424.europe-west1.run.app/health
```

Tools MCP requieren `Authorization: Bearer <MCP_BEARER_TOKEN>`.

## Incidentes comunes

1. **401 bearer** — Bearer ausente/distinto del secret.
2. **BQ dataset not found** — `searchconsole_uniiku` / `analytics_5115655661` ausentes; fallback APIs.
3. **GA4 403 / PERMISSION_DENIED SA** — SA sin rol en `properties/5115655661`.
4. **Free SQL rejected / unknown saved query** — Solo catálogo `sql/saved/`.
5. **Ads stub** — Esperado hasta abrir cuenta.
6. **`github_configured: false`** — Sin token GitHub.
7. **Credenciales Google missing** — ADC / runtime SA.

## Rollback

Redeploy imagen anterior. Mantener `WRITE_ENABLED=false`.
