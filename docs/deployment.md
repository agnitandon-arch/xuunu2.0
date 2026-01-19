# Deployment Guide

## Overview

Xuunu can be deployed as a web application and distributed as a PWA.
The production target uses Vercel for hosting with automated deploys from GitHub.
The current repository also supports a Node server that serves the API and client bundle.

## Web deployment

### Build and run

```bash
npm run build
npm start
```

Ensure required environment variables are configured for production:
- `DATABASE_URL`
- `AIRNOW_API_KEY`
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY`
- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`
- Firebase client variables with `VITE_` prefix

### Vercel

If deploying the production Next.js stack:
- Configure environment variables in the Vercel dashboard.
- Connect the GitHub repository for automatic deployments.
- Set the production domain to `xuunu.com`.

## PWA deployment

Follow the PWA and app store guidance in `MOBILE_DEPLOYMENT.md`.

## Post-deploy checklist

- Verify Firebase authorized domains.
- Confirm database connectivity.
- Validate API integrations for AirNow and Terra.
- Smoke test core flows: sign in, track entry, environmental data.
