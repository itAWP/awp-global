// /api/pensieve/files
// GET            -> list uploaded PDFs (client or staff)
// GET ?name=X    -> stream/download one PDF (client or staff; add &inline=1
//                    for the viewer)
// DELETE ?name=X -> remove a PDF (staff only)
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

module.exports = async function handler(req, res) {
  const secret = process.env.PENSIEVE_PASSCODE;
  const token = getBearerToken(req);
  const session = secret ? verifyToken(token, secret) : null;

  if (!session) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const name = typeof req.query.name === "string" ? req.query.name : null;
  const pathname = name ? `${PREFIX}${name}` : null;

  if (req.method === "GET" && pathname) {
    try {
      const result = await get(pathname, { access: "private" });
      if (!result || !result.stream) {
        return res.status(404).json({ error: "Not found" });
      }

      const disposition = req.query.inline === "1" ? "inline" : "attachment";
      const safeName = name.split("/").pop().replace(/"/g, "");
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
    } catch (err) {
      return res.status(404).json({ error: "Not found", debug: String(err && err.message || err), pathname });
    }
  }

  if (req.method === "GET") {
    try {
      const { blobs } = await list({ prefix: PREFIX });
      const files = blobs
        .filter((b) => b.pathname.length > PREFIX.length)
        .map((b) => ({
          name: b.pathname.slice(PREFIX.length),
          size: b.size,
          uploadedAt: b.uploadedAt,
        }))
        .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      return res.status(200).json({ files });
    } catch {
      return res.status(500).json({ error: "Could not list files" });
    }
  }

  if (req.method === "DELETE" && pathname) {
    if (session.role !== "staff") {
      return res.status(403).json({ error: "Only staff can delete files" });
    }
    try {
      await del(pathname);
      return res.status(200).json({ ok: true });
    } catch {
      return res.status(500).json({ error: "Could not delete file" });
    }
  }

  res.setHeader("Allow", "GET, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
};
