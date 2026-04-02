import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aiResponses } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(request: NextRequest) {
  const adminKey = request.nextUrl.searchParams.get("key");
  if (adminKey !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, humanOverride } = await request.json();

  if (typeof id !== "number") {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await db
    .update(aiResponses)
    .set({ humanOverride: humanOverride ?? null })
    .where(eq(aiResponses.id, id));

  return NextResponse.json({ ok: true });
}
