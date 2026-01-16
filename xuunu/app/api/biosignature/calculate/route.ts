import { NextResponse } from "next/server";
import { calculateBiosignature } from "@/lib/biosignature/calculate";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));
  const result = calculateBiosignature(payload);
  return NextResponse.json(result);
}
