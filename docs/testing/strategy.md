# Testing strategy

Testing follows the highest-risk boundaries: deterministic calculations, safety constraints, identity and ownership, explicit sharing, asynchronous privacy work, accessibility, and deployment boot.

## Automated suites

- Domain golden cases cover BMI, adult Mifflin–St Jeor, macronutrient conversion, sodium/salt, activity equivalence, sleep debt, circular social jetlag, WHO-5, household equivalence, runway, housing ratio, z/robust-z, EWMA, and DCR.
- Invariants prove that added vigorous activity cannot reduce equivalent minutes and added actual sleep cannot increase estimated debt.
- Planner tests cover feasibility, fixed overlaps, protected sleep, recovery deferral, budget and accessibility hard constraints, and invalid day bounds.
- Scenario tests cover the required A–I cases: overloaded parent, night shift, wheelchair access, religious and secular contexts, financial constraint, separated co-parent collision, recovery, and impossible schedule.
- Time tests cover spring-forward, fall-back, overnight intervals, and leap day in named timezones.
- Scientific-governance tests cover provenance completeness, age exclusion, and professional-override precedence.
- API tests cover evidence and planner contracts, keyed session/CSRF handling, owner-scoped writes, and explicit-grant household authorization. PostgreSQL integration tests run whenever `DATABASE_URL` is present and are mandatory in CI.
- Playwright runs public, authentication, anonymous-data-isolation, keyboard, mobile, and axe checks. CI executes them in Chromium, Firefox, WebKit, and a mobile Chromium profile.
- The HTTP smoke journey exercises readiness, registration, CSRF rejection, owned goal persistence, household invitation and explicit goal sharing, worker-produced export, suspension and restoration of sharing during pending deletion, logout, and session revocation against the complete stack.
- CI also performs lint, type checks, production builds, frozen-lockfile provenance verification, dependency audit, Compose builds, SBOM generation, and repository/API/web image scans.

Tests must not be skipped to obtain green status. Environmental failures are reported separately from product failures.

## Human and deployment-specific gates

Automation does not replace manual assistive-technology testing, representative user studies, penetration testing, load/soak tests on the target infrastructure, encrypted backup-restore drills, jurisdictional privacy review, or qualified scientific review. These remain explicit public-release gates.
