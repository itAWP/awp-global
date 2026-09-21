// GET /api/pipeline/download?path=pipeline/uploads/...&inline=1
// Streams a weekly-note attachment back from private Blob storage. Only
// pathnames under pipeline/uploads/ are servable — this can't be used to
// fetch the investors.json / reports.json "database" blobs.

const { get } = require("@vercel/blob");
const { verifyToken } = require("../../lib/pensieve-auth");

function getBearerToken(req) {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : null;
}

module.exports = async function handler(req, res) {
  const secret = process.env.PIPELINE_PASSCODE;
  const session = secret ? verifyToken(getBearerToken(req), secret) : null;
  if (!session) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const pathname = typeof req.query.path === "string" ? req.query.path : "";
  if (!pathname.startsWith("pipeline/uploads/")) {
    return res.status(400).json({ error: "Invalid file" });
  }

  try {
    const result = await get(pathname, { access: "private" });
    if (!result || !result.stream) {
      return res.status(404).json({ error: "Not found" });
    }

    const disposition = req.query.inline === "1" ? "inline" : "attachment";
    const filename = pathname.split("/").pop().replace(/"/g, "");
    res.setHeader("Content-Type", result.blob.contentType || "application/octet-stream");
    res.setHeader("Content-Disposition", `${disposition}; filename="${filename}"`);

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
};
