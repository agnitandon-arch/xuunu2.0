import { NextRequest, NextResponse } from 'next/server';
import { generateWidgetSession } from '../../../../lib/terra/client';
import { isTerraLabsEnabled } from '../../../../lib/featureFlags';

export async function POST(request: NextRequest) {
  try {
    const { userId, mode } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const widgetMode = mode === 'labs' ? 'labs' : 'wearables';
    if (widgetMode === 'labs' && !isTerraLabsEnabled()) {
      return NextResponse.json({ error: 'Terra Labs disabled' }, { status: 403 });
    }

    const widgetUrl = await generateWidgetSession(userId, widgetMode);

    return NextResponse.json({ url: widgetUrl });
  } catch (error) {
    console.error('Terra widget error:', error);
    return NextResponse.json(
      { error: 'Failed to generate widget URL' },
      { status: 500 }
    );
  }
}
