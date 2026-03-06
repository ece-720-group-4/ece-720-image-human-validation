import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { images, raters, responses } from "@/db/schema";
import { eq, notInArray, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "Missing rater key" }, { status: 400 });
  }

  const rater = await db.query.raters.findFirst({
    where: eq(raters.key, key),
  });

  if (!rater) {
    return NextResponse.json({ error: "Invalid rater key" }, { status: 404 });
  }

  const answeredImageIds = db
    .select({ imageId: responses.imageId })
    .from(responses)
    .where(eq(responses.raterId, rater.id));

  const remaining = await db
    .select()
    .from(images)
    .where(notInArray(images.id, answeredImageIds))
    .orderBy(sql`RANDOM()`)
    .limit(1);

  if (remaining.length === 0) {
    return NextResponse.json({ done: true, image: null });
  }

  const totalImages = await db
    .select({ count: sql<number>`count(*)` })
    .from(images);
  const answeredCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(responses)
    .where(eq(responses.raterId, rater.id));

  return NextResponse.json({
    done: false,
    image: remaining[0],
    progress: {
      answered: Number(answeredCount[0].count),
      total: Number(totalImages[0].count),
    },
  });
}
