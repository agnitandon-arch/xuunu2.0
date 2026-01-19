# Xuunu

Xuunu is a health tracking platform for performance, recovery, and chronic illness management. It combines activity data, biosignature analysis, and environmental context to deliver personalized insights.

## Project Structure

- `app/`: Next.js-style routes used for onboarding, profile, and API endpoints
- `client/`: Vite + React frontend (primary UI build output)
- `components/`: Shared UI components
- `lib/`: Firebase, Terra, biosignature logic
- `server/`: Express API backend for Vite runtime
- `shared/`: Shared schemas and types
- `public/`: Static assets served at the web root

## Local Setup

```bash
npm install
```

```bash
npm run dev
```

## Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

---

## Terra API Integration

### Supported Providers

- Apple Health
- Google Fit
- Fitbit
- Oura Ring
- Whoop
- Dexcom (CGM)
- FreeStyle Libre
- And more

### Webhook Setup

1. In Terra Dashboard: https://dashboard.tryterra.co
2. Go to Settings -> Webhooks
3. Set webhook URL: `https://xuunu.com/api/terra/webhook`
4. Save your signing secret to `TERRA_SECRET` environment variable

### Data Flow

1. User connects device via Terra widget
2. Terra sends webhook when new data is available
3. Webhook endpoint processes and stores data in Firestore
4. Data used for biosignature calculation and Looker Studio dashboards

---

## Google Looker Studio Dashboards

### Setup Instructions

1. Go to https://lookerstudio.google.com
2. Create a new report
3. Connect to Firestore data source
4. Use collections: `activities`, `healthData`, `biosignatures`
5. Build visualizations for:
   - Performance metrics (distance, pace, calories)
   - Health trends (sleep, HRV, glucose)
   - Recovery patterns
   - Energy and nutrition
6. Publish dashboard and get embed URL
7. Add URL to environment variables in Vercel:
   - `NEXT_PUBLIC_LOOKER_PERFORMANCE_DASHBOARD_URL`
   - `NEXT_PUBLIC_LOOKER_HEALTH_DASHBOARD_URL`
   - `NEXT_PUBLIC_LOOKER_RECOVERY_DASHBOARD_URL`
   - `NEXT_PUBLIC_LOOKER_ENERGY_DASHBOARD_URL`

---

## Deployment

### Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Environment Variables

Add all environment variables in Vercel dashboard:
- Project Settings -> Environment Variables
- Add all variables from `.env.local`

### Custom Domain

1. In Vercel: Settings -> Domains -> Add Domain
2. Add: `xuunu.com`
3. Update DNS records at your registrar:
   - A record: `@` -> `76.76.21.21`
   - CNAME record: `www` -> `cname.vercel-dns.com`

### Auto-Deployment

Push to GitHub main branch triggers automatic deployment:

```bash
git add .
git commit -m "Update feature"
git push origin main
```

---

## Biosignature Calculation

The biosignature is a personalized performance pattern calculated from 7 days of health data.

### Metrics

- Energy Score (0-100): Based on daily steps and glucose stability
- Recovery Score (0-100): Based on HRV and resting heart rate
- Sleep Quality Score (0-100): Based on sleep duration and quality
- Readiness Score (0-100): Based on overall recovery metrics

### Insights

Personalized recommendations based on your data patterns:
- Sleep optimization suggestions
- Recovery techniques
- Activity level recommendations
- Readiness for intense workouts

---

## License

This project is proprietary software. All rights reserved.

---

## Contributing

This is a private project. For questions or issues, contact the development team.

---

## Contact

- Website: https://xuunu.com
- GitHub: https://github.com/agnitandon-arch/xuunu2.0

---

## Roadmap

### Completed

- User authentication (email + Google)
- Activity logging with photos
- Health device integration (Terra API)
- Biosignature calculation
- Social feed
- Looker Studio dashboards
- Production deployment

### In Progress

- Mobile app (React Native)
- Advanced analytics
- Team/coaching features

### Planned

- Nutrition tracking
- Workout plans
- Social features expansion
- AI-powered insights

---

Built with love for performance optimization.
