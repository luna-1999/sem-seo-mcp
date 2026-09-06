-- Saved query: ga4_28d_sessions
SELECT
  COUNT(*) AS event_rows,
  COUNT(DISTINCT user_pseudo_id) AS approx_users
FROM `{{gcp_project}}.analytics_5115655661.events_*`
WHERE _TABLE_SUFFIX BETWEEN
  FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY))
  AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
