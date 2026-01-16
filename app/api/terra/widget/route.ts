import { NextRequest, NextResponse } from 'next/server';
import { generateWidgetSession } from '@/lib/terra/client';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }
    
    const widgetUrl = await generateWidgetSession(userId);
    
    return NextResponse.json({ url: widgetUrl });
    
  } catch (error) {
    console.error('Terra widget error:', error);
    return NextResponse.json({ error: 'Failed to generate widget URL' }, { status: 500 });
  }
}
