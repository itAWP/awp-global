// A tiny JSON-document "database" backed by Vercel Blob — /pipeline has
// structured, queryable-ish data (investor rows, weekly reports), unlike
// /pensieve which only ever stores opaque uploaded files.
//
// Each collection is one JSON blob (an array of records). Writes use
// Blob's conditional-write support (ifMatch on the read ETag) so two
// concurrent saves can't silently clobber each other — a losing writer
// retries against the fresh copy instead of overwriting it.

const { get, put } = require("@vercel/blob");

async function readJsonBlob(pathname) {
  try {
    const result = await get(pathname, { access: "private" });
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
    // Updating a blob we've read before: allow the overwrite, but only if
    // it still matches what we read (optimistic concurrency).
    opts.allowOverwrite = true;
    opts.ifMatch = etag;
  }
  // else: this is a from-scratch create (etag null — nothing read yet).
  // Deliberately leave allowOverwrite unset here: Blob's default
  // create-only-if-absent protection is what makes two concurrent
  // "the collection doesn't exist yet" writers conflict instead of one
  // silently clobbering the other.
  return put(pathname, JSON.stringify(data), opts);
}

// Reads, applies `mutator` to the array, writes back; retries a few times
// on a conflicting concurrent write. `mutator` returns the new array.
async function mutateJsonBlob(pathname, mutator, maxAttempts = 5) {
  let lastErr = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data, etag } = await readJsonBlob(pathname);
    const next = mutator(data.slice());
    try {
      await writeJsonBlob(pathname, next, etag);
      return next;
    } catch (err) {
      lastErr = err; // likely an ETag mismatch (concurrent write) — retry
    }
  }
  throw lastErr || new Error("Could not save — please try again.");
}

module.exports = { readJsonBlob, writeJsonBlob, mutateJsonBlob };
