import { isTerraLabsEnabled } from '../featureFlags';

const TERRA_API_URL = 'https://api.tryterra.co/v2';
const WEARABLE_PROVIDERS =
  'APPLE_HEALTH,GOOGLE_FIT,FITBIT,OURA,WHOOP,FREESTYLE_LIBRE,DEXCOM';
const LAB_PROVIDERS = 'QUEST,LABCORP,EVERLYWELL,LETSGETCHECKED';

type WidgetMode = 'wearables' | 'labs';

export async function generateWidgetSession(
  userId: string,
  mode: WidgetMode = 'wearables'
): Promise<string> {
  if (mode === 'labs' && !isTerraLabsEnabled()) {
    throw new Error('Terra Labs feature disabled');
  }

  const providers = mode === 'labs' ? LAB_PROVIDERS : WEARABLE_PROVIDERS;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://xuunu.com';
  const successRedirect =
    mode === 'labs'
      ? `${appUrl}/bloodwork?connected=true`
      : `${appUrl}/onboarding?step=4`;
  const failureRedirect =
    mode === 'labs'
      ? `${appUrl}/bloodwork?error=true`
      : `${appUrl}/onboarding?step=3&error=true`;

  const response = await fetch(`${TERRA_API_URL}/auth/generateWidgetSession`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'dev-id': process.env.TERRA_DEV_ID!,
      'x-api-key': process.env.TERRA_API_KEY!,
    },
    body: JSON.stringify({
      reference_id: userId,
      providers,
      language: 'en',
      auth_success_redirect_url: successRedirect,
      auth_failure_redirect_url: failureRedirect,
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
