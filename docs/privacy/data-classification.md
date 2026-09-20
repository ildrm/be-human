# Data classification and consent

| Class | Examples | Default sharing |
|---|---|---|
| Public | published help and standards citations | public |
| Account | email, locale, session devices | owner only |
| Household-shared | explicitly shared events or chore assignments | named grantees only |
| Private | goals, routines, observations | owner only |
| Highly sensitive | private journal or AI conversation | owner only; never implied by household membership |
| Health-related | wellbeing/function/sleep details, restrictions | owner only; explicit purpose and grant |
| Financial | income, debt, private notes | owner only; explicit granular grant |
| Child-related | guardian/custody and child records | jurisdiction-reviewed guardian policy only |

Consent records are append-only events with policy version, purpose, time, grant/withdrawal status. Optional modules should remain off until the user chooses them. “Prefer not to answer” must not degrade unrelated features.

Exports are owner-scoped and should include provenance and machine-readable data. Deletion is an asynchronous, auditable workflow that first revokes sessions and sharing; statutory/security retention exceptions must be listed to the user. Audit logs contain identifiers and action metadata, not sensitive payloads.
