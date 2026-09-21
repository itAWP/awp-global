// POST /api/pipeline/upload
// Token-exchange endpoint for direct browser -> Vercel Blob uploads
// (weekly-note attachments). Same pattern as api/pensieve/upload.js —
// see the comments there for why this uses the classic (req, res)
// signature plus a Request shim instead of a bare Web Handler export.

const { handleUpload } = require("@vercel/blob/client");
const { verifyToken } = require("../../lib/pensieve-auth");

function toWebRequest(req) {
  const host = req.headers.host || "localhost";
  const proto = req.headers["x-forwarded-proto"] || "https";
  const url = `${proto}://${host}${req.url}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers || {})) {
    if (value == null) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
  }

  return new Request(url, { method: req.method, headers });
}

module.exports = async function handler(req, res) {
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request: toWebRequest(req),
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const secret = process.env.PIPELINE_PASSCODE;
        let sessionToken = null;
        try {
          const payload = clientPayload ? JSON.parse(clientPayload) : {};
          sessionToken = payload.sessionToken;
        } catch {
          // leave sessionToken null -> rejected below
        }

        const session = secret ? verifyToken(sessionToken, secret) : null;
        if (!session) {
          throw new Error("Not authenticated");
        }

        return {
          allowedContentTypes: [
            "application/pdf",
            "image/png",
            "image/jpeg",
            "image/webp",
            "text/csv",
            "text/plain",
            "text/markdown",
            "application/json",
          ],
          addRandomSuffix: false,
          maximumSizeInBytes: 50 * 1024 * 1024, // 50MB safety ceiling
        };
      },
      onUploadCompleted: async () => {
        // The uploaded file's pathname is stored on the report row itself
        // (see api/pipeline/reports.js) — nothing else to persist here.
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};
