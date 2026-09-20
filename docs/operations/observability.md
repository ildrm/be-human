# Observability

The API emits structured Fastify logs with correlation IDs and redacts authorization/cookie headers. Health and readiness endpoints are separate. Add OpenTelemetry traces and metrics for request duration, status, DB latency, queue age/depth, retry/dead-letter counts, cache hits, external-provider latency, planner duration, and standard version selection.

Never attach questionnaire responses, journals, raw financial details, session tokens, provider tokens, or AI context to logs/traces. Alert on symptoms and security events, not user behaviour or engagement.
