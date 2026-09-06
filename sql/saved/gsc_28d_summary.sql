-- Saved query: gsc_28d_summary
-- Loader sustituye {{gcp_project}} (también acepta __GCP_PROJECT__).
SELECT
  COUNT(*) AS row_count,
  SUM(clicks) AS clicks,
  SUM(impressions) AS impressions,
  SAFE_DIVIDE(SUM(sum_position), SUM(impressions)) AS avg_position
FROM `{{gcp_project}}.searchconsole_uniiku.searchdata_site_impression`
WHERE data_date BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY) AND CURRENT_DATE()
