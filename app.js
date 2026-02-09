const state = {
  points: 0,
  minutes: 0,
  history: [],
  settings: {
    ratioPoints: 10,
    ratioMinutes: 5,
    scanReward: 10,
    autoConvert: false,
    reducedMotion: false,
    sound: true,
  },
  lastHash: null,
  lastHashTime: 0,
};

const elements = {
  splash: document.getElementById("splash"),
  dashboard: document.getElementById("dashboard"),
  startBtn: document.getElementById("start-btn"),
  points: document.getElementById("points"),
  minutes: document.getElementById("minutes"),
  ratioLabel: document.getElementById("ratio-label"),
  convertBtn: document.getElementById("convert-btn"),
  startBreakBtn: document.getElementById("start-break-btn"),
  timer: document.getElementById("timer"),
  fileInput: document.getElementById("file-input"),
  previewImg: document.getElementById("preview-img"),
  previewMeta: document.getElementById("preview-meta"),
  category: document.getElementById("category"),
  scanBtn: document.getElementById("scan-btn"),
  scanResult: document.getElementById("scan-result"),
  leaderboard: document.getElementById("leaderboard"),
  history: document.getElementById("history"),
  ratioPoints: document.getElementById("ratio-points"),
  ratioMinutes: document.getElementById("ratio-minutes"),
  scanReward: document.getElementById("scan-reward"),
  autoConvert: document.getElementById("auto-convert"),
  saveSettings: document.getElementById("save-settings"),
  resetData: document.getElementById("reset-data"),
  toggleReduced: document.getElementById("toggle-reduced"),
  toggleSound: document.getElementById("toggle-sound"),
  boot: document.getElementById("boot"),
  fallback: document.getElementById("fallback"),
  scene: document.getElementById("scene"),
};

let breakTimer = null;
let remainingSeconds = 0;
let audioContext = null;
let three = null;
let threeRAF = null;
let splashActive = true;

const STORAGE_KEY = "noname-state";

const leaderboardDemo = [
  { name: "You", points: 120 },
  { name: "Nova (BOT)", points: 110 },
  { name: "Pulse (BOT)", points: 105 },
  { name: "Echo (BOT)", points: 102 },
  { name: "Vega (BOT)", points: 98 },
  { name: "Ion (BOT)", points: 96 },
  { name: "Zara (BOT)", points: 92 },
  { name: "Lux (BOT)", points: 90 },
  { name: "Byte (BOT)", points: 88 },
  { name: "Astra (BOT)", points: 86 },
  { name: "Milo (BOT)", points: 84 },
  { name: "Kira (BOT)", points: 82 },
  { name: "Zen (BOT)", points: 80 },
  { name: "Kai (BOT)", points: 78 },
  { name: "Demo (BOT)", points: 76 },
];

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    Object.assign(state, parsed);
  } catch (error) {
    console.warn("State load failed", error);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function updateStats() {
  elements.points.textContent = state.points;
  elements.minutes.textContent = state.minutes;
  elements.ratioLabel.textContent = `${state.settings.ratioPoints} pts = ${state.settings.ratioMinutes} min`;
  elements.ratioPoints.value = state.settings.ratioPoints;
  elements.ratioMinutes.value = state.settings.ratioMinutes;
  elements.scanReward.value = state.settings.scanReward;
  elements.autoConvert.checked = state.settings.autoConvert;
  elements.toggleReduced.textContent = state.settings.reducedMotion ? "Reduced motion: On" : "Reduced motion";
  elements.toggleSound.textContent = `Sound: ${state.settings.sound ? "On" : "Off"}`;
  document.body.classList.toggle("reduced-motion", state.settings.reducedMotion);
}

function addHistory(entry) {
  state.history.unshift({
    id: crypto.randomUUID(),
    entry,
    time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
  });
  state.history = state.history.slice(0, 12);
  saveState();
  renderHistory();
}

function renderHistory() {
  elements.history.innerHTML = "";
  if (!state.history.length) {
    const item = document.createElement("li");
    item.textContent = "No activity yet.";
    elements.history.appendChild(item);
    return;
  }
  state.history.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.time} — ${item.entry}`;
    elements.history.appendChild(li);
  });
}

function renderLeaderboard() {
  elements.leaderboard.innerHTML = "";
  leaderboardDemo.forEach((entry, index) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${index + 1}. ${entry.name}</span><span>${entry.points} pts</span>`;
    elements.leaderboard.appendChild(li);
  });
}

function playBeep(freq = 440, duration = 0.12) {
  if (!state.settings.sound) return;
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.value = 0.08;
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start();
  osc.stop(audioContext.currentTime + duration);
}

function startBreak() {
  if (state.minutes <= 0) {
    addHistory("No minutes available for a break.");
    return;
  }
  remainingSeconds = state.minutes * 60;
  state.minutes = 0;
  updateStats();
  saveState();
  elements.timer.textContent = formatTime(remainingSeconds);
  if (breakTimer) clearInterval(breakTimer);
  breakTimer = setInterval(() => {
    remainingSeconds -= 1;
    elements.timer.textContent = formatTime(Math.max(remainingSeconds, 0));
    if (remainingSeconds <= 0) {
      clearInterval(breakTimer);
      addHistory("Break complete. Returning to focus.");
      document.body.classList.add("closed-mode");
      setTimeout(() => document.body.classList.remove("closed-mode"), 1200);
    }
  }, 1000);
  addHistory("Break started.");
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function convertPoints({ silent = false } = {}) {
  const { ratioPoints, ratioMinutes } = state.settings;
  if (state.points < ratioPoints) {
    if (!silent) addHistory("Not enough points to convert.");
    return;
  }
  const packs = Math.floor(state.points / ratioPoints);
  state.points -= packs * ratioPoints;
  state.minutes += packs * ratioMinutes;
  if (!silent) addHistory(`Converted ${packs * ratioPoints} pts into ${packs * ratioMinutes} min.`);
  updateStats();
  saveState();
}

function hashFile(file) {
  if (!file) return null;
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function scanProof() {
  const file = elements.fileInput.files[0];
  if (!file) {
    elements.scanResult.textContent = "Upload a file before scanning.";
    return;
  }
  playBeep(520, 0.08);
  setTimeout(() => {
    const hash = hashFile(file);
    const now = Date.now();
    let chance = 0.8;
    let warning = "";
    if (hash === state.lastHash && now - state.lastHashTime < 2 * 60 * 1000) {
      chance = 0.1;
      warning = " (cooldown active: repeated proof)";
    }
    const approved = Math.random() < chance;
    state.lastHash = hash;
    state.lastHashTime = now;
    if (approved) {
      state.points += state.settings.scanReward;
      playBeep(880, 0.12);
      elements.scanResult.textContent = `Approved +${state.settings.scanReward} pts${warning}`;
      addHistory(`Scan approved in ${elements.category.value}. +${state.settings.scanReward} pts.`);
      if (state.settings.autoConvert) {
        convertPoints({ silent: true });
      }
    } else {
      playBeep(220, 0.2);
      elements.scanResult.textContent = `Rejected${warning}`;
      addHistory(`Scan rejected in ${elements.category.value}.`);
    }
    updateStats();
    saveState();
  }, 1900);
}

function handleFilePreview() {
  const file = elements.fileInput.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  elements.previewImg.src = url;
  elements.previewImg.style.display = "block";
  elements.previewMeta.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;
}

function applySettings() {
  const ratioPoints = Number(elements.ratioPoints.value) || 10;
  const ratioMinutes = Number(elements.ratioMinutes.value) || 5;
  const scanReward = Number(elements.scanReward.value) || 10;
  state.settings.ratioPoints = Math.max(ratioPoints, 1);
  state.settings.ratioMinutes = Math.max(ratioMinutes, 1);
  state.settings.scanReward = Math.max(scanReward, 1);
  state.settings.autoConvert = elements.autoConvert.checked;
  updateStats();
  saveState();
  addHistory("Settings updated.");
}

function resetData() {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

function initBootSequence() {
  const lines = elements.boot.querySelectorAll("p");
  lines.forEach((line, index) => {
    line.style.opacity = "0";
    setTimeout(() => {
      line.style.opacity = "1";
      playBeep(640 + index * 120, 0.06);
    }, 400 + index * 650);
  });
}

function startApp() {
  elements.splash.classList.remove("is-active");
  elements.dashboard.classList.add("is-active");
  splashActive = false;
  stopThree();
}

function toggleReducedMotion() {
  state.settings.reducedMotion = !state.settings.reducedMotion;
  updateStats();
  saveState();
}

function toggleSound() {
  state.settings.sound = !state.settings.sound;
  updateStats();
  saveState();
}

function initEvents() {
  elements.startBtn.addEventListener("click", startApp);
  elements.convertBtn.addEventListener("click", convertPoints);
  elements.startBreakBtn.addEventListener("click", startBreak);
  elements.fileInput.addEventListener("change", handleFilePreview);
  elements.scanBtn.addEventListener("click", scanProof);
  elements.saveSettings.addEventListener("click", applySettings);
  elements.resetData.addEventListener("click", resetData);
  elements.toggleReduced.addEventListener("click", toggleReducedMotion);
  elements.toggleSound.addEventListener("click", toggleSound);
}

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && canvas.getContext("webgl"));
  } catch (error) {
    return false;
  }
}

function loadThreeScript() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js";
    script.onload = () => resolve(window.THREE);
    script.onerror = () => reject(new Error("Three.js CDN failed"));
    document.head.appendChild(script);
  });
}

function initThreeScene(THREE) {
  const renderer = new THREE.WebGLRenderer({ canvas: elements.scene, antialias: true, alpha: true });
  const ratio = Math.min(window.devicePixelRatio || 1, 1.6);
  renderer.setPixelRatio(ratio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b0b1b, 12, 38);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 2.8, 8);

  const ambient = new THREE.AmbientLight(0x7f7fff, 0.5);
  const key = new THREE.DirectionalLight(0xff77ff, 1.2);
  key.position.set(2, 6, 4);
  const fill = new THREE.PointLight(0x44ccff, 1, 20);
  fill.position.set(-4, 2, 4);
  scene.add(ambient, key, fill);

  const grid = new THREE.GridHelper(60, 60, 0x4cc9f0, 0x3a0ca3);
  grid.position.y = -1.6;
  scene.add(grid);

  const particles = new THREE.BufferGeometry();
  const count = 200;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 25;
    positions[i * 3 + 1] = Math.random() * 8;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 25;
  }
  particles.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({ color: 0x4cc9f0, size: 0.06 });
  const particleMesh = new THREE.Points(particles, particleMat);
  scene.add(particleMesh);

  const robot = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2b2b53, metalness: 0.4, roughness: 0.5 });
  const glowMat = new THREE.MeshStandardMaterial({ color: 0xf72585, emissive: 0xf72585, emissiveIntensity: 1.5 });
  const coreMat = new THREE.MeshStandardMaterial({ color: 0x4cc9f0, emissive: 0x4cc9f0, emissiveIntensity: 1.2 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 1), bodyMat);
  torso.position.y = 0.4;
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 1.1), bodyMat);
  head.position.y = 2.0;
  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.1), glowMat);
  eye.position.set(0, 2.05, 0.6);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 12), coreMat);
  antenna.position.set(0.5, 2.7, 0);

  const armLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.4, 16), bodyMat);
  armLeft.rotation.z = Math.PI / 8;
  armLeft.position.set(-1.2, 0.6, 0);
  const armRight = armLeft.clone();
  armRight.rotation.z = -Math.PI / 8;
  armRight.position.set(1.2, 0.6, 0);

  const legLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 1.6, 16), bodyMat);
  legLeft.position.set(-0.5, -1.2, 0);
  const legRight = legLeft.clone();
  legRight.position.set(0.5, -1.2, 0);

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), coreMat);
  core.position.set(0, 0.6, 0.55);

  robot.add(torso, head, eye, antenna, armLeft, armRight, legLeft, legRight, core);
  scene.add(robot);

  let clock = new THREE.Clock();

  function animate() {
    if (!splashActive) return;
    threeRAF = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    robot.position.y = Math.sin(t * 1.5) * 0.1;
    head.rotation.y = Math.sin(t * 0.8) * 0.2;
    eye.visible = Math.sin(t * 6) > -0.1;
    camera.position.x = Math.sin(t * 0.2) * 0.8;
    camera.lookAt(0, 0.8, 0);
    grid.position.z = (t * 0.6) % 1;
    key.intensity = 1 + Math.sin(t * 0.7) * 0.2;
    fill.intensity = 0.9 + Math.cos(t * 0.5) * 0.2;
    particleMesh.rotation.y += 0.0008;
    renderer.render(scene, camera);
  }

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }

  window.addEventListener("resize", resize);

  animate();

  return {
    stop() {
      cancelAnimationFrame(threeRAF);
    },
  };
}

async function initThree() {
  if (!supportsWebGL()) {
    elements.fallback.classList.remove("hidden");
    return;
  }
  try {
    const THREE = await loadThreeScript();
    three = initThreeScene(THREE);
  } catch (error) {
    console.warn(error);
    elements.fallback.classList.remove("hidden");
  }
}

function stopThree() {
  if (three && three.stop) {
    three.stop();
  }
}

function init() {
  loadState();
  updateStats();
  renderLeaderboard();
  renderHistory();
  initEvents();
  initBootSequence();
  initThree();
}

init();
