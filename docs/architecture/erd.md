# Entity relationship overview

```mermaid
erDiagram
  APP_USER ||--o{ USER_SESSION : has
  APP_USER ||--o{ USER_ROLE : assigned
  APP_USER ||--|| PROFILE : owns
  APP_USER ||--o{ CONSENT : records
  APP_USER ||--o{ HOUSEHOLD_MEMBER : joins
  HOUSEHOLD ||--o{ HOUSEHOLD_MEMBER : contains
  APP_USER ||--o{ SHARING_PERMISSION : grants
  APP_USER ||--o{ CONTEXT_NODE : owns
  CONTEXT_NODE ||--o{ CONTEXT_EDGE : source
  CONTEXT_NODE ||--o{ CONTEXT_EDGE : target
  APP_USER ||--o{ LIFE_EVENT : experiences
  APP_USER ||--o{ GOAL : defines
  GOAL ||--o{ GOAL : decomposes
  APP_USER ||--o{ PLAN : owns
  PLAN ||--o{ PLAN_ITEM : includes
  APP_USER ||--o{ CAPACITY_SNAPSHOT : estimates
  APP_USER ||--o{ METRIC_OBSERVATION : records
  APP_USER ||--o{ WELLBEING_ASSESSMENT : records
  STANDARD_DEFINITION ||--o{ RECOMMENDATION : supports
  APP_USER ||--o{ RECOMMENDATION : receives
  APP_USER ||--o{ DATA_REQUEST : submits
```

The migration includes foreign keys, ownership columns, privacy classes, effective dates, idempotency keys, and indexes for active sessions, graph edges, trends, plan timelines, sharing lookup, and active standards.
