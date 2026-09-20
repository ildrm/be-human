# ADR 0001: Modular monolith with pure policy packages

Status: accepted, 2026-09-18.

## Decision

Use a Next.js App Router frontend and NestJS/Fastify API. Keep business contexts in one transactional API initially, while isolating calculations and constraint planning in pure TypeScript packages. PostgreSQL is authoritative; Redis is optional acceleration and job infrastructure, never the only copy of planning data.

## Consequences

This reduces cross-service privacy and consistency failures, keeps local startup understandable, and allows extraction around stable interfaces later. It does not provide independent domain scaling on day one; queue workers are the first extraction point.
