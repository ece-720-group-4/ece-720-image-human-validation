/**
 * Deletes all blobs from the Vercel Blob store.
 *
 * Usage:
 *   npm run flush-blobs
 *
 * Requires BLOB_READ_WRITE_TOKEN in .env.local
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { list, del } from "@vercel/blob";

async function flushBlobs() {
  console.log("Flushing Vercel Blob store...");

  let totalDeleted = 0;
  let cursor: string | undefined;

  do {
    const { blobs, cursor: nextCursor } = await list({ cursor });

    if (blobs.length === 0) break;

    const urls = blobs.map((b) => b.url);
    await del(urls);

    totalDeleted += urls.length;
    console.log(`Deleted ${totalDeleted} blob(s) so far...`);

    cursor = nextCursor;
  } while (cursor);

  console.log(`Done. ${totalDeleted} blob(s) deleted.`);
}

flushBlobs().catch((err) => {
  console.error("Error flushing blobs:", err);
  process.exit(1);
});
