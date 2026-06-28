/**
 * WARD 13 — Game Engine
 */

const DOCUMENTS = [
  {
    title: 'Laporan Pasien No. 0034-B',
    body: `Tanggal: 14 Maret 1987

Pasien laki-laki, 34 tahun. Nama dirahasiakan atas perintah direktur.

Pasien dikurung di Sayap Barat sejak tiga bulan lalu setelah insiden di bangsal utama. Ia mengklaim mendengar suara dari balik dinding — suara pernapasan yang tidak berhenti bahkan di tengah malam.

Kami telah memeriksa dinding tersebut. Tidak ada yang kami temukan.

Namun catatan pengunjung menunjukkan bahwa dua perawat malam tidak pernah masuk shift pada tanggal yang sama dengan pemeriksaan itu.

— Dr. Kusuma, Psikiater Senior`
  },
  {
    title: 'Memo Internal — RAHASIA',
    body: `Kepada: Seluruh Staf Sayap Barat
Dari: Direktur Utama
Perihal: Protokol Malam

Efektif mulai 16 Maret 1987, tidak ada staf yang diizinkan berada di Sayap Barat sendirian setelah pukul 21.00.

Ini bukan permintaan.

Kunci cadangan lorong bawah tanah telah dipindahkan ke lemari arsip lantai dasar. Hanya direktur dan satu orang yang ditunjuk yang mengetahui lokasinya.

Jangan bertanya mengapa.
Patuhi saja.

— Direktur`
  },
  {
    title: 'Halaman Buku Harian (robek)',
    body: `...tidak bisa tidur lagi. Sudah empat malam.

Aku tidak gila. Aku TAHU aku tidak gila. Tapi setiap kali aku menutup mata, aku melihat lorong itu. Lorong yang sama. Lampu yang berkedip. Dan di ujungnya—

Mereka bilang aku harus istirahat. Mereka bilang itu hanya pikiran. Tapi kenapa Dr. Kusuma berhenti datang sejak Selasa? Kenapa tidak ada yang mau memberitahuku di mana kamar 13 itu?

Kalau kamu menemukan ini—

JANGAN BUKA PINTU DI UJUNG LORONG.`
  }
];

const State = {
  MENU: 'MENU', LOADING: 'LOADING', PLAYING: 'PLAYING',
  DOC_OPEN: 'DOC_OPEN', WIN: 'WIN', DEAD: 'DEAD'
};

let currentState = State.MENU;
let docsCollected = 0;
let hasKey = false;
let sanity = 100;
let scare1Done = false, scare2Done = false, scare3Done = false;
let nearItem = null;
let footstepTimer = null;
let movingKeys = {};
let sanityDecayInterval = null;
let pointerLocked = false;
let vrSession = false;
const vrStickInput = { w: false, a: false, s: false, d: false };

const TIME_LIMIT_SECONDS = 8 * 60;
let timeLeft = TIME_LIMIT_SECONDS;
let timerInterval = null;

const PLAYER_RADIUS = 0.32;
const MOVE_SPEED    = 3.2;
const R = PLAYER_RADIUS;

function isInCorridor(x, z) {
  if (x > -2.5 + R && x < 2.5 - R && z > -15 && z < 20.5 - R) return true;
  if (x > -17.5 + R && x < 2.5 - R && z >= -17.5 && z <= -12.5 - R) return true;
  if (x > -20 + R && x < -15 - R && z > -36 + R && z <= -17.5) return true;
  return false;
}

const OBSTACLES = [
  { x:  2,     z:  15,   hw: 0.50, hd: 0.95 },
  { x: -2,     z:   5,   hw: 0.50, hd: 0.95 },
  { x:  1.8,   z:   1,   hw: 0.15, hd: 0.15 },
  { x: -5,     z: -13.2, hw: 0.28, hd: 0.33 },
  { x: -13,    z: -14.5, hw: 0.35, hd: 0.35 },
  { x: -9,     z: -16.5, hw: 0.50, hd: 0.95 },
  { x: -19.7,  z: -29,   hw: 0.10, hd: 0.95 },
];

const menuScreen    = document.getElementById('menu-screen');
const loadingScreen = document.getElementById('loading-screen');
const loadingBar    = document.getElementById('loading-bar');
const loadingText   = document.getElementById('loading-text');
const endScreen     = document.getElementById('end-screen');
const endTitle      = document.getElementById('end-title');
const endDesc       = document.getElementById('end-desc');
const hud           = document.getElementById('hud');
const scareOverlay  = document.getElementById('scare-overlay');
const docViewer     = document.getElementById('doc-viewer');
const docTitle      = document.getElementById('doc-title');
const docBody       = document.getElementById('doc-body');
const interactHint  = document.getElementById('interact-hint');
const infoHint      = document.getElementById('info-hint');
const sanityBar     = document.getElementById('sanity-bar');
const hudKey        = document.getElementById('hud-key');
const btnCloseDoc   = document.getElementById('btn-close-doc');
const mainScene     = document.getElementById('main-scene');
const clickToLock   = document.getElementById('click-to-lock');
const hudCrosshair  = document.querySelector('.hud-crosshair');
const timerDisplay  = document.getElementById('timer-display');
const toast         = document.getElementById('toast');

function showScreen(id) {
  [menuScreen, loadingScreen, endScreen].forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}
function hideAllScreens() {
  [menuScreen, loadingScreen, endScreen].forEach(s => s.classList.remove('active'));
}

let toastTimeout = null;
function showToast(msg, type = 'info', duration = 3500) {
  if (!toast) return;
  clearTimeout(toastTimeout);
  toast.textContent = msg;
  toast.className = `toast toast-${type}`;
  toast.classList.remove('hidden');
  toastTimeout = setTimeout(() => toast.classList.add('hidden'), duration);
}

function setInfoHint(msg) {
  if (!infoHint) return;
  if (msg) { infoHint.textContent = msg; infoHint.classList.remove('hidden'); }
  else { infoHint.classList.add('hidden'); }
}

function startTimer() {
  timeLeft = TIME_LIMIT_SECONDS;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    if (currentState !== State.PLAYING && currentState !== State.DOC_OPEN) return;
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft === 300) showToast('⏱ 5 menit tersisa!', 'warn', 4000);
    if (timeLeft === 120) showToast('⏱ 2 menit lagi!', 'warn', 4000);
    if (timeLeft === 60)  showToast('⏱ 1 MENIT LAGI!', 'danger', 5000);
    if (timeLeft === 30)  showToast('⚠ 30 detik!', 'danger', 5000);
    if (timeLeft <= 0) { clearInterval(timerInterval); triggerDead('waktu'); }
  }, 1000);
}

function updateTimerDisplay() {
  if (!timerDisplay) return;
  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  timerDisplay.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  if (timeLeft <= 60)       timerDisplay.className = 'timer-display timer-danger';
  else if (timeLeft <= 120) timerDisplay.className = 'timer-display timer-warn';
  else                      timerDisplay.className = 'timer-display';
}

document.getElementById('btn-start').addEventListener('click', () => {
  AudioEngine.init();
  AudioEngine.resume();
  startLoading();
});
document.getElementById('btn-restart').addEventListener('click', () => { location.reload(); });

function startLoading() {
  currentState = State.LOADING;
  showScreen('loading-screen');
  const steps = [
    [10,'Memuat arsip rumah sakit...'],[30,'Menyiapkan lorong Sayap Barat...'],
    [55,'Memuat model 3D...'],[75,'Memverifikasi protokol keamanan...'],
    [90,'Peringatan: 2 staf hilang sejak 1987...'],[100,'Masuk...']
  ];
  let i = 0;
  const interval = setInterval(() => {
    if (i >= steps.length) { clearInterval(interval); setTimeout(startGame, 500); return; }
    const [pct, text] = steps[i];
    loadingBar.style.width = pct + '%';
    loadingText.textContent = text;
    i++;
  }, 400);
}

function startGame() {
  currentState = State.PLAYING;
  hideAllScreens();
  mainScene.classList.remove('hidden');
  hud.classList.remove('hidden');
  AudioEngine.startHeartbeat(55);
  startFlicker();
  startSanityDecay();
  startProximityCheck();
  setupKeyboard();
  setupInteract();
  setupVRControllers();
  startRedLightPulse();
  setupPointerLock();
  startCollisionLoop();
  startTimer();
  setTimeout(() => showToast('📄 Cari 3 dokumen sebelum bisa ambil kunci. Kamu punya 8 menit!', 'info', 5000), 1500);
}

let lastFrameTime = null;
const GROUND_Y = 1.6, GRAVITY = -9.8;
let velocityY = 0;
const BOB_FREQ = 2.2, BOB_AMPLITUDE = 0.028;
let bobPhase = 0, bobOffset = 0;

function isBlocked(x, z) {
  if (!isInCorridor(x, z)) return true;
  for (const o of OBSTACLES) {
    if (x > o.x - o.hw - R && x < o.x + o.hw + R &&
        z > o.z - o.hd - R && z < o.z + o.hd + R) return true;
  }
  return false;
}

// Helper: arah hadap player yang akurat di desktop MAUPUN VR.
// Di desktop, look-controls menulis rotasi ke #player, jadi cukup baca
// rotation attribute. Di VR/WebXR, pose head ditulis WebXR LANGSUNG ke
// object3D kamera child (bukan ke parent #player) — jadi kita harus baca
// world direction dari kamera, bukan rotation attribute parent.
function getPlayerFacing(player) {
  const camera = player.querySelector('a-camera');
  if (camera && camera.object3D && vrSession) {
    const dir = new THREE.Vector3();
    camera.object3D.getWorldDirection(dir);
    let fwdX = dir.x, fwdZ = dir.z;
    const len = Math.sqrt(fwdX * fwdX + fwdZ * fwdZ) || 1;
    fwdX /= len; fwdZ /= len;
    const yawRad = Math.atan2(-fwdX, -fwdZ);
    return { fwdX, fwdZ, rightX: -fwdZ, rightZ: fwdX, yawDeg: yawRad * 180 / Math.PI };
  }
  const rot = player.getAttribute('rotation') || { y: 0 };
  const yawDeg = rot.y || 0;
  const yawRad = yawDeg * Math.PI / 180;
  const fwdX = -Math.sin(yawRad), fwdZ = -Math.cos(yawRad);
  return { fwdX, fwdZ, rightX: Math.cos(yawRad), rightZ: -Math.sin(yawRad), yawDeg };
}

function startCollisionLoop() {
  const player = document.getElementById('player');
  const camera = player.querySelector('a-camera');
  function step(timestamp) {
    requestAnimationFrame(step);
    if (currentState !== State.PLAYING) { lastFrameTime = timestamp; return; }
    if (!pointerLocked && !vrSession) { lastFrameTime = timestamp; return; }
    if (lastFrameTime === null) lastFrameTime = timestamp;
    const dt = Math.min(0.1, (timestamp - lastFrameTime) / 1000);
    lastFrameTime = timestamp;
    const forward = movingKeys['w'] || movingKeys['arrowup']   || vrStickInput.w;
    const back    = movingKeys['s'] || movingKeys['arrowdown'] || vrStickInput.s;
    const left    = movingKeys['a'] || movingKeys['arrowleft'] || vrStickInput.a;
    const right   = movingKeys['d'] || movingKeys['arrowright'] || vrStickInput.d;
    const isMovingH = forward || back || left || right;
    const pos = player.getAttribute('position');
    if (!pos) return;
    velocityY += GRAVITY * dt;
    let newY = pos.y + velocityY * dt;
    if (newY <= GROUND_Y) { newY = GROUND_Y; velocityY = 0; }

    const { fwdX, fwdZ, rightX, rightZ } = getPlayerFacing(player);
    let moveX = 0, moveZ = 0;
    if (forward) { moveX += fwdX; moveZ += fwdZ; }
    if (back)    { moveX -= fwdX; moveZ -= fwdZ; }
    if (right)   { moveX += rightX; moveZ += rightZ; }
    if (left)    { moveX -= rightX; moveZ -= rightZ; }
    const len = Math.sqrt(moveX*moveX + moveZ*moveZ);
    if (len > 0.0001) { moveX /= len; moveZ /= len; }
    const dist = MOVE_SPEED * dt;
    let x = pos.x, z = pos.z;
    if (isMovingH) {
      const newX = x + moveX * dist;
      if (!isBlocked(newX, z)) x = newX;
      const newZ = z + moveZ * dist;
      if (!isBlocked(x, newZ)) z = newZ;
    }
    player.setAttribute('position', `${x} ${newY} ${z}`);
    // Camera bobbing manual TIDAK dipakai di VR — di VR, posisi/orientasi
    // kamera harus sepenuhnya datang dari head tracking headset supaya tidak
    // konflik dan menyebabkan motion sickness. Bobbing cuma untuk desktop.
    if (camera && !vrSession) {
      const onGround = newY <= GROUND_Y + 0.01;
      if (isMovingH && onGround) {
        bobPhase += BOB_FREQ * 2 * Math.PI * dt;
        bobOffset = Math.sin(bobPhase) * BOB_AMPLITUDE;
      } else {
        bobOffset *= 0.85;
        if (!isMovingH) bobPhase *= 0.95;
      }
      camera.setAttribute('position', `0 ${bobOffset} 0`);
    }
  }
  requestAnimationFrame(step);
}

function setupPointerLock() {
  function tryLock() {
    if (currentState !== State.PLAYING) return;
    const c = mainScene.canvas || document.querySelector('canvas');
    c?.requestPointerLock?.();
  }
  clickToLock.classList.remove('hidden');
  clickToLock.addEventListener('click', tryLock);
  document.addEventListener('pointerlockchange', () => {
    pointerLocked = !!document.pointerLockElement;
    if (pointerLocked) { clickToLock.classList.add('hidden'); }
    else if (currentState === State.PLAYING) { clickToLock.classList.remove('hidden'); }
  });
}

function startFlicker() {
  const lightDefs = [
    { id: 'light-0', base: 0.80 }, { id: 'light-1', base: 0.65 },
    { id: 'light-2', base: 0.55 }, { id: 'light-3', base: 0.40 },
    { id: 'light-4', base: 0.30 }, { id: 'light-5', base: 0.28 },
    { id: 'light-6', base: 0.22 }, { id: 'light-7', base: 0.20 },
    { id: 'light-8', base: 0.18 },
  ];
  function flicker(light, base) {
    if (!light) return;
    const intensity = Math.random() > 0.06 ? base + (Math.random()-0.5)*0.28 : 0;
    light.setAttribute('intensity', Math.max(0, intensity));
    setTimeout(() => flicker(light, base), 80 + Math.random()*300);
  }
  lightDefs.forEach(({ id, base }, i) => {
    const el = document.getElementById(id);
    setTimeout(() => flicker(el, base), i * 120);
  });
}

function startRedLightPulse() {
  const red = document.getElementById('light-red');
  let up = true, val = 0;
  setInterval(() => {
    val += up ? 0.02 : -0.02;
    if (val >= 0.6) up = false;
    if (val <= 0)   up = true;
    red?.setAttribute('intensity', Math.max(0, val));
  }, 50);
}

function startSanityDecay() {
  sanityDecayInterval = setInterval(() => {
    if (currentState !== State.PLAYING) return;
    sanity = Math.max(0, sanity - 0.12);
    updateSanityBar();
    applySanityEffects();
    if (sanity <= 0) triggerDead('kegilaan');
  }, 500);
}

function updateSanityBar() {
  sanityBar.style.width = sanity + '%';
  if (sanity > 60) sanityBar.style.background = '#4a8a4a';
  else if (sanity > 30) sanityBar.style.background = '#8a7a20';
  else sanityBar.style.background = '#8a2020';
}

function applySanityEffects() {
  const scene = document.querySelector('a-scene');
  if (!scene) return;
  if (sanity < 40 && sanity >= 20) {
    document.body.classList.remove('distort-mid');
    document.body.classList.add('distort-low');
    scene.setAttribute('fog', 'type: exponential; color: #0a0505; density: 0.18');
  } else if (sanity < 20) {
    document.body.classList.remove('distort-low');
    document.body.classList.add('distort-mid');
    scene.setAttribute('fog', 'type: exponential; color: #0a0505; density: 0.25');
    AudioEngine.setHeartbeatBpm(90);
  }
}

function setupKeyboard() {
  const moveKeys = ['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'];
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (moveKeys.includes(k)) {
      if (!movingKeys[k]) {
        movingKeys[k] = true;
        if (!footstepTimer) {
          footstepTimer = setInterval(() => {
            if (currentState === State.PLAYING) AudioEngine.playFootstep();
          }, 480);
        }
      }
    }
    if (k === 'e') handleInteract();
  });
  document.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    movingKeys[k] = false;
    if (!['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].some(mk => movingKeys[mk]) && footstepTimer) {
      clearInterval(footstepTimer);
      footstepTimer = null;
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// KONTROLER VR
//
// Mode desktop (WASD+mouse) tetap berjalan persis seperti sebelumnya —
// kode di bawah ini HANYA aktif kalau sesi immersive-vr benar2 dimulai
// (headset asli ATAU emulator Quest seperti Immersive Web Emulator).
//
// - Thumbstick KIRI  → locomotion. Sumbu Y joystick di-mapping ke
//   movingKeys['w']/['s'] yang sudah dibaca startCollisionLoop(),
//   jadi tidak perlu logic gerak baru sama sekali.
// - Thumbstick KIRI sumbu X → strafe kiri/kanan (movingKeys['a']/['d']).
// - Trigger KANAN (selectstart/triggerdown) → sama seperti tombol E,
//   panggil handleInteract().
// ═══════════════════════════════════════════════════════════════

const VR_STICK_DEADZONE = 0.2;

function setupVRControllers() {
  const scene = document.querySelector('a-scene');
  if (!scene) return;

  scene.addEventListener('enter-vr', () => {
    vrSession = true;
    // Sembunyikan overlay desktop yang tidak relevan di VR
    clickToLock?.classList.add('hidden');
  });
  scene.addEventListener('exit-vr', () => {
    vrSession = false;
    vrStickInput.w = vrStickInput.a = vrStickInput.s = vrStickInput.d = false;
  });

  const rightHand = document.getElementById('right-hand');
  const leftHand  = document.getElementById('left-hand');

  // Trigger kanan (atau kiri, sebagai cadangan) = interact, sama seperti tombol E
  [rightHand, leftHand].forEach(hand => {
    if (!hand) return;
    hand.addEventListener('triggerdown', handleInteract);
    hand.addEventListener('selectstart', handleInteract);
    // Beberapa kontroler generik memetakan tombol A/X ke 'abuttondown'
    hand.addEventListener('abuttondown', handleInteract);
  });

  // Polling thumbstick kiri tiap frame untuk locomotion halus.
  // PENTING: hasil baca stick TIDAK langsung menimpa movingKeys (supaya
  // tidak konflik dengan input keyboard atau testing manual) — disimpan
  // di vrStickInput, lalu digabung (OR) dengan movingKeys di startCollisionLoop.
  function pollSticks() {
    requestAnimationFrame(pollSticks);
    if (!vrSession || currentState !== State.PLAYING) {
      vrStickInput.w = vrStickInput.a = vrStickInput.s = vrStickInput.d = false;
      return;
    }
    const trackedController = leftHand?.components['tracked-controls'];
    const axes = trackedController?.axis;
    if (!axes || axes.length < 2) return;

    // Quest thumbstick biasanya di axes[2]/axes[3] (axes[0]/[1] sering trackpad legacy)
    const sx = Math.abs(axes[2] || 0) > Math.abs(axes[0] || 0) ? axes[2] : axes[0];
    const sy = Math.abs(axes[3] || 0) > Math.abs(axes[1] || 0) ? axes[3] : axes[1];

    vrStickInput.w = sy < -VR_STICK_DEADZONE;
    vrStickInput.s = sy >  VR_STICK_DEADZONE;
    vrStickInput.a = sx < -VR_STICK_DEADZONE;
    vrStickInput.d = sx >  VR_STICK_DEADZONE;

    const moving = vrStickInput.w || vrStickInput.a || vrStickInput.s || vrStickInput.d;
    if (moving && !footstepTimer) {
      footstepTimer = setInterval(() => {
        if (currentState === State.PLAYING) AudioEngine.playFootstep();
      }, 480);
    } else if (!moving && footstepTimer && !['w','a','s','d'].some(k => movingKeys[k])) {
      clearInterval(footstepTimer);
      footstepTimer = null;
    }
  }
  requestAnimationFrame(pollSticks);
}

function setupInteract() {
  btnCloseDoc.addEventListener('click', closeDoc);
}

function handleInteract() {
  if (currentState === State.DOC_OPEN) { closeDoc(); return; }
  if (currentState !== State.PLAYING) return;
  if (!nearItem) return;
  const type = nearItem.dataset?.type;
  if (type === 'doc') pickupDoc(nearItem, parseInt(nearItem.dataset.index));
  if (type === 'key') {
    if (docsCollected < 3) {
      showToast(`⛔ Kunci terkunci! Kumpulkan semua dokumen dulu. (${docsCollected}/3)`, 'warn', 3500);
      return;
    }
    pickupKey(nearItem);
  }
  if (type === 'exit') {
    if (!hasKey) { showToast('⛔ Pintu terkunci! Kamu butuh kunci.', 'warn', 3000); return; }
    triggerWin();
  }
}

function isElementVisible(el) {
  if (!el) return false;
  const vis = el.getAttribute('visible');
  return vis === true || vis === 'true' || vis === null;
}

function startProximityCheck() {
  setInterval(() => {
    if (currentState !== State.PLAYING && currentState !== State.DOC_OPEN) return;
    const player = document.getElementById('player');
    if (!player) return;
    const pp = player.getAttribute('position');
    const pickups = document.querySelectorAll('.pickup');
    let found = null, nearInvisible = false;
    pickups.forEach(el => {
      if (!el.parentElement) return;
      if (!isElementVisible(el)) {
        const pos = el.getAttribute('position');
        if (pos && el.dataset.type === 'key') {
          const dx = pp.x - pos.x, dz = pp.z - pos.z;
          if (Math.sqrt(dx*dx + dz*dz) < 2.6) nearInvisible = true;
        }
        return;
      }
      const pos = el.getAttribute('position');
      if (!pos) return;
      const dx = pp.x - pos.x, dz = pp.z - pos.z;
      if (Math.sqrt(dx*dx + dz*dz) < 2.6) found = el;
    });
    const exitDoor = document.getElementById('exit-door');
    if (!found && exitDoor) {
      const visAttr = exitDoor.getAttribute('visible');
      if (visAttr === true || visAttr === 'true') {
        const dx = pp.x - (-17.5), dz = pp.z - (-35.9);
        if (Math.sqrt(dx*dx + dz*dz) < 2.5) found = { dataset: { type: 'exit' } };
      }
    }
    nearItem = found;
    if (found) {
      interactHint.classList.remove('hidden');
      hudCrosshair?.classList.add('near');
      const t = found.dataset?.type;
      interactHint.textContent = t === 'exit' ? '[ E ] Keluar dari gedung' :
                                  t === 'key'  ? '[ E ] Ambil Kunci' : '[ E ] Baca Dokumen';
      setInfoHint(null);
    } else if (nearInvisible) {
      interactHint.classList.add('hidden');
      hudCrosshair?.classList.remove('near');
      setInfoHint(`🔒 Kunci tersimpan di sini — kumpulkan semua 3 dokumen dulu. (${docsCollected}/3)`);
    } else {
      interactHint.classList.add('hidden');
      hudCrosshair?.classList.remove('near');
      setInfoHint(null);
    }
    checkJumpscares(pp);
  }, 200);
}

function pickupDoc(el, idx) {
  if (!el.parentElement) return;
  el.parentElement.removeChild(el);
  docsCollected++;
  const slot = document.getElementById('slot-' + (docsCollected - 1));
  if (slot) { slot.textContent = '📄'; slot.classList.add('filled'); }
  AudioEngine.playPickup();
  currentState = State.DOC_OPEN;
  const doc = DOCUMENTS[idx] || DOCUMENTS[0];
  docTitle.textContent = doc.title;
  docBody.textContent  = doc.body;
  docViewer.classList.remove('hidden');
  interactHint.classList.add('hidden');
  clickToLock.classList.add('hidden');
  sanity = Math.min(100, sanity + 8);
  updateSanityBar();
  if (docsCollected >= 3) {
    showToast('✅ Semua 3 dokumen terkumpul! Kunci kini muncul di ujung lorong B.', 'success', 5000);
    setTimeout(() => {
      const keyItem = document.getElementById('key-item');
      if (keyItem) {
        keyItem.setAttribute('visible', true);
        const exitLight = document.getElementById('exit-light');
        if (exitLight) exitLight.setAttribute('intensity', '1.5');
      }
    }, 1500);
  } else {
    showToast(`📄 Dokumen ${docsCollected}/3 tersimpan. Masih butuh ${3-docsCollected} lagi.`, 'info', 3500);
  }
}

function closeDoc() {
  currentState = State.PLAYING;
  docViewer.classList.add('hidden');
  if (!document.pointerLockElement) clickToLock.classList.remove('hidden');
}

function pickupKey(el) {
  if (!el.parentElement) return;
  el.parentElement.removeChild(el);
  hasKey = true;
  hudKey.classList.add('has-key');
  AudioEngine.playPickup();
  showToast('🔑 Kunci didapat! Pergi ke pintu keluar di ujung lorong B!', 'success', 4500);
  const exitDoor = document.getElementById('exit-door');
  const exitText = document.getElementById('exit-text');
  const exitLight = document.getElementById('exit-light');
  if (exitDoor)  exitDoor.setAttribute('visible', true);
  if (exitText)  exitText.setAttribute('visible', true);
  if (exitLight) exitLight.setAttribute('intensity', '3.0');
}

// ═══════════════════════════════════════════════════════════════
// JUMPSCARE SYSTEM
//
// Hasil analisis clown.glb:
//   - Kaki (min Y) = 0.006  → hampir 0, jadi model berdiri di Y=0
//   - Kepala (max Y) = 1.954 → tinggi ~2m, pas eye-level player (1.6)
//   - Center Z = +0.507, Min Z = -0.368, Max Z = +1.381
//     → model menghadap arah -Z (muka clown di Z negatif)
//     → jadi supaya muka clown MENGHADAP player, rotation Y harus = arah player + 0 (bukan +180)
//
// CATATAN PENTING: model ini punya 2 animasi skeletal di GLB
// (Clown_Springtrap--Jumpscare & ...FinalPose), TAPI saat dijalankan
// lewat A-Frame + aframe-extras animation-mixer, mesh-nya collapse jadi
// gumpalan kecil di lantai (sudah diverifikasi via screenshot headless).
// Model SEHAT dan berdiri normal di bind pose (tanpa animation-mixer).
// Jadi efek jumpscare di bawah ini SENGAJA tidak memakai skeletal
// animation sama sekali — bind pose dipakai sebagai visual clown, dan
// efek "kejut"-nya dibuat lewat animasi transform (scale jolt + jitter
// rotasi) di level entity, yang 100% aman dan tidak butuh skeleton.
// ═══════════════════════════════════════════════════════════════

function clearClownAnim(entity) {
  if (entity._clownAnimInterval) { clearInterval(entity._clownAnimInterval); entity._clownAnimInterval = null; }
  if (entity._clownJitterInterval) { clearInterval(entity._clownJitterInterval); entity._clownJitterInterval = null; }
}

// Animasi "jolt": scale membesar cepat dari hampir-0 ke target, dengan sedikit
// overshoot, lalu jitter rotasi kecil untuk kesan tersentak/bergetar.
function playClownJolt(entity, targetScale = 1.0) {
  const child = entity.querySelector('.clown-visual');
  if (!child) return;
  clearClownAnim(entity);

  const growMs = 160; // durasi membesar dari kecil ke target
  const startTime = performance.now();
  const overshoot = targetScale * 1.12;

  entity._clownAnimInterval = setInterval(() => {
    const t = performance.now() - startTime;
    if (t >= growMs) {
      child.setAttribute('scale', `${targetScale} ${targetScale} ${targetScale}`);
      clearInterval(entity._clownAnimInterval);
      entity._clownAnimInterval = null;

      // Mulai jitter rotasi halus (kesan tersentak/bergetar) sampai disembunyikan
      entity._clownJitterInterval = setInterval(() => {
        const jx = (Math.random() - 0.5) * 4;
        const jz = (Math.random() - 0.5) * 4;
        child.setAttribute('rotation', `${jx} 0 ${jz}`);
      }, 70);
      return;
    }
    // ease-out cepat dengan sedikit overshoot di pertengahan
    const p = t / growMs;
    const eased = p < 0.7 ? (p / 0.7) * overshoot : overshoot - ((p - 0.7) / 0.3) * (overshoot - targetScale);
    child.setAttribute('scale', `${eased} ${eased} ${eased}`);
  }, 16);
}

function triggerScare(phase) {
  if (currentState === State.DOC_OPEN || currentState === State.WIN || currentState === State.DEAD) return;

  const player  = document.getElementById('player');
  const pp      = player.getAttribute('position');
  const { fwdX, fwdZ, yawDeg } = getPlayerFacing(player);

  // Clown muka di -Z lokal, player lihat ke -Z lokal juga
  // Supaya muka clown MENGHADAP player: rotasi clown = rotasi player (sama arahnya, bukan kebalik)
  // karena clown dari belakang akan "menatap" player yang di belakangnya
  const clownFaceDeg = yawDeg; // clown menghadap arah yang sama dengan player = muka ke player

  let spawnDist; // jarak dari player ke posisi spawn clown
  let entityId;

  if (phase === 1) { spawnDist = 4.0; entityId = 'scare-1-entity'; }
  if (phase === 2) { spawnDist = 1.8; entityId = 'scare-2-entity'; }
  if (phase === 3) { spawnDist = 1.2; entityId = 'scare-3-entity'; }

  const entity = document.getElementById(entityId);
  if (!entity) return;

  // Posisi dunia: di depan player sejauh spawnDist
  const wx = pp.x + fwdX * spawnDist;
  const wz = pp.z + fwdZ * spawnDist;

  // Set parent: Y=0 (lantai), model berdiri sendiri setinggi 1.95m
  entity.setAttribute('position', `${wx} 0 ${wz}`);
  entity.setAttribute('rotation', `0 ${clownFaceDeg} 0`);

  // Reset child ke kecil dulu, lalu mainkan jolt membesar (tanpa skeletal animation)
  const child = entity.querySelector('.clown-visual');
  if (child) {
    child.setAttribute('scale', '0.01 0.01 0.01');
    child.setAttribute('rotation', '0 0 0');
  }
  playClownJolt(entity, 1.0);

  // Audio & visual effects
  if (phase === 1) {
    AudioEngine.playStinger1();
    flashOverlay('flash-red');
    sanity = Math.max(0, sanity - 12);
    AudioEngine.setHeartbeatBpm(70);

    // Clown berjalan mendekat ke player
    let moved = 0;
    const iv = setInterval(() => {
      moved += 0.12;
      const nx = pp.x + fwdX * (spawnDist - moved);
      const nz = pp.z + fwdZ * (spawnDist - moved);
      entity.setAttribute('position', `${nx} 0 ${nz}`);
      if (moved >= spawnDist - 0.5) { clearInterval(iv); }
    }, 60);
    setTimeout(() => { clearInterval(iv); hideClown(entityId); }, 2500);
  }

  if (phase === 2) {
    AudioEngine.playStinger2();
    flashOverlay('flash-white');
    setTimeout(() => flashOverlay('flash-red'), 200);
    sanity = Math.max(0, sanity - 22);
    AudioEngine.setHeartbeatBpm(95);
    setTimeout(() => hideClown(entityId), 1500);
  }

  if (phase === 3) {
    AudioEngine.playStinger3();
    flashOverlay('flash-white');
    setTimeout(() => flashOverlay('flash-red'), 200);
    setTimeout(() => flashOverlay('static'), 450);
    sanity = Math.max(0, sanity - 30);
    AudioEngine.setHeartbeatBpm(115);
    setTimeout(() => hideClown(entityId), 1200);
    if (sanity <= 0) setTimeout(() => triggerDead('ketakutan'), 1300);
  }

  updateSanityBar();
}

function hideClown(entityId) {
  const entity = document.getElementById(entityId);
  if (!entity) return;
  clearClownAnim(entity);
  entity.setAttribute('position', '0 -999 0');
  // Reset child supaya siap untuk trigger berikutnya
  const child = entity.querySelector('.clown-visual');
  if (child) {
    child.setAttribute('scale', '0.01 0.01 0.01');
    child.setAttribute('rotation', '0 0 0');
  }
}

function checkJumpscares(pos) {
  if (!scare1Done && pos.z < -4 && pos.x > -2) {
    scare1Done = true;
    setTimeout(() => triggerScare(1), 600 + Math.random() * 1000);
  }
  if (!scare2Done && pos.x < -1 && pos.z < -12.5 && pos.z > -17.5) {
    scare2Done = true;
    setTimeout(() => triggerScare(2), 300);
  }
  if (!scare3Done && pos.z < -25 && pos.x < -15) {
    scare3Done = true;
    setTimeout(() => triggerScare(3), 400 + Math.random() * 800);
  }
}

function flashOverlay(cls) {
  scareOverlay.className = 'scare-overlay';
  scareOverlay.classList.remove('hidden');
  void scareOverlay.offsetWidth;
  scareOverlay.classList.add(cls);
  setTimeout(() => {
    scareOverlay.classList.add('hidden');
    scareOverlay.className = 'scare-overlay hidden';
  }, 700);
}

function stopGame() {
  clearInterval(timerInterval);
  clearInterval(sanityDecayInterval);
  AudioEngine.stopHeartbeat();
}

function triggerWin() {
  if (currentState === State.WIN) return;
  currentState = State.WIN;
  stopGame();
  mainScene.classList.add('hidden');
  hud.classList.add('hidden');
  const minsLeft = Math.floor(timeLeft / 60);
  const secsLeft = timeLeft % 60;
  endTitle.textContent = 'BERHASIL KELUAR';
  endTitle.style.color = '#4aaa4a';
  endDesc.textContent = `Kamu berhasil melarikan diri dari Ward 13 dengan ${docsCollected} dokumen dan sisa ketenangan ${Math.round(sanity)}%. Waktu tersisa: ${minsLeft}:${String(secsLeft).padStart(2,'0')}.`;
  showScreen('end-screen');
}

function triggerDead(cause) {
  if (currentState === State.DEAD) return;
  currentState = State.DEAD;
  stopGame();
  scareOverlay.classList.remove('hidden');
  scareOverlay.style.background = '#000';
  scareOverlay.style.transition = 'opacity 2s';
  scareOverlay.style.opacity = '1';
  setTimeout(() => {
    mainScene.classList.add('hidden');
    hud.classList.add('hidden');
    endTitle.textContent = 'KAMU TIDAK BERHASIL KELUAR';
    endTitle.style.color = '#8b0000';
    endDesc.textContent = cause === 'kegilaan'
      ? 'Ketenangan kamu mencapai nol. Ward 13 mengklaimmu sebagai pasien terbarunya.'
      : cause === 'waktu'
      ? `Waktu habis. ${docsCollected}/3 dokumen berhasil dikumpulkan.`
      : `Ketakutan mematikanmu. ${docsCollected} dari 3 dokumen berhasil dikumpulkan.`;
    scareOverlay.style.background = '';
    scareOverlay.classList.add('hidden');
    showScreen('end-screen');
  }, 2000);
}

document.addEventListener('click', () => {
  if (currentState === State.PLAYING) AudioEngine.resume();
});