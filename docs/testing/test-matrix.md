# Test matrix

| Risk | Current automated coverage | Next gate |
|---|---|---|
| Formula correctness | golden + boundary tests | more authoritative age-specific reference cases |
| Planner hard constraints | unit scenario tests | randomized schedule invariants + Monte Carlo robustness |
| Evidence applicability | unit tests | retired-version reproduction + jurisdiction matrix |
| Authentication | service implementation | live DB integration, rate limit, replay and session lifecycle |
| Household isolation | schema/policy model | complete actor/resource E2E matrix |
| Accessibility | semantic implementation, manual source review | axe + keyboard + screen reader + 200% zoom |
| Time zones | explicit timezone storage | DST spring/fall, travel, midnight shifts, locale week start |
| Resilience | optional dependencies separated | Redis/S3/provider outage fault injection |
| Performance | budgets established | measured Lighthouse, API percentiles and query plans |
| Docker | multi-stage files and health dependencies | clean build/boot/health/restore smoke |
