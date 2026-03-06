# ECE 720 — Image Human Validation

Human stealth evaluation tool for measuring the detectability of instruction text embedded in chart images. Part of a study on visual instruction override in Vision-Language Models.

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui**
- **Neon Postgres** via `@neondatabase/serverless` + **Drizzle ORM**
- **Vercel Blob** for image storage
- **chartjs-node-canvas** for server-side chart generation

## Setup

1. Clone and install:

```bash
git clone https://github.com/josbelluna/ece-720-image-human-validation.git
cd ece-720-image-human-validation
npm install
```

2. Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

Required variables:
- `DATABASE_URL` — Neon Postgres connection string
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob token
- `ADMIN_KEY` — Secret key for admin dashboard access

3. Push the database schema:

```bash
npm run db:push
```

4. Generate chart images:

```bash
npm run generate-charts -- --count 10 --seed 42
```

5. Generate rater keys:

```bash
npm run generate-keys -- --count 5 --base-url https://your-app.vercel.app
```

6. Run locally:

```bash
npm run dev
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with instructions |
| `/rate?key=<key>` | Rating interface (5-second timer, Yes/No) |
| `/rate/complete` | Thank-you page after all images rated |
| `/admin?key=<admin_key>` | Results dashboard with stats and CSV export |

## Database Schema

- **raters** — unique keys for each human rater
- **images** — chart images with metadata (contrast, font_size, position, injection status)
- **responses** — rater answers (noticed_anomaly, response_time_ms)

## Deployment

Deploy to Vercel and configure environment variables in the Vercel dashboard.
