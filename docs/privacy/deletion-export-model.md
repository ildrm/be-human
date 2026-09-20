# Export and deletion model

Export requests snapshot only resources that the requesting user owns; shared-but-not-owned records are represented by safe references. A background job produces a private, expiring object and records access. Deletion requests revoke sessions immediately, freeze new processing, remove/re-key owned sensitive data, detach shared references safely, and retain only narrowly required security/legal records with documented policy.

The current schema and request entity exist, but the job processor, user interface, retention schedule, and restore-after-deletion tests are not yet implemented. They are production blockers, not optional polish.
