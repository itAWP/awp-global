// /api/pipeline/reports
// GET  -> list all weekly-note rows
// POST -> merge `fields` into the row for {person, weekEnding} (creating it
//         if absent) — this is how the auto-generated activity summary and
//         a person's own manual note coexist without overwriting each other.
//
// Both require a valid Bearer session token (POST /api/pipeline/auth).

const { verifyToken } = require("../../lib/pensieve-auth");
const { readJsonBlob, mutateJsonBlob } = require("../../lib/pipeline-store");

const PATH = "pipeline/reports.json";

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
      return res.status(200).json({ reports: data });
    } catch {
      return res.status(500).json({ error: "Could not load weekly notes" });
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
    const person = body && body.person;
    const weekEnding = body && body.weekEnding;
    const fields = (body && body.fields) || {};
    if (!person || !weekEnding) {
      return res.status(400).json({ error: "Missing person or weekEnding" });
    }

    const id = person + "_" + weekEnding;
    try {
      const next = await mutateJsonBlob(PATH, function (list) {
        const idx = list.findIndex(function (r) {
          return r.id === id;
        });
        if (idx >= 0) {
          list[idx] = Object.assign({}, list[idx], fields, { id, person, weekEnding });
        } else {
          list.push(Object.assign({ id: id, person: person, weekEnding: weekEnding }, fields));
        }
        return list;
      });
      return res.status(200).json({ reports: next });
    } catch {
      return res.status(500).json({ error: "Could not save note — please try again." });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
};
