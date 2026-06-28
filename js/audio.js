/**
 * WARD 13 — Audio Engine
 * Pure Web Audio API — no external files needed.
 * Generates: ambient drone, heartbeat, jumpscare stingers, footsteps.
 */

window.AudioEngine = (() => {
  let ctx = null;
  let masterGain = null;
  let ambienceNode = null;
  let heartbeatInterval = null;

  function init() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(1, ctx.currentTime);
    masterGain.connect(ctx.destination);
    startAmbience();
  }

  // ── Utility: noise buffer ────────────────────────────────
  function makeNoise(duration = 2) {
    const bufSize = ctx.sampleRate * duration;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ── Ambient drone (looping low hum + noise) ──────────────
  function startAmbience() {
    if (ambienceNode) return;

    // Low sub-bass drone
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(40, ctx.currentTime);
    osc1.frequency.linearRampToValueAtTime(38, ctx.currentTime + 8);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(60, ctx.currentTime);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.05, ctx.currentTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(8, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);

    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.07, ctx.currentTime);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, ctx.currentTime);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(droneGain);
    droneGain.connect(masterGain);

    // Noise layer (distant wind / hvac)
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = makeNoise(4);
    noiseSrc.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(400, ctx.currentTime);
    noiseFilter.Q.setValueAtTime(0.5, ctx.currentTime);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.03, ctx.currentTime);

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);

    osc1.start(); osc2.start(); lfo.start(); noiseSrc.start();
    ambienceNode = { osc1, osc2, lfo, noiseSrc };
  }

  // ── Footstep (concrete floor) ────────────────────────────
  function playFootstep() {
    if (!ctx) return;
    const noise = ctx.createBufferSource();
    noise.buffer = makeNoise(0.15);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300 + Math.random() * 200, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    noise.start();
    noise.stop(ctx.currentTime + 0.15);
  }

  // ── Heartbeat ────────────────────────────────────────────
  function startHeartbeat(bpm = 60) {
    stopHeartbeat();
    const interval = (60 / bpm) * 1000;
    heartbeatInterval = setInterval(() => {
      _playHeartbeat();
    }, interval);
  }

  function _playHeartbeat() {
    if (!ctx) return;
    // Lub
    _thump(80, 0.6, 0);
    // Dub
    _thump(60, 0.4, 0.15);
  }

  function _thump(freq, vol, delay) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + delay + 0.1);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.12);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + 0.15);
  }

  function stopHeartbeat() {
    if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
  }

  function setHeartbeatBpm(bpm) {
    stopHeartbeat();
    startHeartbeat(bpm);
  }

  // ── Jumpscare stingers ───────────────────────────────────

  // Scare 1: distant screech + bass hit
  function playStinger1() {
    if (!ctx) return;
    // Bass hit
    const bassOsc = ctx.createOscillator();
    bassOsc.type = 'sawtooth';
    bassOsc.frequency.setValueAtTime(60, ctx.currentTime);
    bassOsc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.5);
    const bassGain = ctx.createGain();
    bassGain.gain.setValueAtTime(0.9, ctx.currentTime);
    bassGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    bassOsc.connect(bassGain); bassGain.connect(masterGain);
    bassOsc.start(); bassOsc.stop(ctx.currentTime + 0.5);

    // Screech
    const screech = ctx.createOscillator();
    screech.type = 'sawtooth';
    screech.frequency.setValueAtTime(800, ctx.currentTime);
    screech.frequency.linearRampToValueAtTime(1800, ctx.currentTime + 0.3);
    screech.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.8);
    const screechGain = ctx.createGain();
    screechGain.gain.setValueAtTime(0, ctx.currentTime);
    screechGain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
    screechGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    const distortion = ctx.createWaveShaper();
    distortion.curve = _makeDistortionCurve(300);
    screech.connect(distortion); distortion.connect(screechGain); screechGain.connect(masterGain);
    screech.start(); screech.stop(ctx.currentTime + 0.8);
  }

  // Scare 2: industrial metallic bang
  function playStinger2() {
    if (!ctx) return;
    // White noise burst
    const noise = ctx.createBufferSource();
    noise.buffer = makeNoise(0.6);
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(2000, ctx.currentTime);
    noiseFilter.Q.setValueAtTime(0.3, ctx.currentTime);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(1.2, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(masterGain);
    noise.start(); noise.stop(ctx.currentTime + 0.6);

    // Sub bass
    const sub = ctx.createOscillator();
    sub.frequency.setValueAtTime(50, ctx.currentTime);
    sub.frequency.exponentialRampToValueAtTime(15, ctx.currentTime + 0.4);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(1.0, ctx.currentTime);
    subGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    sub.connect(subGain); subGain.connect(masterGain);
    sub.start(); sub.stop(ctx.currentTime + 0.4);
  }

  // Scare 3: full horror stab (loudest)
  function playStinger3() {
    if (!ctx) return;
    // Big bass slam
    const slam = ctx.createOscillator();
    slam.type = 'sawtooth';
    slam.frequency.setValueAtTime(80, ctx.currentTime);
    slam.frequency.exponentialRampToValueAtTime(15, ctx.currentTime + 1.0);
    const slamGain = ctx.createGain();
    slamGain.gain.setValueAtTime(1.2, ctx.currentTime);
    slamGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
    const dist = ctx.createWaveShaper();
    dist.curve = _makeDistortionCurve(500);
    slam.connect(dist); dist.connect(slamGain); slamGain.connect(masterGain);
    slam.start(); slam.stop(ctx.currentTime + 1.0);

    // High pitched shriek
    for (let i = 0; i < 3; i++) {
      const shriek = ctx.createOscillator();
      shriek.type = 'square';
      shriek.frequency.setValueAtTime(1200 + i * 300, ctx.currentTime + i * 0.08);
      shriek.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.6);
      const sg = ctx.createGain();
      sg.gain.setValueAtTime(0.4, ctx.currentTime + i * 0.08);
      sg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      shriek.connect(sg); sg.connect(masterGain);
      shriek.start(ctx.currentTime + i * 0.08);
      shriek.stop(ctx.currentTime + 0.6);
    }

    // Noise burst
    const burst = ctx.createBufferSource();
    burst.buffer = makeNoise(0.5);
    const bGain = ctx.createGain();
    bGain.gain.setValueAtTime(0.8, ctx.currentTime);
    bGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    burst.connect(bGain); bGain.connect(masterGain);
    burst.start(); burst.stop(ctx.currentTime + 0.5);
  }

  // ── Item pickup chime ────────────────────────────────────
  function playPickup() {
    if (!ctx) return;
    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.4);
      osc.connect(g); g.connect(masterGain);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + 0.4);
    });
  }

  // ── Distortion curve ─────────────────────────────────────
  function _makeDistortionCurve(amount) {
    const samples = 256;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  return {
    init, resume, playFootstep,
    startHeartbeat, stopHeartbeat, setHeartbeatBpm,
    playStinger1, playStinger2, playStinger3,
    playPickup
  };
})();
