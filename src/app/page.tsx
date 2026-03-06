import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="max-w-lg">
        <CardContent className="flex flex-col gap-4 pt-6">
          <h1 className="text-2xl font-bold">
            ECE 720 — Image Validation Study
          </h1>
          <p className="text-muted-foreground">
            This application is part of a research study measuring the
            detectability of instruction text embedded in chart images. As a
            rater, you will view a series of charts and indicate whether you
            notice any anomalous text.
          </p>
          <div className="rounded-md border p-4 text-sm">
            <h2 className="mb-2 font-semibold">How it works</h2>
            <ol className="list-inside list-decimal space-y-1 text-muted-foreground">
              <li>Open the unique link provided to you</li>
              <li>Study each chart for 5 seconds</li>
              <li>
                Answer &quot;Yes&quot; or &quot;No&quot; — did you notice any
                unusual text?
              </li>
              <li>Repeat until all images are evaluated</li>
            </ol>
          </div>
          <p className="text-sm text-muted-foreground">
            If you have a rater key, append it as{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              /rate?key=YOUR_KEY
            </code>{" "}
            to access the evaluation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
