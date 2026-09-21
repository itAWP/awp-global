// POST /api/pipeline/auth
// Single-tier passcode gate — /pipeline is staff-only (no client view like
// /pensieve has), so every session that authenticates is role "staff".
// Reuses lib/pensieve-auth.js's token scheme rather than duplicating it.

const { makeToken } = require("../../lib/pensieve-auth");

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
  const secret = process.env.PIPELINE_PASSCODE;

  if (!secret) {
    return res.status(503).json({ error: "Passcode not configured" });
  }
  if (!passcode || passcode !== secret) {
    return res.status(401).json({ error: "Invalid passcode" });
  }

  const { token, expires } = makeToken(secret, "staff");
  return res.status(200).json({ ok: true, token, expires });
};
