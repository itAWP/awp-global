// Shared helper for the /pensieve passcode gate.
// Not a Vercel Function itself (lives outside /api) — required as a plain
// relative module by api/pensieve/*.js.

const crypto = require("crypto");

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function makeToken(secret, ttlMs = TOKEN_TTL_MS) {
  const expires = Date.now() + ttlMs;
  const sig = crypto
    .createHmac("sha256", secret)
    .update(String(expires))
    .digest("hex");
  return { token: `${expires}.${sig}`, expires };
}

const TOKEN_RE = /^(\d+)\.([0-9a-f]{64})$/;

function verifyToken(token, secret) {
  if (!token || typeof token !== "string" || !secret) return false;

  // Strict shape check first: exactly `<digits>.<64 lowercase hex chars>`.
  // (Buffer.from(x, "hex") silently ignores trailing non-hex characters
  // instead of throwing, so without this a tampered/garbage-suffixed token
  // could slip past the signature comparison below.)
  const match = TOKEN_RE.exec(token);
  if (!match) return false;
  const [, expiresStr, sig] = match;

  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(expiresStr)
    .digest("hex");

  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

module.exports = { makeToken, verifyToken, TOKEN_TTL_MS };
