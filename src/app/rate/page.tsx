"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const VIEWING_TIME_MS = 5000;

interface ImageData {
  id: number;
  blobUrl: string;
  filename: string;
}

interface ApiResponse {
  done: boolean;
  image: ImageData | null;
  progress?: { answered: number; total: number };
}

type Phase =
  | "instructions"
  | "loading"
  | "viewing"
  | "answering"
  | "done"
  | "invalid_key"
  | "no_images";

export default function RatePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const key = searchParams.get("key");

  const [phase, setPhase] = useState<Phase>("instructions");
  const [currentImage, setCurrentImage] = useState<ImageData | null>(null);
  const [progress, setProgress] = useState({ answered: 0, total: 0 });
  const [timeLeft, setTimeLeft] = useState(VIEWING_TIME_MS);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const viewingStartRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNextImage = useCallback(async () => {
    if (!key) return;
    setPhase("loading");

    const res = await fetch(`/api/images?key=${encodeURIComponent(key)}`);

    if (res.status === 404) {
      setErrorMessage("The rater key you provided does not exist.");
      setPhase("invalid_key");
      return;
    }

    if (!res.ok) {
      setErrorMessage("Something went wrong. Please try again later.");
      setPhase("invalid_key");
      return;
    }

    const data: ApiResponse = await res.json();

    if (data.progress && data.progress.total === 0) {
      setPhase("no_images");
      return;
    }

    if (data.done || !data.image) {
      setPhase("done");
      router.push(`/rate/complete?key=${encodeURIComponent(key)}`);
      return;
    }

    setCurrentImage(data.image);
    if (data.progress) setProgress(data.progress);
    setTimeLeft(VIEWING_TIME_MS);
    setPhase("viewing");
    viewingStartRef.current = Date.now();
  }, [key, router]);

  useEffect(() => {
    if (phase !== "viewing") return;

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - viewingStartRef.current;
      const remaining = Math.max(0, VIEWING_TIME_MS - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setPhase("answering");
      }
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  const handleAnswer = async (noticedAnomaly: boolean) => {
    if (!currentImage || !key || submitting) return;
    setSubmitting(true);

    const responseTimeMs = Date.now() - viewingStartRef.current;

    await fetch("/api/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key,
        imageId: currentImage.id,
        noticedAnomaly,
        responseTimeMs,
      }),
    });

    setSubmitting(false);
    fetchNextImage();
  };

  if (!key) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Missing rater key. Please use the link provided to you.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "invalid_key") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <span className="text-2xl text-destructive">!</span>
            </div>
            <h1 className="text-xl font-bold">Invalid Key</h1>
            <p className="text-muted-foreground">{errorMessage}</p>
            <p className="text-sm text-muted-foreground">
              Please check that you are using the correct link. If you believe
              this is an error, contact the researcher who provided your link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "no_images") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <span className="text-2xl">📭</span>
            </div>
            <h1 className="text-xl font-bold">No Images Available</h1>
            <p className="text-muted-foreground">
              There are currently no images to evaluate. The study may not have
              been set up yet, or the image set is being prepared.
            </p>
            <p className="text-sm text-muted-foreground">
              Please try again later or contact the researcher for more
              information.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "instructions") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-lg">
          <CardContent className="flex flex-col gap-5 pt-6">
            <h1 className="text-2xl font-bold">
              ECE 720 — Image Validation Study
            </h1>
            <p className="text-muted-foreground">
              Thank you for participating in this research study. You will be
              shown a series of chart images one at a time. Your task is to
              determine whether each chart contains any anomalous or unusual
              text.
            </p>
            <div className="rounded-md border p-4 text-sm">
              <h2 className="mb-2 font-semibold">How it works</h2>
              <ol className="list-inside list-decimal space-y-1.5 text-muted-foreground">
                <li>Each chart will be displayed for 5 seconds</li>
                <li>Study the chart carefully during that time</li>
                <li>
                  After 5 seconds, answer <strong>Yes</strong> or{" "}
                  <strong>No</strong> — did you notice any unusual or out-of-place
                  text?
                </li>
                <li>The next chart will load automatically</li>
                <li>Repeat until all images have been evaluated</li>
              </ol>
            </div>
            <p className="text-sm text-muted-foreground">
              Please complete the evaluation in one sitting if possible. There
              is no way to pause and resume.
            </p>
            <Button size="lg" onClick={() => fetchNextImage()}>
              Begin Evaluation
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const timerPercent = (timeLeft / VIEWING_TIME_MS) * 100;
  const progressPercent =
    progress.total > 0 ? (progress.answered / progress.total) * 100 : 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4">
      <div className="w-full max-w-2xl space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Image {progress.answered + 1} of {progress.total}
          </span>
          <span>{Math.round(progressPercent)}% complete</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      <Card className="w-full max-w-2xl">
        <CardContent className="flex flex-col items-center gap-4 pt-6">
          {phase === "loading" && (
            <div className="flex h-80 w-full items-center justify-center">
              <p className="text-muted-foreground">Loading next image...</p>
            </div>
          )}

          {phase === "viewing" && currentImage && (
            <>
              <div className="w-full space-y-2">
                <Progress value={timerPercent} className="h-1" />
                <p className="text-center text-sm text-muted-foreground">
                  Study the chart — {Math.ceil(timeLeft / 1000)}s remaining
                </p>
              </div>
              <div className="relative h-80 w-full">
                <Image
                  src={`/api/blob?url=${encodeURIComponent(currentImage.blobUrl)}`}
                  alt="Chart to evaluate"
                  fill
                  className="object-contain"
                  unoptimized
                  priority
                />
              </div>
            </>
          )}

          {phase === "answering" && (
            <>
              <p className="text-center text-lg font-medium">
                Did you notice any anomalous or unusual text in the chart?
              </p>
              <div className="flex gap-4">
                <Button
                  size="lg"
                  variant="default"
                  onClick={() => handleAnswer(true)}
                  disabled={submitting}
                  className="min-w-28"
                >
                  Yes
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => handleAnswer(false)}
                  disabled={submitting}
                  className="min-w-28"
                >
                  No
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
