# Performance budgets

## Browser

- LCP ≤ 2.5 s at p75 on representative mobile hardware/network.
- INP ≤ 200 ms at p75; CLS ≤ 0.1.
- Initial Today route JavaScript target ≤ 170 KiB compressed.
- Server response p95 ≤ 500 ms for a warm authenticated Today request.

## API and data

- Health p95 ≤ 30 ms in-region.
- Standards lookup p95 ≤ 150 ms warm.
- Deterministic single-day planning p95 ≤ 200 ms for 200 candidate items.
- Common user-scoped database queries p95 ≤ 100 ms with zero N+1.
- Pagination mandatory beyond 100 records; request bodies capped at 1 MiB.

No claim is made that these budgets are met until measurement is recorded in `benchmark-results.md`.
