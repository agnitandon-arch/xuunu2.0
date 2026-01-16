import crypto from 'crypto';

const TERRA_API_URL = 'https://api.tryterra.co/v2';

export async function generateWidgetSession(userId: string): Promise<string> {
  const response = await fetch(`${TERRA_API_URL}/auth/generateWidgetSession`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'dev-id': process.env.TERRA_DEV_ID!,
      'x-api-key': process.env.TERRA_API_KEY!,
    },
    body: JSON.stringify({
      reference_id: userId,
      providers: 'APPLE_HEALTH,GOOGLE_FIT,FITBIT,OURA,WHOOP,FREESTYLE_LIBRE,DEXCOM',
      language: 'en',
      auth_success_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://xuunu.com'}/onboarding?step=4`,
      auth_failure_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://xuunu.com'}/onboarding?step=3&error=true`,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate Terra widget session');
  }

  const data = await response.json();
  return data.url;
}

export async function getUserConnections(userId: string): Promise<any> {
  const response = await fetch(`${TERRA_API_URL}/userInfo?user_id=${userId}`, {
    headers: {
      'dev-id': process.env.TERRA_DEV_ID!,
      'x-api-key': process.env.TERRA_API_KEY!,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get user connections');
  }

  return response.json();
}

export async function deauthUser(userId: string): Promise<void> {
  await fetch(`${TERRA_API_URL}/auth/deauthenticateUser`, {
    method: 'DELETE',
    headers: {
      'dev-id': process.env.TERRA_DEV_ID!,
      'x-api-key': process.env.TERRA_API_KEY!,
    },
    body: JSON.stringify({ user_id: userId }),
  });
}
