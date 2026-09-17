// POST /api/pensive/upload
// Token-exchange endpoint for direct browser -> Vercel Blob uploads.
// Files can be much larger than the 4.5MB Vercel Function request-body
// limit because the actual bytes never pass through this function — the
// browser uploads straight to Blob storage using a short-lived client token
// this endpoint generates (see @vercel/blob's client-upload pattern).
//
// Uses the Web-standard Request/Response signature (required by
// handleUpload), not the classic (req, res) Node signature.

import { handleUpload } from "@vercel/blob/client";
import pensiveAuth from "../../lib/pensive-auth.js";

const { verifyToken } = pensiveAuth;

export default async function handler(request) {
  const body = await request.json();

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const secret = process.env.PENSIVE_PASSCODE;
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
          // (pensive/<uuid>/<original filename>.pdf), so the pathname is
          // already unique — this keeps the displayed filename clean instead
          // of Blob appending its own suffix.
          addRandomSuffix: false,
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB safety ceiling
        };
      },
      onUploadCompleted: async () => {
        // Vercel Blob itself is the source of truth for the file list
        // (see api/pensive/files.js), so there's nothing to persist here.
      },
    });

    return Response.json(jsonResponse);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
