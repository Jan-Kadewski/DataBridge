# DataBridge Hub

[![CI](https://github.com/<USERNAME>/databridge-hub/actions/workflows/ci.yml/badge.svg)](https://github.com/<USERNAME>/databridge-hub/actions/workflows/ci.yml)

Bidirectional data synchronization between Salesforce and a PostgreSQL-backed
external application, orchestrated through MuleSoft.

## Architecture

Three integration patterns in one project:

- **Batch ETL** (MuleSoft scheduled, PG → Bulk API 2.0 → Salesforce)
- **Real-time CDC** (Salesforce → Pub/Sub API → MuleSoft → PG, sub-second latency)
- **Webhook** (React UI → Node/Fastify → MuleSoft HTTP → Salesforce REST)

Correlation ID propagates through all three systems and both dashboards.

## Stack

- **Salesforce** — Apex, LWC, Platform Events, Change Data Capture, Pub/Sub API, Named Credentials (new model), JWT Bearer auth
- **MuleSoft** — Mule 4.x runtime, DataWeave 2.0, Salesforce Connector, Pub/Sub Connector, Database Connector (JDBC), Object Store v2, HTTP Listener
- **Node.js** — Fastify, TypeScript (strict, ESM), plain `pg` driver, zod, pino, JWT Bearer flow to Salesforce
- **React** — Vite, React 18, TypeScript, Tailwind v4, shadcn/ui, TanStack Query, Recharts
- **Tests** — Apex tests (>85% coverage), Vitest + testcontainers-pg + nock
- **CI** — GitHub Actions: scratch org + Apex tests, Node tests, typecheck, lint

## Local development

See `docs/` for setup per component:
- `server/` — Node backend
- `client/` — React dashboard
- `salesforce/databridge-sf/` — SFDX project
- `mulesoft/` — Mule application
- `secrets/` — RSA keys (gitignored)

## CI

Every PR runs:
- Salesforce: scratch org creation, metadata deploy, Apex tests with ≥85% coverage enforcement
- Node: TypeScript typecheck, Vitest with coverage, integration tests via testcontainers
- Client: TypeScript typecheck + Vite build
- Lint: ESLint on Node codebase