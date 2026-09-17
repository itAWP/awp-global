// POST /api/pensieve/auth
// Passcode gate for the /pensieve page. Two passcodes map to two roles:
// PENSIEVE_PASSCODE -> "client" (view/download/present only)
// PENSIEVE_STAFF_PASSCODE -> "staff" (also upload/delete)
// The role is signed into the session token, so every downstream endpoint
// (not just the page UI) can enforce it.

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
  const clientSecret = process.env.PENSIEVE_PASSCODE;
  const staffSecret = process.env.PENSIEVE_STAFF_PASSCODE;

  if (!clientSecret) {
    return res.status(503).json({ error: "Passcode not configured" });
  }

  let role = null;
  if (passcode && staffSecret && passcode === staffSecret) {
    role = "staff";
  } else if (passcode && passcode === clientSecret) {
    role = "client";
  }

  if (!role) {
    return res.status(401).json({ error: "Invalid passcode" });
  }

  // clientSecret doubles as the token-signing key for both roles — it's
  // just an HMAC secret at that point, not a claim about who logged in.
  const { token, expires } = makeToken(clientSecret, role);
  return res.status(200).json({ ok: true, token, expires, role });
};
