// POST /api/pensieve/upload
// Token-exchange endpoint for direct browser -> Vercel Blob uploads.
// Files can be much larger than the 4.5MB Vercel Function request-body
// limit because the actual bytes never pass through this function — the
// browser uploads straight to Blob storage using a short-lived client token
// this endpoint generates (see @vercel/blob's client-upload pattern).
//
// handleUpload() expects a Web-standard Request (it reads request.headers
// via .get()), but this project's other functions all use Vercel's classic
// (req, res) Node signature — a bare single-argument "Web Handler" export
// here was not invoked that way and crashed on every call. So: keep the
// classic (req, res) signature (proven to work by auth.js/files.js) and
// build a minimal Request shim to hand handleUpload what it needs.

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
        const secret = process.env.PENSIEVE_PASSCODE;
        let sessionToken = null;
        try {
          const payload = clientPayload ? JSON.parse(clientPayload) : {};
          sessionToken = payload.sessionToken;
        } catch {
          // leave sessionToken null -> rejected below
        }

        if (!secret || !verifyToken(sessionToken, secret)) {
          throw new Error("Not authenticated");
        }

        return {
          allowedContentTypes: ["application/pdf"],
          // The client already namespaces each upload under a random folder
          // (pensieve/<uuid>/<original filename>.pdf), so the pathname is
          // already unique — this keeps the displayed filename clean instead
          // of Blob appending its own suffix.
          addRandomSuffix: false,
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB safety ceiling
        };
      },
      onUploadCompleted: async () => {
        // Vercel Blob itself is the source of truth for the file list
        // (see api/pensieve/files.js), so there's nothing to persist here.
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};
