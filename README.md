# Xuunu - Track. Optimize. Perform.

Fitness tracking platform with comprehensive health context and personalized biosignature analysis. Built with Next.js 14, Firebase, Terra API, and Google Looker Studio.

🌐 **Live Site:** [https://xuunu.com](https://xuunu.com)

---

## ✨ Features

### Core Functionality
- **Activity Tracking** - Log workouts with photos, GPS, and detailed metrics
- **Health Device Integration** - Connect Apple Health, Google Fit, Fitbit, Oura, Whoop, Dexcom, and more via Terra API
- **Biosignature Analysis** - Personalized performance pattern calculated from 7 days of health data
- **Social Feed** - Share activities, like, comment, and follow other users
- **Analytics Dashboards** - Comprehensive insights via Google Looker Studio

### Health Metrics Tracked
- Sleep duration and quality
- Heart rate variability (HRV)
- Resting heart rate
- Blood glucose (CGM integration)
- Recovery scores
- Daily steps
- Weight tracking
- And more...

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Custom components with dark theme

### Backend
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth (Email + Google OAuth)
- **Storage:** Firebase Storage
- **Health Data:** Terra API

### Analytics
- **Dashboards:** Google Looker Studio
- **Data Source:** Firestore collections

### Deployment
- **Hosting:** Vercel
- **Domain:** xuunu.com
- **CI/CD:** Auto-deploy from GitHub

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Firebase project
- Terra API account
- Vercel account (for deployment)

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/your-org/xuunu.git
cd xuunu
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
Create a `.env` file in the project root.

```bash
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_APP_ID=your_firebase_app_id

DATABASE_URL=postgres://user:password@host:5432/xuunu
AIRNOW_API_KEY=your_airnow_api_key

AI_INTEGRATIONS_ANTHROPIC_API_KEY=your_anthropic_api_key
AI_INTEGRATIONS_ANTHROPIC_BASE_URL=your_anthropic_base_url

PORT=5000
```

4. **Start the development server:**
```bash
npm run dev
```

Visit `http://localhost:5000` in your browser.

### Database
This project uses PostgreSQL with Drizzle ORM for API storage.

```bash
npm run db:push
```

### Production Build
```bash
npm run build
npm start
```

---

## 📁 Project Structure

- `client/` - React + Vite front-end (PWA shell and UI)
- `server/` - Express API server
- `shared/` - Shared schemas and types
- `public/` - Static assets
- `scripts/` - Setup helpers and automation

---

## 📚 Documentation

- `docs/` - Project documentation (architecture, development, integrations)
- `design_guidelines.md` - UX/UI reference
- `ENVIRONMENTAL_API_INTEGRATION.md` - Environmental data sources and setup
- `MOBILE_DEPLOYMENT.md` - PWA deployment and app store guidance

---

## 🔐 Security and Compliance

Xuunu handles sensitive health data. If you deploy this project, ensure you:

- Maintain a privacy policy and terms of service
- Encrypt sensitive data at rest and in transit
- Provide user data export and deletion tooling
- Confirm compliance requirements (HIPAA, GDPR, or local regulations)

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch
3. Commit your changes
4. Open a pull request

---

## 📝 Notes on the Current Codebase

The production stack targets Next.js 14 and Firebase. This repository currently ships a Vite + React PWA with an Express API server for rapid iteration and prototyping. Refer to `docs/` for detailed implementation notes.
