-- Saved query: gsc_28d_by_page
-- Tabla estándar GSC bulk: searchdata_url_impression
SELECT
  url,
  SUM(clicks) AS clicks,
  SUM(impressions) AS impressions,
  SAFE_DIVIDE(SUM(sum_position), SUM(impressions)) AS avg_position
FROM `{{gcp_project}}.searchconsole_uniiku.searchdata_url_impression`
WHERE data_date BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY) AND CURRENT_DATE()
GROUP BY url
ORDER BY clicks DESC, impressions DESC
LIMIT 50
