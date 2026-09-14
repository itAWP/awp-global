// Vercel Serverless Function: POST /api/auth/verify
// Backs the passcode gate on the /aeroisland Executive Console page.
//
// The passcode itself is NOT hardcoded here (this repo is public) — set it as
// a Vercel environment variable named AEROISLAND_PASSCODE (Project Settings ->
// Environment Variables) and redeploy for it to take effect.

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const passcode =
    typeof body?.passcode === "string" ? body.passcode.trim() : "";
  const expected = process.env.AEROISLAND_PASSCODE;

  if (!expected) {
    return res.status(503).json({ error: "Passcode not configured" });
  }

  if (passcode && passcode === expected) {
    return res.status(200).json({ ok: true });
  }

  return res.status(401).json({ error: "Invalid passcode" });
};
