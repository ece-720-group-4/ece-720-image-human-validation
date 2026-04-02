"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const VIEWING_TIME_MS = 1000;
const PRELOAD_WINDOW = 5;

interface ImageData {
  id: number;
  blobUrl: string;
  filename: string;
}

type Phase =
  | "instructions"
  | "loading"
  | "viewing"
  | "done"
  | "invalid_key"
  | "no_images";

function blobSrc(blobUrl: string) {
  return `/api/blob?url=${encodeURIComponent(blobUrl)}`;
}

function preloadBlob(url: string) {
  if (typeof window === "undefined") return;
  const img = new window.Image();
  img.src = url;
}

export default function RatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <RateContent />
    </Suspense>
  );
}

function RateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const key = searchParams.get("key");

  const [phase, setPhase] = useState<Phase>("instructions");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(VIEWING_TIME_MS);

  const queueRef = useRef<ImageData[]>([]);
  const indexRef = useRef(0);
  const [currentImage, setCurrentImage] = useState<ImageData | null>(null);
  const [total, setTotal] = useState(0);
  const [answeredBase, setAnsweredBase] = useState(0);
  const [localAnswered, setLocalAnswered] = useState(0);

  const viewingStartRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const viewingKeyRef = useRef(0);
  const [viewingKey, setViewingKey] = useState(0);
  const preloadedUpToRef = useRef(0);

  const preloadAhead = useCallback((fromIndex: number, queue: ImageData[]) => {
    const end = Math.min(fromIndex + PRELOAD_WINDOW, queue.length);
    for (let i = preloadedUpToRef.current; i < end; i++) {
      preloadBlob(blobSrc(queue[i].blobUrl));
    }
    preloadedUpToRef.current = Math.max(preloadedUpToRef.current, end);
  }, []);

  const showImageAtIndex = useCallback(
    (idx: number) => {
      const queue = queueRef.current;
      if (idx >= queue.length) {
        router.push(`/rate/complete?key=${encodeURIComponent(key!)}`);
        setPhase("done");
        return;
      }

      if (timerRef.current) clearInterval(timerRef.current);
      setCurrentImage(queue[idx]);
      setTimeLeft(VIEWING_TIME_MS);
      viewingStartRef.current = Date.now();
      viewingKeyRef.current += 1;
      setViewingKey(viewingKeyRef.current);
      setPhase("viewing");

      preloadAhead(idx + 1, queue);
    },
    [key, router, preloadAhead]
  );

  const loadAllImages = useCallback(async () => {
    if (!key) return;
    setPhase("loading");

    const res = await fetch(
      `/api/images/all?key=${encodeURIComponent(key)}`
    );

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

    const data = await res.json();
    const imgs: ImageData[] = data.images;

    if (data.total === 0) {
      setPhase("no_images");
      return;
    }

    if (imgs.length === 0) {
      router.push(`/rate/complete?key=${encodeURIComponent(key)}`);
      setPhase("done");
      return;
    }

    setTotal(data.total);
    setAnsweredBase(data.answered);
    setLocalAnswered(0);
    queueRef.current = imgs;
    indexRef.current = 0;
    preloadedUpToRef.current = 0;

    preloadAhead(0, imgs);
    showImageAtIndex(0);
  }, [key, router, preloadAhead, showImageAtIndex]);

  useEffect(() => {
    if (phase !== "viewing") return;

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - viewingStartRef.current;
      const remaining = Math.max(0, VIEWING_TIME_MS - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, viewingKey]);

  const handleAnswer = (noticedAnomaly: boolean) => {
    if (!currentImage || !key || submitting) return;
    setSubmitting(true);

    const responseTimeMs = Date.now() - viewingStartRef.current;

    fetch("/api/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key,
        imageId: currentImage.id,
        noticedAnomaly,
        responseTimeMs,
      }),
    });

    const nextIdx = indexRef.current + 1;
    indexRef.current = nextIdx;
    setLocalAnswered((prev) => prev + 1);
    setSubmitting(false);
    showImageAtIndex(nextIdx);
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
                <li>Each chart will be displayed with a 1-second countdown</li>
                <li>Study the chart carefully</li>
                <li>
                  Click <strong>Yes</strong> or <strong>No</strong> at any time
                  — did you notice any unusual or out-of-place text?
                </li>
                <li>The next chart will load automatically</li>
                <li>Repeat until all images have been evaluated</li>
              </ol>
            </div>
            <p className="text-sm text-muted-foreground">
              Please complete the evaluation in one sitting if possible. There
              is no way to pause and resume.
            </p>
            <Button size="lg" onClick={() => loadAllImages()}>
              Begin Evaluation
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const answered = answeredBase + localAnswered;
  const timerPercent = (timeLeft / VIEWING_TIME_MS) * 100;
  const progressPercent = total > 0 ? (answered / total) * 100 : 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4">
      <div className="w-full max-w-2xl space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Image {answered + 1} of {total}
          </span>
          <span>{Math.round(progressPercent)}% complete</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      <Card className="w-full max-w-2xl">
        <CardContent className="flex flex-col items-center gap-4 pt-6">
          {phase === "loading" && (
            <div className="flex h-80 w-full items-center justify-center">
              <p className="text-muted-foreground">Loading images...</p>
            </div>
          )}

          {phase === "viewing" && currentImage && (
            <>
              <div className="w-full space-y-2">
                {timeLeft > 0 ? (
                  <>
                    <Progress value={timerPercent} className="h-1" />
                    <p className="text-center text-sm text-muted-foreground">
                      Study the chart — {Math.ceil(timeLeft / 1000)}s remaining
                    </p>
                  </>
                ) : (
                  <p className="text-center text-lg font-medium">
                    Did you notice any anomalous or unusual text?
                  </p>
                )}
              </div>

              <div className="flex h-136 w-full items-center justify-center rounded-md border bg-muted/30">
                {timeLeft > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={blobSrc(currentImage.blobUrl)}
                    alt="Chart to evaluate"
                    className="max-h-full max-w-full object-contain p-2"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Time&apos;s up! Did you spot anything unusual?
                  </p>
                )}
              </div>

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
