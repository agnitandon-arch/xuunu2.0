# Development Guide

## Prerequisites
- Node.js 18+
- npm
- PostgreSQL database (for API storage)
- Firebase project (Auth)
- Terra API account (optional for device sync)

## Installation

```bash
npm install
```

## Environment variables

Create a `.env` file in the project root.

### Firebase (client)
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

### Server and database
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - API and app server port (defaults to 5000)

### Environmental data
- `AIRNOW_API_KEY` - EPA AirNow API key for outdoor air quality

### AI insights
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY`
- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`

## Running locally

```bash
npm run dev
```

The app serves API routes and the client at `http://localhost:5000`.

## Database setup

Apply schema changes to your database:

```bash
npm run db:push
```

## Useful scripts

- `npm run dev` - Start the dev server
- `npm run build` - Build the client and server bundle
- `npm start` - Run the production server
- `npm run check` - Type check

## Implementation notes

- Client entry: `client/src/main.tsx`
- API routes: `server/routes.ts`
- Shared schemas: `shared/schema.ts`
- Design guidance: `design_guidelines.md`
