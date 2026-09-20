# Authentication and authorization

Passwords are hashed with Argon2id (19 MiB, three iterations, one lane in the current profile). Login creates a 256-bit opaque token; only its SHA-256 digest is stored. The browser receives the token through an HttpOnly, SameSite=Lax cookie, Secure in production. Sessions expire after 30 days and can be revoked.

Roles authorize platform actions; ownership and relationship attributes authorize user resources. A role alone never grants household-private content. The intended policy input is `(actor, action, resource owner, household relationship, explicit grant, privacy class, validity time)`. Deny is the default.

Current production blockers: TOTP/passkeys, recovery codes, token-family reuse detection, account recovery, global rate limiting, support-role elevation controls, and complete per-endpoint policy tests.
