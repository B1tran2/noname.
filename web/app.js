const state = {
  userId: localStorage.getItem("noname:userId") || crypto.randomUUID(),
  alias: localStorage.getItem("noname:alias") || `Anon-${Math.floor(Math.random() * 9999)}`,
  points: Number(localStorage.getItem("noname:points") || 0),
  minutes: Number(localStorage.getItem("noname:minutes") || 0),
  streak: Number(localStorage.getItem("noname:streak") || 0),
  apiBase: localStorage.getItem("noname:apiBase") || "",
  demoMode: false,
  ws: null,
  lastPhotoHash: localStorage.getItem("noname:lastHash") || "",
  lastPhotoAt: Number(localStorage.getItem("noname:lastPhotoAt") || 0),
  rejectCount: Number(localStorage.getItem("noname:rejectCount") || 0),
  rejectCooldownUntil: Number(localStorage.getItem("noname:rejectCooldownUntil") || 0),
};

localStorage.setItem("noname:userId", state.userId);

const elements = {
  pages: document.querySelectorAll(".page"),
  navButtons: document.querySelectorAll(".nav-btn"),
  points: document.getElementById("points"),
  minutes: document.getElementById("minutes"),
  streak: document.getElementById("streak"),
  startLink: document.getElementById("start-link"),
  startCamera: document.getElementById("start-camera"),
  apiBase: document.getElementById("api-base"),
  alias: document.getElementById("alias"),
  saveSettings: document.getElementById("save-settings"),
  resetLocal: document.getElementById("reset-local"),
  generateLink: document.getElementById("generate-link"),
  linkCode: document.getElementById("link-code"),
  linkQr: document.getElementById("link-qr"),
  mobileCode: document.getElementById("mobile-code"),
  mobileConnect: document.getElementById("mobile-connect"),
  mobileStatus: document.getElementById("mobile-status"),
  cameraView: document.getElementById("camera-view"),
  cameraCanvas: document.getElementById("camera-canvas"),
  takePhoto: document.getElementById("take-photo"),
  sendPhoto: document.getElementById("send-photo"),
  photoCategory: document.getElementById("photo-category"),
  photoFeedback: document.getElementById("photo-feedback"),
  enrollView: document.getElementById("enroll-view"),
  enrollCanvas: document.getElementById("enroll-canvas"),
  enrollCapture: document.getElementById("enroll-capture"),
  enrollReset: document.getElementById("enroll-reset"),
  enrollList: document.getElementById("enroll-list"),
  leaderboardList: document.getElementById("leaderboard-list"),
  leaderboardTabs: document.querySelectorAll(".tab"),
  checkApi: document.getElementById("check-api"),
  apiStatus: document.getElementById("api-status"),
  checkWs: document.getElementById("check-ws"),
  wsStatus: document.getElementById("ws-status"),
  seedBots: document.getElementById("seed-bots"),
  botsStatus: document.getElementById("bots-status"),
};

function setStatus(el, text, type = "") {
  el.textContent = text;
  el.classList.remove("good", "bad");
  if (type) el.classList.add(type);
}

function formatMinutes(points) {
  return Math.floor(points / 10) * 15;
}

function updateStats() {
  elements.points.textContent = state.points;
  elements.minutes.textContent = state.minutes;
  elements.streak.textContent = state.streak;
  elements.alias.value = state.alias;
  elements.apiBase.value = state.apiBase;
}

function apiUrl(path) {
  if (!state.apiBase) return path;
  return `${state.apiBase.replace(/\/$/, "")}${path}`;
}

async function apiFetch(path, options = {}) {
  if (!state.apiBase) {
    state.demoMode = true;
    throw new Error("API no configurada");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(apiUrl(path), {
      ...options,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("API error");
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function showPage(id) {
  elements.pages.forEach((page) => page.classList.toggle("active", page.id === id));
  elements.navButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.route === id));
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-route]");
  if (target) {
    showPage(target.dataset.route);
  }
});

elements.startLink.addEventListener("click", () => showPage("link"));
elements.startCamera.addEventListener("click", () => showPage("camera"));

async function initCamera(videoEl) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });
    videoEl.srcObject = stream;
    return stream;
  } catch (error) {
    console.error(error);
    alert("No se pudo acceder a la cámara.");
    return null;
  }
}

let cameraStream = null;
let enrollStream = null;
let latestPhotoData = null;

async function startCamera() {
  if (!cameraStream) {
    cameraStream = await initCamera(elements.cameraView);
  }
}

async function startEnrollCamera() {
  if (!enrollStream) {
    enrollStream = await initCamera(elements.enrollView);
  }
}

function capturePhoto(videoEl, canvasEl) {
  const ctx = canvasEl.getContext("2d");
  canvasEl.width = videoEl.videoWidth || 640;
  canvasEl.height = videoEl.videoHeight || 480;
  ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
  return canvasEl.toDataURL("image/jpeg", 0.85);
}

function hashPhoto(dataUrl) {
  const img = new Image();
  return new Promise((resolve) => {
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const size = 8;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;
      let total = 0;
      const grayscale = [];
      for (let i = 0; i < data.length; i += 4) {
        const value = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
        grayscale.push(value);
        total += value;
      }
      const avg = total / grayscale.length;
      const hash = grayscale.map((v) => (v > avg ? 1 : 0)).join("");
      resolve(hash);
    };
    img.src = dataUrl;
  });
}

function hashDistance(hashA, hashB) {
  if (!hashA || !hashB) return 999;
  let diff = 0;
  for (let i = 0; i < hashA.length; i += 1) {
    if (hashA[i] !== hashB[i]) diff += 1;
  }
  return diff;
}

function updateLocalScores(pointsDelta) {
  state.points += pointsDelta;
  state.minutes = formatMinutes(state.points);
  state.streak = pointsDelta > 0 ? state.streak + 1 : 0;
  localStorage.setItem("noname:points", state.points);
  localStorage.setItem("noname:minutes", state.minutes);
  localStorage.setItem("noname:streak", state.streak);
  updateStats();
}

async function submitScore(action, photoHash) {
  if (state.demoMode) {
    if (action === "approve") {
      updateLocalScores(10);
    }
    return { status: "demo" };
  }
  return apiFetch("/api/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: state.userId,
      alias: state.alias,
      action,
      photoHash,
    }),
  });
}

async function handleSendPhoto() {
  if (!latestPhotoData) {
    setStatus(elements.photoFeedback, "Captura una foto primero.", "bad");
    return;
  }
  const now = Date.now();
  if (state.rejectCooldownUntil > now) {
    setStatus(elements.photoFeedback, "Cooldown activo por rechazos.", "bad");
    return;
  }
  if (now - state.lastPhotoAt < 120000) {
    setStatus(elements.photoFeedback, "Cooldown de 2 minutos activo.", "bad");
    return;
  }
  const hash = await hashPhoto(latestPhotoData);
  if (hashDistance(hash, state.lastPhotoHash) < 6) {
    setStatus(elements.photoFeedback, "Foto muy similar a la anterior.", "bad");
    return;
  }
  try {
    const result = await submitScore("approve", hash);
    state.lastPhotoAt = now;
    state.lastPhotoHash = hash;
    localStorage.setItem("noname:lastHash", hash);
    localStorage.setItem("noname:lastPhotoAt", state.lastPhotoAt);
    if (result.status === "cooldown") {
      setStatus(elements.photoFeedback, result.message, "bad");
      return;
    }
    setStatus(elements.photoFeedback, "Foto aprobada. +10 puntos", "good");
    if (result.pointsTotal !== undefined) {
      state.points = result.pointsTotal;
      state.minutes = result.minutesTotal;
      localStorage.setItem("noname:points", state.points);
      localStorage.setItem("noname:minutes", state.minutes);
      updateStats();
    } else {
      updateLocalScores(10);
    }
  } catch (error) {
    state.demoMode = true;
    updateLocalScores(10);
    setStatus(elements.photoFeedback, "Modo demo: foto aprobada.", "good");
  }
}

async function loadLeaderboard(type = "total") {
  if (state.demoMode) {
    renderLeaderboard(getDemoLeaderboard());
    return;
  }
  try {
    const data = await apiFetch(`/api/leaderboard?type=${type}`);
    renderLeaderboard(data.entries || []);
  } catch (error) {
    state.demoMode = true;
    renderLeaderboard(getDemoLeaderboard());
  }
}

function renderLeaderboard(entries) {
  elements.leaderboardList.innerHTML = "";
  if (!entries.length) {
    elements.leaderboardList.innerHTML = "<li>Sin datos aún.</li>";
    return;
  }
  entries.forEach((entry, index) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>#${index + 1} ${entry.alias}</span><strong>${entry.points} pts</strong>`;
    elements.leaderboardList.appendChild(li);
  });
}

function getDemoLeaderboard() {
  const list = JSON.parse(localStorage.getItem("noname:demoBoard") || "[]");
  if (!list.length) {
    return [
      { alias: "BOT/DEMO - FocoZen", points: 120 },
      { alias: "BOT/DEMO - LofiCat", points: 110 },
      { alias: state.alias, points: state.points },
    ];
  }
  return list;
}

async function generateLink() {
  try {
    const data = await apiFetch("/api/relay/create", { method: "POST" });
    elements.linkCode.textContent = data.code;
    const linkUrl = `${window.location.origin}${window.location.pathname}?mode=link&code=${data.code}`;
    elements.linkQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      linkUrl
    )}`;
    connectRelay(data.code, "pc");
  } catch (error) {
    setStatus(elements.mobileStatus, "API no disponible (modo demo).", "bad");
  }
}

function connectRelay(code, role) {
  if (!state.apiBase) return;
  const wsUrl = apiUrl(`/api/relay/connect?code=${code}&role=${role}`).replace("https://", "wss://");
  const ws = new WebSocket(wsUrl);
  state.ws = ws;
  ws.onopen = () => {
    if (role === "mobile") {
      setStatus(elements.mobileStatus, "Conectado al PC.", "good");
    }
  };
  ws.onmessage = async (event) => {
    const payload = typeof event.data === "string" ? JSON.parse(event.data) : null;
    if (payload?.type === "decision") {
      setStatus(elements.mobileStatus, `PC: ${payload.status}`, payload.status === "approved" ? "good" : "bad");
    }
    if (payload?.type === "photo" && payload.dataUrl) {
      latestPhotoData = payload.dataUrl;
      elements.photoFeedback.textContent = "Foto recibida desde móvil.";
      const ctx = elements.cameraCanvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        elements.cameraCanvas.width = img.width;
        elements.cameraCanvas.height = img.height;
        ctx.drawImage(img, 0, 0);
      };
      img.src = payload.dataUrl;
      showPage("camera");
    }
  };
  ws.onclose = () => {
    if (role === "mobile") {
      setStatus(elements.mobileStatus, "Conexión cerrada.", "bad");
    }
  };
}

async function connectMobile() {
  const code = elements.mobileCode.value.trim().toUpperCase();
  if (!code) return;
  connectRelay(code, "mobile");
  if (state.ws) {
    state.ws.onopen = () => {
      setStatus(elements.mobileStatus, "Conectado. Envía tu foto.", "good");
    };
  }
}

async function sendPhotoToPc() {
  if (!latestPhotoData || !state.ws) {
    setStatus(elements.photoFeedback, "No hay vínculo activo.", "bad");
    return;
  }
  state.ws.send(JSON.stringify({ type: "photo", dataUrl: latestPhotoData, category: elements.photoCategory.value }));
  setStatus(elements.photoFeedback, "Foto enviada al PC.", "good");
}

async function approveFromPc(status) {
  if (!state.ws) return;
  state.ws.send(JSON.stringify({ type: "decision", status }));
}

async function loadEnrollment() {
  const items = await readEnrollment();
  elements.enrollList.innerHTML = "";
  items.forEach((item, index) => {
    const li = document.createElement("li");
    li.textContent = `Selfie ${index + 1} guardada.`;
    elements.enrollList.appendChild(li);
  });
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("noname", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore("selfies", { keyPath: "id", autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function addEnrollment(dataUrl) {
  const db = await openDb();
  return new Promise((resolve) => {
    const tx = db.transaction("selfies", "readwrite");
    tx.objectStore("selfies").add({ dataUrl, createdAt: Date.now() });
    tx.oncomplete = () => resolve();
  });
}

async function readEnrollment() {
  const db = await openDb();
  return new Promise((resolve) => {
    const tx = db.transaction("selfies", "readonly");
    const store = tx.objectStore("selfies");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
  });
}

async function clearEnrollment() {
  const db = await openDb();
  return new Promise((resolve) => {
    const tx = db.transaction("selfies", "readwrite");
    tx.objectStore("selfies").clear();
    tx.oncomplete = () => resolve();
  });
}

async function checkApi() {
  try {
    const data = await apiFetch("/api/ping");
    setStatus(elements.apiStatus, data.status === "ok" ? "Conectado" : "Error", data.status === "ok" ? "good" : "bad");
  } catch (error) {
    setStatus(elements.apiStatus, "Sin API", "bad");
  }
}

async function checkWs() {
  try {
    const data = await apiFetch("/api/relay/create", { method: "POST" });
    const wsUrl = apiUrl(`/api/relay/connect?code=${data.code}&role=wizard`).replace("https://", "wss://");
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      setStatus(elements.wsStatus, "Relay activo", "good");
      ws.close();
    };
    ws.onerror = () => setStatus(elements.wsStatus, "Fallo relay", "bad");
  } catch (error) {
    setStatus(elements.wsStatus, "Fallo relay", "bad");
  }
}

async function seedBots() {
  try {
    const data = await apiFetch("/api/bots/seed", { method: "POST" });
    setStatus(elements.botsStatus, data.status || "Listo", "good");
  } catch (error) {
    setStatus(elements.botsStatus, "No disponible", "bad");
    const demo = getDemoLeaderboard();
    localStorage.setItem("noname:demoBoard", JSON.stringify(demo));
  }
}

function setupEvents() {
  elements.generateLink.addEventListener("click", generateLink);
  elements.mobileConnect.addEventListener("click", connectMobile);
  elements.takePhoto.addEventListener("click", async () => {
    await startCamera();
    latestPhotoData = capturePhoto(elements.cameraView, elements.cameraCanvas);
    setStatus(elements.photoFeedback, "Foto capturada.", "good");
  });
  elements.sendPhoto.addEventListener("click", async () => {
    if (state.ws) {
      await sendPhotoToPc();
    } else {
      await handleSendPhoto();
    }
  });
  elements.enrollCapture.addEventListener("click", async () => {
    await startEnrollCamera();
    const photo = capturePhoto(elements.enrollView, elements.enrollCanvas);
    await addEnrollment(photo);
    await loadEnrollment();
  });
  elements.enrollReset.addEventListener("click", async () => {
    await clearEnrollment();
    await loadEnrollment();
  });
  elements.saveSettings.addEventListener("click", () => {
    state.alias = elements.alias.value.trim() || state.alias;
    state.apiBase = elements.apiBase.value.trim();
    localStorage.setItem("noname:alias", state.alias);
    localStorage.setItem("noname:apiBase", state.apiBase);
    updateStats();
  });
  elements.resetLocal.addEventListener("click", () => {
    localStorage.clear();
    location.reload();
  });
  elements.leaderboardTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      elements.leaderboardTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      loadLeaderboard(tab.dataset.board);
    });
  });
  elements.checkApi.addEventListener("click", checkApi);
  elements.checkWs.addEventListener("click", checkWs);
  elements.seedBots.addEventListener("click", seedBots);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      loadLeaderboard("total");
    }
  });
}

function handleDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  const code = params.get("code");
  if (mode === "link" && code) {
    showPage("link");
    elements.mobileCode.value = code;
  }
}

async function init() {
  updateStats();
  setupEvents();
  handleDeepLink();
  await loadEnrollment();
  await loadLeaderboard("total");
  await startCamera();
  await startEnrollCamera();
}

window.addEventListener("beforeunload", () => {
  if (cameraStream) cameraStream.getTracks().forEach((track) => track.stop());
  if (enrollStream) enrollStream.getTracks().forEach((track) => track.stop());
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

init();
