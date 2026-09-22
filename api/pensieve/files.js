// /api/pensieve/files
// GET            -> list uploaded PDFs (client or staff)
// GET ?id=X      -> stream/download one PDF (client or staff; add &inline=1
//                    for the viewer)
// DELETE ?id=X   -> remove a PDF (staff only)
//
// `id` is the blob's own full URL (as list() returns it), not a filename —
// see the comment above listFiles() for why a filename round-trip is
// unreliable with this SDK.
//
// All three require a valid Bearer session token (issued by
// POST /api/pensieve/auth) — this is the actual protection, not just a UI gate.

const { list, get, del } = require("@vercel/blob");
const { verifyToken } = require("../../lib/pensieve-auth");

const PREFIX = "pensieve/";

function getBearerToken(req) {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : null;
}

// Vercel Blob's list() reports a pathname's spaces as "+" rather than the
// literal space get()/del() expect, and does it losslessly-ambiguously — a
// filename with a real "+" in it is indistinguishable from an encoded
// space once list() has reported it. So: never reconstruct a lookup key
// from list()'s pathname string. Instead use the blob's own full url as
// the opaque, unambiguous identifier for get()/del(), and recover a clean
// display name by percent-decoding the *url*'s path segment (which is
// properly percent-encoded, unlike the pathname field).
function displayNameFromUrl(url) {
  try {
    const path = decodeURIComponent(new URL(url).pathname);
    const idx = path.indexOf(PREFIX);
    return idx >= 0 ? path.slice(idx + PREFIX.length) : path.slice(1);
  } catch {
    return url;
  }
}

module.exports = async function handler(req, res) {
  const secret = process.env.PENSIEVE_PASSCODE;
  const token = getBearerToken(req);
  const session = secret ? verifyToken(token, secret) : null;

  if (!session) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const id = typeof req.query.id === "string" ? req.query.id : null;

  if (req.method === "GET" && id) {
    try {
      const result = await get(id, { access: "private", useCache: false });
      if (!result || !result.stream) {
        return res.status(404).json({ error: "Not found" });
      }

      const disposition = req.query.inline === "1" ? "inline" : "attachment";
      const safeName = displayNameFromUrl(id).split("/").pop().replace(/"/g, "");
      res.setHeader(
        "Content-Type",
        result.blob.contentType || "application/pdf",
      );
      res.setHeader(
        "Content-Disposition",
        `${disposition}; filename="${safeName}"`,
      );

      const reader = result.stream.getReader();
      res.status(200);
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      return res.end();
    } catch {
      return res.status(404).json({ error: "Not found" });
    }
  }

  if (req.method === "GET") {
    try {
      const { blobs } = await list({ prefix: PREFIX });
      const files = blobs
        .filter((b) => b.pathname.length > PREFIX.length)
        .map((b) => ({
          id: b.url,
          name: displayNameFromUrl(b.url),
          size: b.size,
          uploadedAt: b.uploadedAt,
        }))
        .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      return res.status(200).json({ files });
    } catch {
      return res.status(500).json({ error: "Could not list files" });
    }
  }

  if (req.method === "DELETE" && id) {
    if (session.role !== "staff") {
      return res.status(403).json({ error: "Only staff can delete files" });
    }
    try {
      await del(id);
      return res.status(200).json({ ok: true });
    } catch {
      return res.status(500).json({ error: "Could not delete file" });
    }
  }

  res.setHeader("Allow", "GET, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
};
