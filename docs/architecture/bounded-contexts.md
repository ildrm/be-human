# Bounded contexts

| Context | Owns | Does not own |
|---|---|---|
| Identity & access | users, sessions, roles, resource policy | life recommendations |
| Life context | effective-dated person/environment/time graph, life events | standards |
| Households | membership, custody references, explicit sharing grants | a member’s private health or financial records |
| Evidence governance | standard definitions, versions, applicability, publishing audit | user preference weights |
| Measurement | observations, units, source, confidence, questionnaire provenance | diagnosis |
| Planning | capacity, demand, hard constraints, feasible plans, alternatives | clinical overrides |
| Goals & behaviour | value-to-action hierarchy, COM-B barriers, fallback/recovery plans | moral judgement |
| Notifications | channel adapters, quiet hours, batching, caps | engagement pressure |
| Integrations | provider tokens and synchronization boundaries | authoritative core records |

Cross-context calls use explicit interfaces. The current executable slice implements identity, evidence, calculations, and planning most deeply; remaining contexts have schema and interface seams documented in `docs/implementation-status.md`.
