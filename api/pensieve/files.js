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

// A raw space in an upload pathname gets silently turned into a literal
// "+" in the actually-stored key by Vercel Blob's own client-upload path
// (confirmed by re-fetching an uploaded blob) — not just a list()/display
// quirk, and indistinguishable afterwards from a real "+" the filename
// might contain. The upload side (pensieve/app.js) now pre-encodes the
// filename with encodeURIComponent before it ever reaches upload(), so no
// ambiguous raw character reaches Blob's storage layer — this just
// decodes that same segment back for display. Files uploaded before that
// fix shipped will still show their space as "+" here; that's cosmetic
// only, since download/present/delete all key off the blob's own url
// (see `id` below), not this display name.
function displayNameFromPathname(pathname) {
  const seg = pathname.slice(PREFIX.length);
  try {
    return decodeURIComponent(seg);
  } catch {
    return seg;
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
      const safeName = displayNameFromPathname(result.blob.pathname).split("/").pop().replace(/"/g, "");
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
          name: displayNameFromPathname(b.pathname),
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
