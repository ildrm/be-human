# Data flow

```mermaid
sequenceDiagram
  actor U as User
  participant UI as Next.js UI
  participant API as NestJS API
  participant DB as PostgreSQL
  participant Rules as Evidence + planner
  U->>UI: Gives minimum necessary context
  UI->>API: Validated request + opaque cookie
  API->>DB: Resolve session and resource policy
  API->>DB: Load effective context and restrictions
  API->>Rules: Context + versioned standards + constraints
  Rules-->>API: Feasible plan or named conflicts + provenance
  API->>DB: Persist model/source versions and audit metadata
  API-->>UI: Structured result, confidence, alternatives, limitations
  UI-->>U: Editable plan with “Why?” explanation
```

Sensitive response bodies are not written to application logs. Correlation IDs, duration, route, status, and coarse error codes are observable. AI context, when added, must be built after policy filtering and must exclude inaccessible household data.
