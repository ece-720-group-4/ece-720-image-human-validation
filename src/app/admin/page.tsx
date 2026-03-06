import { redirect } from "next/navigation";
import { db } from "@/db";
import { images, raters, responses } from "@/db/schema";
import { eq, sql, count } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Props {
  searchParams: Promise<{ key?: string }>;
}

export default async function AdminPage({ searchParams }: Props) {
  const { key } = await searchParams;

  if (key !== process.env.ADMIN_KEY) {
    redirect("/");
  }

  const totalImages = await db
    .select({ value: count() })
    .from(images);

  const totalResponses = await db
    .select({ value: count() })
    .from(responses);

  const totalRaters = await db
    .select({ value: count() })
    .from(raters);

  const raterStats = await db
    .select({
      raterKey: raters.key,
      raterName: raters.name,
      responseCount: count(responses.id),
    })
    .from(raters)
    .leftJoin(responses, eq(raters.id, responses.raterId))
    .groupBy(raters.id, raters.key, raters.name)
    .orderBy(raters.key);

  const categoryStats = await db
    .select({
      category: images.category,
      hasInjection: images.hasInjection,
      totalShown: count(responses.id),
      noticedCount: sql<number>`sum(case when ${responses.noticedAnomaly} = true then 1 else 0 end)`,
    })
    .from(images)
    .leftJoin(responses, eq(images.id, responses.imageId))
    .groupBy(images.category, images.hasInjection)
    .orderBy(images.category);

  const contrastStats = await db
    .select({
      contrast: images.contrast,
      totalShown: count(responses.id),
      noticedCount: sql<number>`sum(case when ${responses.noticedAnomaly} = true then 1 else 0 end)`,
    })
    .from(images)
    .innerJoin(responses, eq(images.id, responses.imageId))
    .where(eq(images.hasInjection, true))
    .groupBy(images.contrast)
    .orderBy(images.contrast);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <a
            href={`/api/admin/export?key=${encodeURIComponent(key!)}`}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            Export CSV
          </a>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Images</p>
              <p className="text-3xl font-bold">{totalImages[0].value}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Responses</p>
              <p className="text-3xl font-bold">{totalResponses[0].value}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Raters</p>
              <p className="text-3xl font-bold">{totalRaters[0].value}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            <h2 className="mb-4 text-xl font-semibold">Rater Progress</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Responses</TableHead>
                  <TableHead className="text-right">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {raterStats.map((r) => (
                  <TableRow key={r.raterKey}>
                    <TableCell className="font-mono text-sm">
                      {r.raterKey}
                    </TableCell>
                    <TableCell>{r.raterName ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {r.responseCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {totalImages[0].value > 0
                        ? Math.round(
                            (Number(r.responseCount) / totalImages[0].value) *
                              100
                          )
                        : 0}
                      %
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h2 className="mb-4 text-xl font-semibold">
              Detection by Category
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Injection</TableHead>
                  <TableHead className="text-right">Shown</TableHead>
                  <TableHead className="text-right">Noticed</TableHead>
                  <TableHead className="text-right">Detection Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryStats.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell>{c.category}</TableCell>
                    <TableCell>
                      <Badge variant={c.hasInjection ? "default" : "secondary"}>
                        {c.hasInjection ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{c.totalShown}</TableCell>
                    <TableCell className="text-right">
                      {Number(c.noticedCount ?? 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(c.totalShown) > 0
                        ? Math.round(
                            (Number(c.noticedCount ?? 0) /
                              Number(c.totalShown)) *
                              100
                          )
                        : 0}
                      %
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h2 className="mb-4 text-xl font-semibold">
              Detection by Contrast Level (Injected Only)
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contrast</TableHead>
                  <TableHead className="text-right">Shown</TableHead>
                  <TableHead className="text-right">Noticed</TableHead>
                  <TableHead className="text-right">Detection Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contrastStats.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell>{c.contrast?.toFixed(1) ?? "—"}</TableCell>
                    <TableCell className="text-right">{c.totalShown}</TableCell>
                    <TableCell className="text-right">
                      {Number(c.noticedCount ?? 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(c.totalShown) > 0
                        ? Math.round(
                            (Number(c.noticedCount ?? 0) /
                              Number(c.totalShown)) *
                              100
                          )
                        : 0}
                      %
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
