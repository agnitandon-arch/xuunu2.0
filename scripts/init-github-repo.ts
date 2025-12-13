import { getUncachableGitHubClient } from '../server/lib/github';

async function initializeRepo() {
  try {
    const octokit = await getUncachableGitHubClient();
    const owner = 'agnitandon-arch';
    const repo = 'xuunu';

    console.log('📝 Creating initial README...');
    
    const readmeContent = `# Xuunu - Health Tracking Platform

Production-quality Progressive Web App (PWA) for iOS & Android tracking comprehensive health and environmental data for people with diabetes and chronic illness.

## Features

- **Health Metrics Tracking**: Glucose, HRV, Sleep, Blood Pressure, Heart Rate
- **Environmental Monitoring**: Track 7 environmental categories with manual entry and device integration
- **Medication Management**: Set reminders, log doses, track adherence
- **Unit Preferences**: Choose between Imperial and Metric units
- **Progressive Web App**: Install on iOS & Android devices
- **Real-time Data**: All data from user inputs, integrations, and location services
- **Firebase Authentication**: Secure user management
- **Terra API Integration**: Connect wearable devices like Apple Watch
- **Indoor Air Quality**: Connect devices from Awair, IQAir, PurpleAir, Airthings, Netatmo

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **Authentication**: Firebase Auth
- **APIs**: Terra API, EPA AirNow, BigDataCloud

## Design Philosophy

Extreme minimalism with a strict color palette:
- **Blue**: #0066FF (primary actions and branding)
- **Black**: Background and text
- **White**: Text and accents

Data-first approach where the UI is invisible and clinical precision is paramount.

## Getting Started

1. Clone the repository
2. Install dependencies: \`npm install\`
3. Set up environment variables (see .env.example)
4. Run development server: \`npm run dev\`

## License

All rights reserved.
`;

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'README.md',
      message: 'Initial commit: Add README',
      content: Buffer.from(readmeContent).toString('base64'),
    });

    console.log('✅ README created successfully');
    console.log('🔗 View at: https://github.com/' + owner + '/' + repo);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

initializeRepo();
