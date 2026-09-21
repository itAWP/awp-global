// A tiny JSON-document "database" backed by Vercel Blob — /pipeline has
// structured, queryable-ish data (investor rows, weekly reports), unlike
// /pensieve which only ever stores opaque uploaded files.
//
// Each collection is one JSON blob (an array of records). Updates are a
// plain read-modify-write with an unconditional overwrite. An ifMatch
// conditional write was tried first for real optimistic concurrency, but
// production Vercel Blob rejected it with "ETag mismatch" even when the
// read ETag was confirmed stable across retries (i.e. against its own
// just-reported value) — an apparent GET/PUT ETag inconsistency in the
// API, not a real conflict. This is a 4-person internal tool with very
// low write concurrency, so an unconditional overwrite (accepting a rare
// lost-update race) beats writes reliably failing.

const { get, put } = require("@vercel/blob");

async function readJsonBlob(pathname) {
  try {
    // useCache: false — this collection is read right after being written
    // (both by mutateJsonBlob's own read-modify-write cycle and by a GET
    // right after another viewer's save), and Blob's CDN cache can serve a
    // stale copy of a private blob for up to ~60s otherwise.
    const result = await get(pathname, { access: "private", useCache: false });
    if (!result || !result.stream) return { data: [], etag: null };

    const chunks = [];
    const reader = result.stream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
    }
    const text = Buffer.concat(chunks).toString("utf8");
    let data = [];
    try {
      const parsed = text ? JSON.parse(text) : [];
      data = Array.isArray(parsed) ? parsed : [];
    } catch {
      data = [];
    }
    return { data, etag: result.blob.etag };
  } catch {
    return { data: [], etag: null };
  }
}

async function writeJsonBlob(pathname, data, etag) {
  const opts = { access: "private", contentType: "application/json" };
  if (etag) {
    // Updating a blob that already exists: plain overwrite.
    opts.allowOverwrite = true;
  }
  // else: this is a from-scratch create (etag null — nothing read yet).
  // Deliberately leave allowOverwrite unset here: Blob's default
  // create-only-if-absent protection is what makes two concurrent
  // "the collection doesn't exist yet" writers conflict instead of one
  // silently clobbering the other.
  return put(pathname, JSON.stringify(data), opts);
}

// Reads, applies `mutator` to the array, writes back. `mutator` returns
// the new array. Retries a few times on a transient/unexpected write
// failure (e.g. the from-scratch create race, or a network blip).
async function mutateJsonBlob(pathname, mutator, maxAttempts = 3) {
  let lastErr = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
    }
    const { data, etag } = await readJsonBlob(pathname);
    const next = mutator(data.slice());
    try {
      await writeJsonBlob(pathname, next, etag);
      return next;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("Could not save — please try again.");
}

module.exports = { readJsonBlob, writeJsonBlob, mutateJsonBlob };
