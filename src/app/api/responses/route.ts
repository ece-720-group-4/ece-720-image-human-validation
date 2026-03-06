import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { raters, responses } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { key, imageId, noticedAnomaly, responseTimeMs } = body;

  if (!key || imageId == null || noticedAnomaly == null || responseTimeMs == null) {
    return NextResponse.json(
      { error: "Missing required fields: key, imageId, noticedAnomaly, responseTimeMs" },
      { status: 400 }
    );
  }

  const rater = await db.query.raters.findFirst({
    where: eq(raters.key, key),
  });

  if (!rater) {
    return NextResponse.json({ error: "Invalid rater key" }, { status: 404 });
  }

  const [inserted] = await db
    .insert(responses)
    .values({
      raterId: rater.id,
      imageId,
      noticedAnomaly,
      responseTimeMs,
    })
    .returning();

  return NextResponse.json({ success: true, response: inserted });
}
