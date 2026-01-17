import { NextRequest, NextResponse } from "next/server";
import { calculateBiosignatureForUser, MIN_DAYS_REQUIRED } from "../lib";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid JSON payload." },
        { status: 400 },
      );
    }

    const userId =
      typeof (payload as { userId?: unknown })?.userId === "string"
        ? (payload as { userId: string }).userId.trim()
        : "";

    if (!userId) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    const result = await calculateBiosignatureForUser(userId);

    if (result.status === "insufficient-data") {
      return NextResponse.json(
        { error: `Insufficient data. Need at least ${MIN_DAYS_REQUIRED} days.` },
        { status: 400 },
      );
    }

    return NextResponse.json({
      score: result.score,
      insights: result.insights,
      weekStartDate: result.weekStartDate,
    });
  } catch (error) {
    console.error("Biosignature calculation error:", error);
    return NextResponse.json({ error: "Calculation failed" }, { status: 500 });
  }
}
