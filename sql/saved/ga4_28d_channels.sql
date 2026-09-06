-- Saved query: ga4_28d_channels
-- Export GA4 BQ estándar: traffic_source.source / medium (conservador; sin session_default_channel_grouping)
SELECT
  traffic_source.source AS source,
  traffic_source.medium AS medium,
  COUNT(*) AS events,
  COUNT(DISTINCT user_pseudo_id) AS users
FROM `{{gcp_project}}.analytics_5115655661.events_*`
WHERE _TABLE_SUFFIX BETWEEN
  FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY))
  AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
GROUP BY 1, 2
ORDER BY events DESC
LIMIT 50
