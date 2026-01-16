import { NextRequest, NextResponse } from 'next/server';
import { verifyTerraSignature } from '@/lib/terra/verify';
import { processTerraWebhook } from '@/lib/terra/dataProcessor';

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('terra-signature');
    const body = await request.text();
    
    const isValid = verifyTerraSignature(body, signature, process.env.TERRA_SECRET!);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    const data = JSON.parse(body);
    const { user, type } = data;
    
    if (!user?.user_id) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }
    
    await processTerraWebhook(user.user_id, type, data);
    
    return NextResponse.json({ status: 'success' });
    
  } catch (error) {
    console.error('Terra webhook error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
