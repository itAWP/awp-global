// /api/pipeline/investors
// GET          -> list all investor rows
// POST         -> upsert one row (body: { investor: {...} }, matched by id)
// DELETE ?id=X -> remove one row
//
// All three require a valid Bearer session token (POST /api/pipeline/auth).

const { verifyToken } = require("../../lib/pensieve-auth");
const { readJsonBlob, mutateJsonBlob } = require("../../lib/pipeline-store");

const PATH = "pipeline/investors.json";

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

  if (req.method === "GET") {
    try {
      const { data } = await readJsonBlob(PATH);
      return res.status(200).json({ investors: data });
    } catch {
      return res.status(500).json({ error: "Could not load investors" });
    }
  }

  if (req.method === "POST") {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    const investor = body && body.investor;
    if (!investor || !investor.id || !investor.investorName || !investor.owner) {
      return res.status(400).json({ error: "Missing required investor fields" });
    }
    investor.updatedAt = new Date().toISOString();

    try {
      const next = await mutateJsonBlob(PATH, function (list) {
        const idx = list.findIndex(function (i) {
          return i.id === investor.id;
        });
        if (idx >= 0) list[idx] = investor;
        else list.push(investor);
        return list;
      });
      return res.status(200).json({ investors: next });
    } catch (err) {
      return res.status(500).json({ error: "Could not save investor — please try again.", debug: String(err && err.message || err), trail: err && err.debugTrail });
    }
  }

  if (req.method === "DELETE") {
    const id = typeof req.query.id === "string" ? req.query.id : null;
    if (!id) return res.status(400).json({ error: "Missing id" });

    try {
      const next = await mutateJsonBlob(PATH, function (list) {
        return list.filter(function (i) {
          return i.id !== id;
        });
      });
      return res.status(200).json({ investors: next });
    } catch {
      return res.status(500).json({ error: "Could not delete investor — please try again." });
    }
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
};
