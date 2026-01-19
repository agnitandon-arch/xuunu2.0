import { NextRequest, NextResponse } from "next/server";
import { calculateBiosignature } from "../../../../lib/biosignature/calculate";
import { saveBiosignature } from "../../../../lib/firebase/firestore";

export async function POST(request: NextRequest) {
  try {
    const { userId, weekStart } = await request.json();

    if (!userId || !weekStart) {
      return NextResponse.json(
        { error: "Missing userId or weekStart" },
        { status: 400 }
      );
    }

    const biosignature = await calculateBiosignature(userId, weekStart);

    await saveBiosignature(userId, weekStart, biosignature);

    return NextResponse.json({ success: true, biosignature });
  } catch (error: any) {
    console.error("Biosignature calculation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to calculate biosignature" },
      { status: 500 }
    );
  }
}
