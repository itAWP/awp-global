import { upload } from "/pipeline/vendor/vercel-blob-client.js";

const PEOPLE = [
  { key: "patrick", name: "Patrick Dannacher", target: 1000000 },
  { key: "matt", name: "Matt Marsden", target: 1000000 },
  { key: "rayhan", name: "Rayhan Reynolds", target: 1000000 },
  { key: "daniel", name: "Daniel Runser", target: 1000000 },
];
const PEOPLE_BY_KEY = {};
PEOPLE.forEach((p) => { PEOPLE_BY_KEY[p.key] = p; });

const START = new Date("2026-09-21T00:00:00");
const DEADLINE = new Date("2026-10-21T23:59:59");
const TOTAL_TARGET = 4000000;
const SESSION_KEY = "pipeline.session";

let investors = [];
let reports = [];
let importRows = [];

const el = {};
function q(id) { return document.getElementById(id); }

// ---------- Session ----------

function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.expires || parsed.expires < Date.now()) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
function setSession(token, expires) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, expires }));
}
function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
function authHeader() {
  const s = getSession();
  return s ? { Authorization: `Bearer ${s.token}` } : {};
}

function showGate(message) {
  q("app").hidden = true;
  q("gate").hidden = false;
  if (message) {
    el.gateError.textContent = message;
    el.gateError.hidden = false;
  }
}
function showApp() {
  q("gate").hidden = true;
  q("app").hidden = false;
  loadAll(false);
}

// ---------- Tiny fetch wrapper ----------

async function apiGet(path) {
  const res = await fetch(path, { headers: authHeader() });
  if (res.status === 401) {
    clearSession();
    showGate("Your session expired. Please enter the passcode again.");
    throw new Error("Session expired");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed.");
  return data;
}
async function apiPost(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    clearSession();
    showGate("Your session expired. Please enter the passcode again.");
    throw new Error("Session expired");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed.");
  return data;
}
async function apiDelete(path) {
  const res = await fetch(path, { method: "DELETE", headers: authHeader() });
  if (res.status === 401) {
    clearSession();
    showGate("Your session expired. Please enter the passcode again.");
    throw new Error("Session expired");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed.");
  return data;
}

// ---------- Boot ----------

document.addEventListener("DOMContentLoaded", boot);

function boot() {
  Object.assign(el, {
    gate: q("gate"),
    gateForm: q("gateForm"),
    gateError: q("gateError"),
    gateSubmit: q("gateSubmit"),
    pass: q("p-pass"),
    app: q("app"),
    signOut: q("signOut"),

    tabs: document.querySelectorAll(".tab-btn"),
    viewDashboard: q("view-dashboard"),
    viewInvestors: q("view-investors"),
    viewNotes: q("view-notes"),
    refreshBtn: q("refreshBtn"),
    whoAmI: q("whoAmI"),
    fPersonLabel: q("fPersonLabel"),

    heroTotal: q("heroTotal"),
    heroDays: q("heroDays"),
    heroBarFill: q("heroBarFill"),
    heroPct: q("heroPct"),
    heroPaid: q("heroPaid"),
    peopleGrid: q("peopleGrid"),
    funnelContacted: q("funnelContacted"),
    funnelDiscussion: q("funnelDiscussion"),
    funnelCommitted: q("funnelCommitted"),
    dashNotesBody: q("dashNotesBody"),
    dashNotesEmpty: q("dashNotesEmpty"),

    addInvestorToggle: q("addInvestorToggle"),
    investorForm: q("investorForm"),
    investorFormTitle: q("investorFormTitle"),
    invId: q("inv-id"),
    invName: q("inv-name"),
    invLocation: q("inv-location"),
    invAmount: q("inv-amount"),
    invOwner: q("inv-owner"),
    invStage: q("inv-stage"),
    invSafe: q("inv-safe"),
    invNotice: q("inv-notice"),
    invPayment: q("inv-payment"),
    invDeadline: q("inv-deadline"),
    invNotes: q("inv-notes"),
    investorSubmitBtn: q("investorSubmitBtn"),
    investorCancelBtn: q("investorCancelBtn"),
    investorMsg: q("investorMsg"),
    investorsBody: q("investorsBody"),
    investorsEmpty: q("investorsEmpty"),

    importPaste: q("importPaste"),
    importFile: q("importFile"),
    importParseBtn: q("importParseBtn"),
    importMsg: q("importMsg"),
    importPreviewWrap: q("importPreviewWrap"),
    importPreviewBody: q("importPreviewBody"),
    importConfirmBtn: q("importConfirmBtn"),
    importCancelBtn: q("importCancelBtn"),

    form: q("reportForm"),
    fWeek: q("f-week"),
    fNotes: q("f-notes"),
    fFile: q("f-file"),
    submitBtn: q("submitBtn"),
    formMsg: q("formMsg"),
    notesBody: q("notesBody"),
    notesEmpty: q("notesEmpty"),
  });

  [el.whoAmI, el.invOwner].forEach((select) => {
    PEOPLE.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.key;
      opt.textContent = p.name;
      select.appendChild(opt);
    });
  });

  try {
    const lastName = localStorage.getItem("pipeline.who");
    if (lastName && PEOPLE_BY_KEY[lastName]) el.whoAmI.value = lastName;
  } catch {}
  updatePersonLabel();
  el.whoAmI.addEventListener("change", () => {
    try { localStorage.setItem("pipeline.who", el.whoAmI.value); } catch {}
    updatePersonLabel();
  });

  el.fWeek.value = toDateInputValue(new Date());

  el.gateForm.addEventListener("submit", onGateSubmit);
  el.signOut.addEventListener("click", () => { clearSession(); showGate(); });

  el.tabs.forEach((btn) => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));
  el.refreshBtn.addEventListener("click", () => loadAll(true));
  el.form.addEventListener("submit", onSubmitNote);
  el.investorForm.addEventListener("submit", onSubmitInvestor);
  el.addInvestorToggle.addEventListener("click", () => openInvestorForm(null));
  el.investorCancelBtn.addEventListener("click", closeInvestorForm);

  el.importParseBtn.addEventListener("click", onParseImport);
  el.importFile.addEventListener("change", onImportFileChosen);
  el.importCancelBtn.addEventListener("click", resetImportPanel);
  el.importConfirmBtn.addEventListener("click", onConfirmImport);

  renderAll();

  const existing = getSession();
  if (existing) showApp();
  else showGate();
}

async function onGateSubmit(e) {
  e.preventDefault();
  el.gateError.hidden = true;
  el.gateSubmit.disabled = true;
  el.gateSubmit.textContent = "Checking…";
  try {
    const res = await fetch("/api/pipeline/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode: el.pass.value }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || "Passcode not recognised.");
    setSession(data.token, data.expires);
    el.pass.value = "";
    showApp();
  } catch (err) {
    el.gateError.textContent = err.message || "Something went wrong.";
    el.gateError.hidden = false;
  } finally {
    el.gateSubmit.disabled = false;
    el.gateSubmit.textContent = "Enter";
  }
}

function getCurrentWho() { return el.whoAmI.value || ""; }
function updatePersonLabel() {
  const p = PEOPLE_BY_KEY[getCurrentWho()];
  el.fPersonLabel.textContent = p ? p.name : "(select who you are, above)";
}

function switchTab(tab) {
  el.tabs.forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  el.viewDashboard.hidden = tab !== "dashboard";
  el.viewInvestors.hidden = tab !== "investors";
  el.viewNotes.hidden = tab !== "notes";
  if (tab !== "investors") closeInvestorForm();
}

async function loadAll(isManualRefresh) {
  if (!getSession()) return;
  if (isManualRefresh) el.refreshBtn.textContent = "…";
  try {
    const invData = await apiGet("/api/pipeline/investors");
    investors = invData.investors || [];
    const repData = await apiGet("/api/pipeline/reports");
    reports = repData.reports || [];
    renderAll();
  } catch (e) {
    if (e.message === "Session expired") return;
    console.error("Pipeline: failed to load data", e);
    const msg = "Couldn't load data" + (e?.message ? ": " + e.message : ".");
    el.investorsEmpty.hidden = false;
    el.investorsEmpty.textContent = msg;
    el.notesEmpty.hidden = false;
    el.notesEmpty.textContent = msg;
  } finally {
    if (isManualRefresh) el.refreshBtn.textContent = "⟳";
  }
}

function renderAll() {
  renderHero();
  renderPeople();
  renderFunnel();
  renderInvestorsTable();
  renderNotesTables();
}

// ---------- Dashboard ----------

function committedTotalFor(ownerKey) {
  return investors
    .filter((i) => i.stage === "committed" && (!ownerKey || i.owner === ownerKey))
    .reduce((sum, i) => sum + (Number(i.amountUsd) || 0), 0);
}
function paidTotalFor(ownerKey) {
  return investors
    .filter((i) => i.stage === "committed" && i.paymentStatus === "confirmed" && (!ownerKey || i.owner === ownerKey))
    .reduce((sum, i) => sum + (Number(i.amountUsd) || 0), 0);
}

function renderHero() {
  const totalCommitted = committedTotalFor(null);
  const totalPaid = paidTotalFor(null);
  const pct = Math.max(0, Math.min(100, (totalCommitted / TOTAL_TARGET) * 100));

  el.heroTotal.innerHTML = "USD " + formatNum(totalCommitted) + "<small>/ " + formatNum(TOTAL_TARGET) + " target</small>";
  el.heroBarFill.style.width = pct + "%";
  el.heroPct.textContent = pct.toFixed(1) + "% of target";
  el.heroPaid.textContent = "USD " + formatNum(totalPaid) + " confirmed received";

  const daysLeft = Math.ceil((DEADLINE.getTime() - Date.now()) / 86400000);
  el.heroDays.textContent = daysLeft > 0 ? daysLeft : "0";
}

function paceStatus(committed, target) {
  const total = DEADLINE.getTime() - START.getTime();
  const elapsed = Math.max(0, Math.min(total, Date.now() - START.getTime()));
  const expected = target * (elapsed / total);
  if (committed >= expected) return "good";
  if (committed >= expected * 0.7) return "warn";
  return "critical";
}

function renderPeople() {
  el.peopleGrid.innerHTML = "";
  PEOPLE.forEach((p) => {
    const committed = committedTotalFor(p.key);
    const paid = paidTotalFor(p.key);
    const count = investors.filter((i) => i.owner === p.key).length;
    const pct = Math.max(0, Math.min(100, (committed / p.target) * 100));
    const status = count > 0 ? paceStatus(committed, p.target) : "neutral";
    const statusLabel = { good: "On track", warn: "Watch", critical: "Behind", neutral: "No investors yet" }[status];

    const card = document.createElement("div");
    card.className = "person-card";
    card.innerHTML =
      `<div class="pname">${escapeHtml(p.name)}</div>` +
      `<span class="pill ${status}">${statusLabel}</span>` +
      `<div class="person-figure num">USD ${formatNum(committed)}<span class="target"> / ${formatNum(p.target)}</span></div>` +
      `<div class="person-bar"><div style="width:${pct}%"></div></div>` +
      `<div class="person-meta"><span>Paid ${formatNum(paid)}</span><span>${count} investor${count === 1 ? "" : "s"}</span></div>`;
    el.peopleGrid.appendChild(card);
  });
}

function renderFunnel() {
  el.funnelContacted.textContent = investors.filter((i) => i.stage === "contacted").length;
  el.funnelDiscussion.textContent = investors.filter((i) => i.stage === "discussion").length;
  el.funnelCommitted.textContent = investors.filter((i) => i.stage === "committed").length;
}

// ---------- Investors ----------

function openInvestorForm(investor) {
  el.investorForm.hidden = false;
  el.addInvestorToggle.hidden = true;
  if (investor) {
    el.investorFormTitle.textContent = "Edit investor";
    el.invId.value = investor.id;
    el.invName.value = investor.investorName || "";
    el.invLocation.value = investor.location || "";
    el.invAmount.value = investor.amountUsd || "";
    el.invOwner.value = investor.owner || "";
    el.invStage.value = investor.stage || "committed";
    el.invSafe.value = investor.safeReference || "";
    el.invNotice.value = investor.noticeDate || "";
    el.invPayment.value = investor.paymentStatus || "pending";
    el.invDeadline.value = investor.deadline || "";
    el.invNotes.value = investor.notes || "";
    el.investorCancelBtn.hidden = false;
    el.investorSubmitBtn.textContent = "Save changes";
  } else {
    el.investorFormTitle.textContent = "Add investor";
    el.investorForm.reset();
    el.invId.value = "";
    el.invStage.value = "committed";
    el.invPayment.value = "pending";
    el.investorCancelBtn.hidden = true;
    el.investorSubmitBtn.textContent = "Save investor";
  }
  hideInvestorMsg();
}
function closeInvestorForm() {
  el.investorForm.hidden = true;
  el.addInvestorToggle.hidden = false;
}

async function onSubmitInvestor(e) {
  e.preventDefault();
  hideInvestorMsg();

  const payload = {
    investorName: el.invName.value.trim(),
    location: el.invLocation.value.trim(),
    amountUsd: Number(el.invAmount.value) || 0,
    owner: el.invOwner.value,
    stage: el.invStage.value,
    safeReference: el.invSafe.value.trim(),
    noticeDate: el.invNotice.value,
    paymentStatus: el.invPayment.value,
    deadline: el.invDeadline.value.trim(),
    notes: el.invNotes.value.trim(),
  };
  if (!payload.investorName || !payload.owner) {
    return showInvestorMsg("Investor name and relationship owner are required.", true);
  }

  const isNew = !el.invId.value;
  payload.id = el.invId.value || slugify(payload.investorName);

  el.investorSubmitBtn.disabled = true;
  try {
    await apiPost("/api/pipeline/investors", { investor: payload });
    closeInvestorForm();
    await loadAll(false);

    const ownerName = PEOPLE_BY_KEY[payload.owner]?.name || payload.owner;
    autoLogActivity(
      getCurrentWho() || payload.owner,
      `${isNew ? "Added investor" : "Updated investor"} “${payload.investorName}” (USD ${formatNum(payload.amountUsd)}, ${payload.stage}) for ${ownerName}.`
    );
  } catch (err) {
    if (err.message !== "Session expired") showInvestorMsg(err.message || "Could not save — please try again.", true);
  } finally {
    el.investorSubmitBtn.disabled = false;
  }
}

async function deleteInvestor(id) {
  if (!confirm("Remove this investor from the pipeline? This can't be undone.")) return;
  try {
    await apiDelete("/api/pipeline/investors?id=" + encodeURIComponent(id));
    await loadAll(false);
  } catch {}
}

function renderInvestorsTable() {
  const sorted = investors.slice().sort((a, b) => (Number(b.amountUsd) || 0) - (Number(a.amountUsd) || 0));
  el.investorsBody.innerHTML = "";
  el.investorsEmpty.hidden = sorted.length > 0;
  if (sorted.length === 0) {
    el.investorsEmpty.textContent = "No investors added yet — use the form to add the first one.";
    return;
  }

  const STAGE_LABEL = { contacted: "Contacted", discussion: "In discussion", committed: "Committed" };

  sorted.forEach((inv) => {
    const owner = PEOPLE_BY_KEY[inv.owner];
    const tr = document.createElement("tr");
    const paymentCell = inv.stage === "committed"
      ? `<span class="status-pill ${inv.paymentStatus === "confirmed" ? "confirmed" : "pending"}">${inv.paymentStatus === "confirmed" ? "Confirmed" : "Pending"}</span>`
      : "—";
    tr.innerHTML =
      `<td>${escapeHtml(inv.investorName || "")}</td>` +
      `<td>${escapeHtml(inv.location || "—")}</td>` +
      `<td class="num">${formatNum(inv.amountUsd)}</td>` +
      `<td>${escapeHtml(owner ? owner.name : inv.owner || "—")}</td>` +
      `<td><span class="stage-pill">${STAGE_LABEL[inv.stage] || inv.stage}</span></td>` +
      `<td>${paymentCell}</td>` +
      `<td>${escapeHtml(inv.deadline || "—")}</td>` +
      `<td class="notes">${escapeHtml(inv.notes || "")}</td>` +
      `<td><div class="row-actions"><button type="button" data-edit>Edit</button><button type="button" class="danger" data-del>Delete</button></div></td>`;
    tr.querySelector("[data-edit]").addEventListener("click", () => openInvestorForm(inv));
    tr.querySelector("[data-del]").addEventListener("click", () => deleteInvestor(inv.id));
    el.investorsBody.appendChild(tr);
  });
}

function showInvestorMsg(text, isError) {
  el.investorMsg.hidden = false;
  el.investorMsg.textContent = text;
  el.investorMsg.className = "form-msg " + (isError ? "error" : "ok");
}
function hideInvestorMsg() { el.investorMsg.hidden = true; }

// ---------- Import from spreadsheet ----------
// Parsing is fully local and deterministic (no OCR, no AI guessing) so
// dollar amounts can never be misread — every row is shown for human
// review before anything is written to the database.

function onImportFileChosen() {
  const file = el.importFile.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    el.importPaste.value = String(reader.result || "");
    onParseImport();
  };
  reader.readAsText(file);
}

function parseTable(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim() !== "");
  if (lines.length < 2) return { headers: [], rows: [] };
  const delim = lines[0].indexOf("\t") >= 0 ? "\t" : ",";

  function splitLine(line) {
    if (delim === "\t") return line.split("\t");
    const out = [];
    let cur = "", inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false; }
        else cur += ch;
      } else if (ch === '"') inQuotes = true;
      else if (ch === ",") { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  }

  const headers = splitLine(lines[0]).map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const cells = splitLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cells[i] || "").trim(); });
    return obj;
  });
  return { headers, rows };
}

function findField(rowObj, patterns) {
  const keys = Object.keys(rowObj);
  for (const key of keys) {
    const norm = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    for (const p of patterns) {
      if (norm.indexOf(p) >= 0) return rowObj[key];
    }
  }
  return "";
}

function parseAmount(raw) {
  if (!raw) return NaN;
  const cleaned = String(raw).replace(/[^0-9.\-]/g, "");
  if (cleaned === "" || cleaned === "-") return NaN;
  return parseFloat(cleaned);
}

function matchOwner(raw) {
  const norm = (raw || "").toLowerCase().trim();
  if (!norm) return null;
  for (const p of PEOPLE) {
    if (norm === p.key || norm.indexOf(p.key) >= 0 || p.name.toLowerCase().indexOf(norm) === 0) return p.key;
  }
  return null;
}

function matchStage(raw) {
  const norm = (raw || "").toLowerCase().trim();
  if (!norm) return "committed";
  if (norm.indexOf("commit") >= 0 || norm.indexOf("sign") >= 0) return "committed";
  if (norm.indexOf("discuss") >= 0 || norm.indexOf("negoti") >= 0) return "discussion";
  if (norm.indexOf("contact") >= 0 || norm.indexOf("approach") >= 0) return "contacted";
  return null;
}

function matchPayment(raw) {
  const norm = (raw || "").toLowerCase().trim();
  if (norm.indexOf("confirm") >= 0 || norm.indexOf("receiv") >= 0 || norm.indexOf("paid") >= 0) return "confirmed";
  return "pending";
}

function slugify(s) {
  const slug = (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-+|-+$)/g, "");
  return slug || "investor-" + Date.now();
}

function mapImportRow(rowObj) {
  const name = findField(rowObj, ["investorname", "name"]).trim();
  const location = findField(rowObj, ["location"]).trim();
  const amountRaw = findField(rowObj, ["ticketsize", "investmentamount", "amount", "investment"]);
  const amount = parseAmount(amountRaw);
  const ownerRaw = findField(rowObj, ["relationshipowner", "owner"]);
  const owner = matchOwner(ownerRaw);
  const stageRaw = findField(rowObj, ["stage"]);
  const stage = matchStage(stageRaw);
  const safeReference = findField(rowObj, ["safereference", "safe"]).trim();
  const noticeDateRaw = findField(rowObj, ["noticedate", "notice"]).trim();
  const paymentRaw = findField(rowObj, ["paymentstatus", "payment"]);
  const paymentStatus = matchPayment(paymentRaw);
  const deadline = findField(rowObj, ["deadline"]).trim();
  const notes = findField(rowObj, ["notes"]).trim();

  const errors = [];
  if (!name) errors.push("missing investor name");
  if (!isFinite(amount) || amount <= 0) errors.push(`unreadable amount ("${amountRaw}")`);
  if (!owner) errors.push(`owner not recognised ("${ownerRaw}")`);
  if (!stage) errors.push(`stage not recognised ("${stageRaw}")`);

  const id = slugify(name);
  const existing = investors.find((i) => i.id === id);

  return {
    id,
    isUpdate: !!existing,
    errors,
    valid: errors.length === 0,
    payload: {
      id,
      investorName: name,
      location,
      amountUsd: isFinite(amount) ? amount : 0,
      owner: owner || "",
      stage: stage || "",
      safeReference,
      noticeDate: parseImportDate(noticeDateRaw),
      paymentStatus,
      deadline,
      notes,
    },
  };
}

function parseImportDate(raw) {
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "";
  return toDateInputValue(d);
}

function onParseImport() {
  hideImportMsg();
  const table = parseTable(el.importPaste.value);
  if (table.rows.length === 0) {
    return showImportMsg("Paste rows (with a header row) or choose a .csv file first.", true);
  }
  importRows = table.rows.map(mapImportRow);
  renderImportPreview();
}

function renderImportPreview() {
  el.importPreviewWrap.hidden = importRows.length === 0;
  el.importPreviewBody.innerHTML = "";

  importRows.forEach((row, idx) => {
    const tr = document.createElement("tr");
    const owner = PEOPLE_BY_KEY[row.payload.owner];
    const statusHtml = row.valid
      ? `<span class="pill ${row.isUpdate ? "warn" : "good"}">${row.isUpdate ? "Will update" : "New"}</span>`
      : `<span class="pill critical">${escapeHtml(row.errors.join("; "))}</span>`;

    tr.innerHTML =
      `<td><input type="checkbox" data-include ${row.valid ? "checked" : "disabled"} /></td>` +
      `<td>${escapeHtml(row.payload.investorName || "(no name)")}</td>` +
      `<td class="num">${row.valid ? "USD " + formatNum(row.payload.amountUsd) : "—"}</td>` +
      `<td>${escapeHtml(owner ? owner.name : "—")}</td>` +
      `<td>${escapeHtml(row.payload.stage || "—")}</td>` +
      `<td>${statusHtml}</td>`;

    const checkbox = tr.querySelector("[data-include]");
    checkbox.addEventListener("change", () => { importRows[idx].include = checkbox.checked; });
    importRows[idx].include = row.valid;

    el.importPreviewBody.appendChild(tr);
  });

  const validCount = importRows.filter((r) => r.valid).length;
  showImportMsg(`${validCount} of ${importRows.length} row(s) parsed cleanly. Untick any you don't want to import.`, validCount < importRows.length);
}

async function onConfirmImport() {
  const toImport = importRows.filter((r) => r.valid && r.include);
  if (toImport.length === 0) return showImportMsg("No rows selected to import.", true);

  el.importConfirmBtn.disabled = true;
  el.importConfirmBtn.textContent = "Importing…";
  try {
    for (const row of toImport) {
      await apiPost("/api/pipeline/investors", { investor: row.payload });
    }
    showImportMsg(`Imported ${toImport.length} investor(s).`, false);
    resetImportPanel();
    await loadAll(false);

    const newCount = toImport.filter((r) => !r.isUpdate).length;
    const updateCount = toImport.length - newCount;
    const sumAmount = toImport.reduce((s, r) => s + (r.payload.amountUsd || 0), 0);
    const byOwner = {};
    toImport.forEach((r) => { byOwner[r.payload.owner] = true; });
    const ownerNames = Object.keys(byOwner).map((k) => PEOPLE_BY_KEY[k]?.name || k).join(", ");
    autoLogActivity(
      getCurrentWho(),
      `Imported ${toImport.length} investor row(s) (${newCount} new, ${updateCount} updated) totalling USD ${formatNum(sumAmount)}, for ${ownerNames || "—"}.`
    );
  } catch (err) {
    if (err.message !== "Session expired") {
      showImportMsg(err.message || "Import failed partway through — check the Investors table for what made it in.", true);
    }
  } finally {
    el.importConfirmBtn.disabled = false;
    el.importConfirmBtn.textContent = "Import selected rows";
  }
}

function resetImportPanel() {
  importRows = [];
  el.importPreviewWrap.hidden = true;
  el.importPreviewBody.innerHTML = "";
  el.importPaste.value = "";
  el.importFile.value = "";
  hideImportMsg();
}

function showImportMsg(text, isWarn) {
  el.importMsg.hidden = false;
  el.importMsg.textContent = text;
  el.importMsg.className = "form-msg " + (isWarn ? "error" : "ok");
}
function hideImportMsg() { el.importMsg.hidden = true; }

// ---------- Weekly notes ----------
// The server merges `fields` into the row for {person, weekEnding} (see
// api/pipeline/reports.js) — autoLogActivity()'s auto-summary and a
// person's own manual note coexist without overwriting each other.

async function upsertReportFields(person, week, fields) {
  if (!getSession() || !person || !week) return;
  await apiPost("/api/pipeline/reports", { person, weekEnding: week, fields });
}

async function autoLogActivity(person, summaryLine) {
  if (!person) return;
  try {
    await upsertReportFields(person, toDateInputValue(new Date()), {
      autoSummary: summaryLine,
      lastAutoUpdate: new Date().toISOString(),
    });
    await loadAll(false);
  } catch (e) {
    console.error("Pipeline: auto weekly-log failed", e);
  }
}

async function onSubmitNote(e) {
  e.preventDefault();
  hideMsg();

  const person = getCurrentWho();
  const week = el.fWeek.value;
  if (!person) return showMsg("Pick who you are at the top of the page first.", true);
  if (!week) return showMsg("Pick the week ending date.", true);

  const session = getSession();
  if (!session) return showMsg("Your session expired. Please enter the passcode again.", true);

  const fields = { notes: el.fNotes.value.trim(), submittedAt: new Date().toISOString() };

  el.submitBtn.disabled = true;
  el.submitBtn.textContent = "Submitting…";

  try {
    const file = el.fFile.files?.[0];
    if (file) {
      const id = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const pathname = `pipeline/uploads/${id}/${file.name}`;
      const blob = await upload(pathname, file, {
        access: "private",
        handleUploadUrl: "/api/pipeline/upload",
        clientPayload: JSON.stringify({ sessionToken: session.token }),
      });
      fields.filePath = blob.pathname;
      fields.fileName = file.name;
    }

    await upsertReportFields(person, week, fields);

    showMsg("Note submitted. Thank you.", false);
    el.form.reset();
    el.fWeek.value = toDateInputValue(new Date());

    await loadAll(false);
  } catch (err) {
    if (err.message !== "Session expired") showMsg(err.message || "Could not submit — please try again.", true);
  } finally {
    el.submitBtn.disabled = false;
    el.submitBtn.textContent = "Submit weekly note";
  }
}

async function downloadReportFile(path, filename) {
  try {
    const res = await fetch("/api/pipeline/download?path=" + encodeURIComponent(path), { headers: authHeader() });
    if (!res.ok) throw new Error("Download failed.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "file";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert(err.message || "Download failed.");
  }
}

function renderNotesTables() {
  const sorted = reports.slice().sort((a, b) => {
    if (a.weekEnding !== b.weekEnding) return a.weekEnding < b.weekEnding ? 1 : -1;
    return (a.person || "").localeCompare(b.person || "");
  });

  [{ body: el.notesBody, empty: el.notesEmpty, limit: null }, { body: el.dashNotesBody, empty: el.dashNotesEmpty, limit: 5 }]
    .forEach((target) => {
      const rows = target.limit ? sorted.slice(0, target.limit) : sorted;
      target.body.innerHTML = "";
      target.empty.hidden = rows.length > 0;
      rows.forEach((r) => {
        const person = PEOPLE_BY_KEY[r.person];
        let fileCell = "—";
        if (r.filePath) {
          fileCell = `<button type="button" class="file-link" data-file>${escapeHtml(r.fileName || "File")}</button>`;
        }

        let noteHtml = "";
        if (r.autoSummary) noteHtml += `<div style="color:var(--muted);font-size:11.5px">⟳ ${escapeHtml(r.autoSummary)}</div>`;
        if (r.notes) noteHtml += `<div${r.autoSummary ? ' style="margin-top:4px"' : ""}>${escapeHtml(r.notes)}</div>`;
        if (!noteHtml) noteHtml = "—";

        const tr = document.createElement("tr");
        tr.innerHTML =
          `<td class="num">${escapeHtml(r.weekEnding || "")}</td>` +
          `<td>${escapeHtml(person ? person.name : r.person)}</td>` +
          `<td class="notes">${noteHtml}</td>` +
          `<td>${fileCell}</td>`;
        const fileBtn = tr.querySelector("[data-file]");
        if (fileBtn) fileBtn.addEventListener("click", () => downloadReportFile(r.filePath, r.fileName));
        target.body.appendChild(tr);
      });
    });
}

function showMsg(text, isError) {
  el.formMsg.hidden = false;
  el.formMsg.textContent = text;
  el.formMsg.className = "form-msg " + (isError ? "error" : "ok");
}
function hideMsg() { el.formMsg.hidden = true; }

function formatNum(n) {
  n = Number(n) || 0;
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function toDateInputValue(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s == null ? "" : String(s);
  return div.innerHTML;
}
