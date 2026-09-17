// Shared helper for the /pensieve passcode gate.
// Not a Vercel Function itself (lives outside /api) — required as a plain
// relative module by api/pensieve/*.js.
//
// Two roles: "client" (view/download/present only) and "staff" (also
// upload/delete). The role is signed into the token itself so every
// endpoint can check it without a database.

const crypto = require("crypto");

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const ROLES = new Set(["client", "staff"]);

function makeToken(signingSecret, role, ttlMs = TOKEN_TTL_MS) {
  if (!ROLES.has(role)) throw new Error(`Invalid role: ${role}`);
  const expires = Date.now() + ttlMs;
  const payload = `${expires}.${role}`;
  const sig = crypto
    .createHmac("sha256", signingSecret)
    .update(payload)
    .digest("hex");
  return { token: `${payload}.${sig}`, expires, role };
}

const TOKEN_RE = /^(\d+)\.(client|staff)\.([0-9a-f]{64})$/;

// Returns { role, expires } on success, or null if invalid/expired/tampered.
function verifyToken(token, signingSecret) {
  if (!token || typeof token !== "string" || !signingSecret) return null;

  // Strict shape check first: exactly `<digits>.<role>.<64 lowercase hex
  // chars>`. (Buffer.from(x, "hex") silently ignores trailing non-hex
  // characters instead of throwing, so without this a tampered/garbage-
  // suffixed token could slip past the signature comparison below.)
  const match = TOKEN_RE.exec(token);
  if (!match) return null;
  const [, expiresStr, role, sig] = match;

  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || expires < Date.now()) return null;

  const payload = `${expiresStr}.${role}`;
  const expected = crypto
    .createHmac("sha256", signingSecret)
    .update(payload)
    .digest("hex");

  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return null;
  try {
    if (!crypto.timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  return { role, expires };
}

module.exports = { makeToken, verifyToken, TOKEN_TTL_MS };
