# Integrations

This document describes the primary third-party services used by Xuunu and where they connect.

## Firebase

**Purpose:** Authentication for email/password and Google OAuth.

**Client configuration:**
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

**Setup notes:**
- Enable Email/Password and Google providers in Firebase Auth.
- Add your local and production domains to Authorized Domains.

## Terra API

**Purpose:** Wearable device integrations (Apple Health, Oura, Whoop, Fitbit, Dexcom, and more).

**How it works:**
- Users provide Terra credentials via the device connection UI.
- The API server uses those credentials to generate widget sessions and handle device auth.

**Related areas:**
- API endpoints in `server/routes.ts`
- Device UI in `client/src/pages/DeviceConnectionScreen.tsx`

## Environmental data

**Purpose:** Outdoor air quality and related environmental metrics.

**Current provider:**
- EPA AirNow (requires `AIRNOW_API_KEY`)

**Reverse geocoding:**
- BigDataCloud reverse geocoding API (no key required)

See `ENVIRONMENTAL_API_INTEGRATION.md` for alternative providers and extension points.

## AI insights

**Purpose:** Generate biosignature and environmental synergy insights.

**Provider:**
- Anthropic (via Replit AI Integrations)

**Server configuration:**
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY`
- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`

## Analytics

**Purpose:** Business intelligence and dashboards for health trends.

**Target tooling:**
- Google Looker Studio connected to Firestore collections

Implementation details are defined in the product roadmap and data model design.
