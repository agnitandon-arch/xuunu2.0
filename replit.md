# Xuunu - Health Tracking Platform

## Overview
Xuunu is a production-quality Progressive Web App (PWA) designed for individuals with diabetes and chronic illnesses. Its primary purpose is to provide a comprehensive platform for tracking personal health data, environmental factors, and medication adherence. The platform aims to offer advanced visualizations and impact analysis to help users understand the correlation between their health metrics and environmental conditions, ultimately enabling better self-management of their conditions. The long-term vision includes seamless integration with medical devices and healthcare providers.

## User Preferences
I prefer simple language and clear, concise explanations. When making changes, please prioritize iterative development, showing me progress along the way. Ask before making major architectural changes or introducing new external dependencies. I value a clean, minimalist coding style. Do not make changes to the `MOBILE_DEPLOYMENT.md` file.

## System Architecture
Xuunu is built as a Progressive Web App (PWA) with a focus on mobile-first design, specifically optimized for iOS.

### UI/UX Decisions
- **Color Scheme**: Strictly blue (#0066FF), black, and white for a minimalist, clinical aesthetic. No red/green indicators are used.
- **Design Philosophy**: Extreme minimalism, data-first approach where UI is invisible, and clinical precision.
- **Layout**: Utilizes a 5-tab bottom navigation for Dashboard, Data & Insights, Environmental, Pollutants, and Account.
- **PWA Features**: Full PWA implementation for iOS & Android, including service worker for offline functionality, `manifest.json`, custom icons, and iOS-specific meta tags for a full-screen experience.

### Technical Implementations
- **Frontend**: Vite + React + TypeScript, styled with Tailwind CSS.
- **Backend**: Express.js + TypeScript.
- **Database**: PostgreSQL integrated with Drizzle ORM for type-safe data operations.
- **Authentication**: Firebase Authentication (Email/Password, Google Sign-in) for secure user management.
- **Unit Preferences**: Users can select between Imperial and Metric units, with conversions for temperature, glucose, weight, and height.
- **Medication Tracking**: Comprehensive system for adding medications, setting reminders, and logging dosages with soft-delete functionality.
- **Health Metrics Dashboard**: Unified dashboard for manual entry of 5 key health metrics: Glucose, HRV, Sleep, Blood Pressure, and Heart Rate.
- **Environmental Monitoring**:
    - **Pollutants Screen**: Dedicated screen for 7 environmental categories (VOCs & Air Quality, Noise, Water Quality, Soil Quality, Light Exposure, Thermal Conditions, Radiation Exposure) with manual entry and color-coded quality indicators.
    - **Environmental Map Screen**: Location-based outdoor tracking with OpenStreetMap, displaying comprehensive environmental data (Air, Noise, Water, More) and past-hour impact analysis.

### Feature Specifications
- **Health Metrics**: Glucose, HRV, Sleep duration, Blood Pressure (Systolic/Diastolic), Heart Rate.
- **Environmental Categories**: VOCs & Air Quality, Noise Pollution, Water Quality, Soil Quality, Light Exposure, Thermal Conditions, Radiation Exposure.
- **Data Visualization**: Bio Signature (24x24 animated matrix visualizing 7 health metrics), Environmental Synergy Level (0-100 completion ring correlating health and environment).
- **Location Services**: Auto-detection via GPS, reverse geocoding to city names, and manual city selection for environmental data.
- **Data Policy**: Emphasis on real data only; all mock/fake data has been removed.

## External Dependencies
- **Firebase Authentication**: For user authentication (email/password, Google sign-in).
- **PostgreSQL**: Primary database for all application data.
- **Drizzle ORM**: Used for database interactions with PostgreSQL.
- **Terra API**: For integration with wearable devices like Apple Watch (requires user-provided API credentials).
- **EPA AirNow API**: For real-time outdoor air quality data (requires `AIRNOW_API_KEY`).
- **BigDataCloud API**: For reverse geocoding (no key required).
- **Awair API**: For indoor air quality monitoring device integration (requires API key).
- **IQAir AirVisual API**: For indoor air quality monitoring device integration (requires API key).
- **PurpleAir API**: For indoor air quality monitoring device integration (requires API key).
- **Airthings API**: For indoor air quality monitoring device integration (requires Client ID + Client Secret).
- **Netatmo Weather Station API**: For indoor environmental monitoring device integration (requires Client ID + Client Secret).
- **OpenStreetMap**: For map visualizations on the Environmental Map screen.