import { Card, CardContent } from "@/components/ui/card";

export default function CompletePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="max-w-md">
        <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
          <h1 className="text-2xl font-bold">Thank You!</h1>
          <p className="text-muted-foreground">
            You have completed all the image evaluations. Your responses have
            been recorded and will help us measure the detectability of visual
            instruction text in charts.
          </p>
          <p className="text-sm text-muted-foreground">
            You can safely close this window.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
