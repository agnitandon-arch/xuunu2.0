import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  return NextResponse.json({ received: Boolean(payload) });
}
