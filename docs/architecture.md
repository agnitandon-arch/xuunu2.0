# Architecture

## Overview
Xuunu is a progressive web app focused on health tracking, environmental context, and biosignature insights.
The current repository ships a Vite + React client with an Express API server for rapid iteration.
The long-term production target is a Next.js 14 stack backed by Firebase and analytics dashboards.

## Core components

### Client (PWA)
- Source: `client/`
- Tech: React + TypeScript + Vite, Tailwind CSS
- Responsibilities:
  - UI for tracking, insights, and environmental monitoring
  - Authentication flows
  - Device connection UX for Terra
  - PWA assets and service worker registration

### API server
- Source: `server/`
- Tech: Express + TypeScript
- Responsibilities:
  - REST endpoints for health metrics, environmental readings, and insights
  - Integration points for Terra and environmental APIs
  - AI insights generation
  - Database access

### Shared schema
- Source: `shared/`
- Purpose: Shared types and schemas used by client and server

## Data flow

1. User signs in with Firebase Auth.
2. Client calls API endpoints for data entry and retrieval.
3. Server validates requests and writes to PostgreSQL via Drizzle.
4. Environmental data is fetched on demand from external providers.
5. Insights are generated via AI integrations when requested.

## External services

- Firebase Auth for authentication
- Terra API for wearable device data
- EPA AirNow and other providers for environmental readings
- BigDataCloud for reverse geocoding
- Anthropic for AI insights
- Google Looker Studio for analytics dashboards (production target)

## Deployment model

- Local development uses a single server that hosts API routes and the Vite dev server.
- Production builds a static client bundle and serves it with the Node server.
- PWA distribution and app store guidance are documented in `MOBILE_DEPLOYMENT.md`.
