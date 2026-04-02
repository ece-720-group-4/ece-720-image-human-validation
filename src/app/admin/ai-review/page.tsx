import { redirect } from "next/navigation";
import { db } from "@/db";
import { aiResponses, images, injectionTexts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AiOverrideToggle } from "@/components/ai-override-toggle";

interface Props {
  searchParams: Promise<{ key?: string }>;
}

export default async function AiReviewPage({ searchParams }: Props) {
  const { key } = await searchParams;

  if (key !== process.env.ADMIN_KEY) {
    redirect("/");
  }

  const results = await db
    .select({
      aiId: aiResponses.id,
      imageId: aiResponses.imageId,
      rawResponse: aiResponses.rawResponse,
      isManipulated: aiResponses.isManipulated,
      humanOverride: aiResponses.humanOverride,
      createdAt: aiResponses.createdAt,
      blobUrl: images.blobUrl,
      filename: images.filename,
      promptFamily: images.promptFamily,
      scenario: images.scenario,
      hasInjection: images.hasInjection,
      taskPrompt: images.taskPrompt,
      injectionContent: injectionTexts.content,
      injectionLabel: injectionTexts.label,
      defenseType: aiResponses.defenseType,
      missCount: sql<number>`(
        SELECT COUNT(*) FROM responses r
        WHERE r.image_id = ${images.id} AND r.noticed_anomaly = false
      )`,
    })
    .from(aiResponses)
    .leftJoin(images, eq(aiResponses.imageId, images.id))
    .leftJoin(injectionTexts, eq(images.injectionTextId, injectionTexts.id))
    .orderBy(aiResponses.id);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">AI Review</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {results.length} AI evaluations
            </p>
          </div>
          <a
            href={`/admin?key=${encodeURIComponent(key!)}`}
            className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
          >
            ← Back to Dashboard
          </a>
        </div>

        <div className="grid gap-6">
          {results.map((r) => (
            <Card key={r.aiId}>
              <CardContent className="pt-6">
                <div className="flex gap-6">
                  <div className="shrink-0">
                    <img
                      src={`/api/blob?url=${encodeURIComponent(r.blobUrl ?? "")}`}
                      alt={r.filename ?? "chart"}
                      className="w-64 rounded border object-contain"
                    />
                  </div>

                  <div className="flex flex-col gap-3 flex-1 min-w-0">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="font-mono text-sm text-muted-foreground">
                        #{r.aiId}
                      </span>
                      <Badge variant={r.hasInjection ? "default" : "secondary"}>
                        {r.hasInjection ? "Injected" : "Control"}
                      </Badge>
                      {Number(r.missCount) > 0 && (
                        <Badge variant="outline" className="border-orange-400 text-orange-600 dark:text-orange-400">
                          {Number(r.missCount)} miss{Number(r.missCount) !== 1 ? "es" : ""}
                        </Badge>
                      )}
                      {r.promptFamily && (
                        <Badge variant="outline" className="capitalize">
                          {r.promptFamily.replace(/_/g, " ")}
                        </Badge>
                      )}
                      {r.defenseType && (
                        <Badge
                          variant={r.defenseType === "none" ? "secondary" : "outline"}
                          className={r.defenseType !== "none" ? "border-green-500 text-green-700 dark:text-green-400" : ""}
                        >
                          {r.defenseType === "none" ? "No defense" : r.defenseType.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </div>

                    {r.scenario && (
                      <p className="text-sm text-muted-foreground font-mono truncate">
                        {r.scenario}
                      </p>
                    )}

                    {r.injectionContent && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Injection Prompt
                          {r.injectionLabel && (
                            <span className="ml-2 normal-case font-normal">
                              ({r.injectionLabel})
                            </span>
                          )}
                        </p>
                        <p className="text-sm font-mono bg-yellow-50 dark:bg-yellow-950 text-yellow-900 dark:text-yellow-100 border border-yellow-200 dark:border-yellow-800 rounded px-3 py-2">
                          {r.injectionContent}
                        </p>
                      </div>
                    )}

                    {r.taskPrompt && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          AI Prompt
                          {r.defenseType && r.defenseType !== "none" && (
                            <span className="ml-2 normal-case font-normal text-green-700 dark:text-green-400">
                              + defense prefix
                            </span>
                          )}
                        </p>
                        <p className="text-sm bg-muted rounded px-3 py-2 leading-relaxed">
                          {r.taskPrompt}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          AI Decision
                        </p>
                        <Badge
                          variant={r.isManipulated ? "destructive" : "secondary"}
                        >
                          {r.isManipulated === null
                            ? "—"
                            : r.isManipulated
                            ? "Manipulated"
                            : "Not manipulated"}
                        </Badge>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Human Override
                        </p>
                        <AiOverrideToggle
                          aiResponseId={r.aiId}
                          initialOverride={r.humanOverride ?? null}
                          adminKey={key!}
                        />
                      </div>
                    </div>

                    {r.rawResponse && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          AI Response
                        </p>
                        <p className="text-sm bg-muted rounded p-3 leading-relaxed">
                          {r.rawResponse}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {results.length === 0 && (
            <p className="text-center text-muted-foreground py-16">
              No AI evaluations yet. Run{" "}
              <code className="font-mono bg-muted px-1 rounded">
                npm run ai-eval
              </code>{" "}
              to generate them.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
