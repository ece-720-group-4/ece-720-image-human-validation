import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  graphTypes,
  images,
  injectionTexts,
  raters,
  responses,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const adminKey = request.nextUrl.searchParams.get("key");
  if (adminKey !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allResponses = await db
    .select({
      responseId: responses.id,
      raterKey: raters.key,
      raterName: raters.name,
      imageFilename: images.filename,
      graphType: graphTypes.name,
      imageOpacity: images.opacity,
      imageFontSize: images.fontSize,
      imagePositionX: images.positionX,
      imagePositionY: images.positionY,
      imageHasInjection: images.hasInjection,
      injectionTextContent: injectionTexts.content,
      injectionTextLabel: injectionTexts.label,
      injectionTextAiPrompt: injectionTexts.aiPrompt,
      noticedAnomaly: responses.noticedAnomaly,
      responseTimeMs: responses.responseTimeMs,
      respondedAt: responses.createdAt,
    })
    .from(responses)
    .innerJoin(raters, eq(responses.raterId, raters.id))
    .innerJoin(images, eq(responses.imageId, images.id))
    .leftJoin(graphTypes, eq(images.graphTypeId, graphTypes.id))
    .leftJoin(injectionTexts, eq(images.injectionTextId, injectionTexts.id))
    .orderBy(responses.createdAt);

  if (allResponses.length === 0) {
    return new Response("No responses yet.\n", {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=responses.csv",
      },
    });
  }

  const headers = Object.keys(allResponses[0]);
  const csvRows = [
    headers.join(","),
    ...allResponses.map((row) =>
      headers
        .map((h) => {
          const val = row[h as keyof typeof row];
          const str = val == null ? "" : String(val);
          return str.includes(",") || str.includes('"')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(",")
    ),
  ];

  return new Response(csvRows.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=responses.csv",
    },
  });
}
