# Threat model

## Highest-value assets

Identity and session material; wellbeing and functional responses; household and custody relationships; child data; finances; private notes and AI conversations; professional restrictions; evidence publishing rights; audit integrity.

## STRIDE / LINDDUN review

| Threat | Primary control | Residual risk / next verification |
|---|---|---|
| Session theft/fixation/replay | random opaque tokens, SHA-256 server storage, Argon2id passwords, HttpOnly/Secure/SameSite cookies, rotation boundary | implement MFA, session family/reuse detection, device UI |
| IDOR/BOLA | owner ID derived from session; explicit sharing grant model; deny by default | endpoint authorization matrix must expand with every resource |
| Household privacy leak | membership does not grant sensitive records; resource-type grants are explicit/revocable | co-parent scenario E2E and policy fuzzing pending |
| XSS/clickjacking | React escaping, CSP-ready UI, Helmet, frame deny, content-type protection | nonce-based production CSP and DAST pending |
| CSRF | SameSite cookie and restricted CORS | add synchronizer/double-submit tokens before cross-site integrations |
| SQL injection/mass assignment | parameterized SQL; DTO whitelist and unknown-field rejection | repository tests and static scanning pending |
| SSRF/file upload | no generic URL fetch or upload endpoint in current slice | private-IP denylist, MIME sniffing, malware adapter required before enabling |
| Enumeration/credential stuffing | generic login error | distributed rate limits, breached-password check, progressive delay pending |
| Sensitive logging | structured redaction of cookie/auth headers; no questionnaire logging | log-sink inspection pending |
| Prompt injection/cross-user RAG | AI is not enabled; future context must be policy-filtered and retrieved text treated as data | adversarial suite required before feature flag can turn on |
| Standard tampering | versioned schema, scoped admin roles, audit model | signed approval workflow pending |
| Linkability/inference | minimization and separate privacy classes | telemetry privacy review required |

No emergency monitoring or response guarantee is made. Locale-aware crisis-resource adapters must be reviewed before activation.
