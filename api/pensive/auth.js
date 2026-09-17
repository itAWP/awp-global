// POST /api/pensive/auth
// Passcode gate for the /pensive page. Mirrors the /aeroisland pattern but
// also issues a short-lived signed session token, because /pensive's
// upload/list/download endpoints must themselves be protected (not just the
// page UI).

const { makeToken } = require("../../lib/pensive-auth");

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
  const secret = process.env.PENSIVE_PASSCODE;

  if (!secret) {
    return res.status(503).json({ error: "Passcode not configured" });
  }

  if (!passcode || passcode !== secret) {
    return res.status(401).json({ error: "Invalid passcode" });
  }

  const { token, expires } = makeToken(secret);
  return res.status(200).json({ ok: true, token, expires });
};
