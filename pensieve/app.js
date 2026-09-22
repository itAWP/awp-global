import { upload } from "/pensieve/vendor/vercel-blob-client.js";
import * as pdfjsLib from "/pensieve/vendor/pdfjs/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pensieve/vendor/pdfjs/pdf.worker.min.mjs";

const STORAGE_KEY = "pensieve.session";

const el = {
  gate: document.getElementById("gate"),
  gateForm: document.getElementById("gateForm"),
  gateError: document.getElementById("gateError"),
  gateSubmit: document.getElementById("gateSubmit"),
  name: document.getElementById("p-name"),
  pass: document.getElementById("p-pass"),
  app: document.getElementById("app"),
  signOut: document.getElementById("signOut"),
  uploadBtn: document.getElementById("uploadBtn"),
  toolbarHint: document.getElementById("toolbarHint"),
  fileInput: document.getElementById("fileInput"),
  status: document.getElementById("status"),
  fileList: document.getElementById("fileList"),
  presenter: document.getElementById("presenter"),
  presenterTitle: document.getElementById("presenterTitle"),
  presenterClose: document.getElementById("presenterClose"),
  presenterLoading: document.getElementById("presenterLoading"),
  presenterCanvas: document.getElementById("presenterCanvas"),
  presenterNav: document.getElementById("presenterNav"),
  prevPage: document.getElementById("prevPage"),
  nextPage: document.getElementById("nextPage"),
  pageIndicator: document.getElementById("pageIndicator"),
};

function getSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.expires || parsed.expires < Date.now()) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function setSession(token, expires, name, role) {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ token, expires, name: name || "", role }),
  );
}

function isStaff() {
  return getSession()?.role === "staff";
}

function clearSession() {
  sessionStorage.removeItem(STORAGE_KEY);
}

function authHeader() {
  const s = getSession();
  return s ? { Authorization: `Bearer ${s.token}` } : {};
}

function showGate(message) {
  el.app.hidden = true;
  el.gate.hidden = false;
  if (message) {
    el.gateError.textContent = message;
    el.gateError.hidden = false;
  }
}

function showApp() {
  el.gate.hidden = true;
  el.app.hidden = false;

  const staff = isStaff();
  el.uploadBtn.hidden = !staff;
  el.toolbarHint.textContent = staff
    ? "Upload a PDF, then present it full screen or download it."
    : "Present a deck full screen, or download it.";

  loadFiles();
}

function setStatus(text, isError) {
  el.status.textContent = text || "";
  el.status.classList.toggle("error", Boolean(isError));
}

function formatSize(bytes) {
  if (!Number.isFinite(bytes)) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "";
  }
}

function displayName(name) {
  const parts = name.split("/");
  return parts[parts.length - 1];
}

// ---------- Auth ----------

el.gateForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  el.gateError.hidden = true;
  el.gateSubmit.disabled = true;
  el.gateSubmit.textContent = "Checking…";

  try {
    const res = await fetch("/api/pensieve/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode: el.pass.value }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || "Passcode not recognised.");
    }
    setSession(data.token, data.expires, el.name.value.trim(), data.role);
    el.pass.value = "";
    showApp();
  } catch (err) {
    el.gateError.textContent = err.message || "Something went wrong.";
    el.gateError.hidden = false;
  } finally {
    el.gateSubmit.disabled = false;
    el.gateSubmit.textContent = "Enter";
  }
});

el.signOut.addEventListener("click", () => {
  clearSession();
  showGate();
});

// ---------- File list ----------

async function loadFiles() {
  setStatus("Loading files…");
  try {
    const res = await fetch("/api/pensieve/files", { headers: authHeader() });
    if (res.status === 401) {
      clearSession();
      return showGate("Your session expired. Please enter the passcode again.");
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not load files.");
    renderFiles(data.files || []);
    setStatus("");
  } catch (err) {
    setStatus(err.message || "Could not load files.", true);
  }
}

function renderFiles(files) {
  el.fileList.innerHTML = "";
  if (files.length === 0) {
    el.fileList.innerHTML =
      '<div class="empty">No presentations yet. Upload a PDF to get started.</div>';
    return;
  }

  const staff = isStaff();

  for (const f of files) {
    const row = document.createElement("div");
    row.className = "file-row";
    row.innerHTML = `
      <div class="file-icon">PDF</div>
      <div class="file-meta">
        <div class="file-name" title="${escapeHtml(displayName(f.name))}">${escapeHtml(displayName(f.name))}</div>
        <div class="file-sub">${formatSize(f.size)} · ${formatDate(f.uploadedAt)}</div>
      </div>
      <div class="file-actions">
        <button class="icon-btn present">Present</button>
        <button class="icon-btn download">Download</button>
        ${staff ? '<button class="icon-btn danger delete">Delete</button>' : ""}
      </div>
    `;
    row.querySelector(".present").addEventListener("click", () => present(f));
    row.querySelector(".download").addEventListener("click", () => downloadFile(f));
    row.querySelector(".delete")?.addEventListener("click", () => deleteFile(f));
    el.fileList.appendChild(row);
  }
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

// ---------- Upload ----------

el.uploadBtn.addEventListener("click", () => el.fileInput.click());

el.fileInput.addEventListener("change", async () => {
  const file = el.fileInput.files?.[0];
  el.fileInput.value = "";
  if (!file) return;

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    setStatus("Only PDF files are supported.", true);
    return;
  }

  const session = getSession();
  if (!session) {
    return showGate("Your session expired. Please enter the passcode again.");
  }

  el.uploadBtn.disabled = true;
  setStatus(`Uploading "${file.name}"…`);

  try {
    const id =
      window.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    // Vercel Blob's own upload path silently turns a raw space in the
    // pathname into a literal "+" in the stored key (not just a display
    // quirk — confirmed by re-fetching the blob afterwards), which is then
    // indistinguishable from a real "+" the filename might contain. Pre-
    // encoding here means nothing ambiguous ever reaches it; files.js
    // decodeURIComponent()s this same segment back for display.
    const pathname = `pensieve/${id}/${encodeURIComponent(file.name)}`;

    await upload(pathname, file, {
      access: "private",
      handleUploadUrl: "/api/pensieve/upload",
      clientPayload: JSON.stringify({ sessionToken: session.token }),
    });

    setStatus("Upload complete.");
    await loadFiles();
  } catch (err) {
    setStatus(err.message || "Upload failed.", true);
  } finally {
    el.uploadBtn.disabled = false;
  }
});

// ---------- Download ----------

async function downloadFile(f) {
  setStatus(`Preparing "${displayName(f.name)}"…`);
  try {
    const res = await fetch(
      `/api/pensieve/files?id=${encodeURIComponent(f.id)}`,
      { headers: authHeader() },
    );
    if (!res.ok) throw new Error("Download failed.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = displayName(f.name);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus("");
  } catch (err) {
    setStatus(err.message || "Download failed.", true);
  }
}

// ---------- Delete ----------

async function deleteFile(f) {
  if (!confirm(`Delete "${displayName(f.name)}"? This can't be undone.`)) return;
  setStatus(`Deleting "${displayName(f.name)}"…`);
  try {
    const res = await fetch(
      `/api/pensieve/files?id=${encodeURIComponent(f.id)}`,
      { method: "DELETE", headers: authHeader() },
    );
    if (!res.ok) throw new Error("Could not delete file.");
    setStatus("");
    await loadFiles();
  } catch (err) {
    setStatus(err.message || "Could not delete file.", true);
  }
}

// ---------- Presenter ----------

let pdfDoc = null;
let currentPage = 1;
let renderingPage = false;

async function present(f) {
  el.presenter.hidden = false;
  el.presenterTitle.textContent = displayName(f.name);
  el.presenterCanvas.hidden = true;
  el.presenterNav.hidden = true;
  el.presenterLoading.hidden = false;
  el.presenterLoading.textContent = "Loading…";

  try {
    const res = await fetch(
      `/api/pensieve/files?id=${encodeURIComponent(f.id)}&inline=1`,
      { headers: authHeader() },
    );
    if (!res.ok) throw new Error("Could not open file.");
    const buf = await res.arrayBuffer();

    pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise;
    currentPage = 1;

    el.presenterLoading.hidden = true;
    el.presenterCanvas.hidden = false;
    el.presenterNav.hidden = false;

    await renderPage(currentPage);

    if (el.presenter.requestFullscreen) {
      el.presenter.requestFullscreen().catch(() => {});
    }
  } catch (err) {
    el.presenterLoading.textContent = err.message || "Could not open file.";
  }
}

async function renderPage(num) {
  if (!pdfDoc || renderingPage) return;
  renderingPage = true;
  try {
    const page = await pdfDoc.getPage(num);
    const container = el.presenter;
    const maxWidth = container.clientWidth * 0.92;
    const maxHeight = (container.clientHeight - 56) * 0.92;
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(maxWidth / base.width, maxHeight / base.height);
    const viewport = page.getViewport({ scale: Math.max(scale, 0.1) });

    const canvas = el.presenterCanvas;
    const ctx = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;
    el.pageIndicator.textContent = `${num} / ${pdfDoc.numPages}`;
    el.prevPage.disabled = num <= 1;
    el.nextPage.disabled = num >= pdfDoc.numPages;
  } catch (err) {
    el.pageIndicator.textContent = "Render error";
  } finally {
    renderingPage = false;
  }
}

function closePresenter() {
  el.presenter.hidden = true;
  pdfDoc = null;
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
}

el.presenterClose.addEventListener("click", closePresenter);
el.prevPage.addEventListener("click", () => {
  if (currentPage > 1) renderPage((currentPage -= 1));
});
el.nextPage.addEventListener("click", () => {
  if (pdfDoc && currentPage < pdfDoc.numPages) renderPage((currentPage += 1));
});

document.addEventListener("keydown", (e) => {
  if (el.presenter.hidden) return;
  if (e.key === "Escape") closePresenter();
  else if (e.key === "ArrowRight" || e.key === " ") {
    e.preventDefault();
    if (pdfDoc && currentPage < pdfDoc.numPages) renderPage((currentPage += 1));
  } else if (e.key === "ArrowLeft") {
    if (currentPage > 1) renderPage((currentPage -= 1));
  }
});

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement && !el.presenter.hidden) {
    // User exited fullscreen (e.g. Esc) without closing the presenter panel.
    // Keep the overlay open — just re-render at the new (windowed) size.
    if (pdfDoc) renderPage(currentPage);
  }
});

window.addEventListener("resize", () => {
  if (!el.presenter.hidden && pdfDoc) renderPage(currentPage);
});

// ---------- Boot ----------

const existing = getSession();
if (existing) {
  if (existing.name) el.name.value = existing.name;
  showApp();
} else {
  showGate();
}
