// ===== เสียงสไตล์ GAMEBOY / Pokémon (สังเคราะห์ด้วย Web Audio ไม่ต้องใช้ไฟล์เสียง) =====
// - sfx.play('ชื่อเสียง')  เล่นเอฟเฟกต์
// - sfx.bgm('title' | 'town' | null)  เปิด/ปิดเพลงพื้นหลัง
// - sound.install()  ดักเสียงปุ่ม/ลิงก์/การพิมพ์ทั้งเว็บให้อัตโนมัติ (เรียกครั้งเดียวจาก SoundControl)
// ทุกอย่างเริ่มทำงานหลังผู้ใช้คลิกครั้งแรก (ข้อจำกัดของเบราว์เซอร์) และจำค่าเปิด/ปิดไว้ใน localStorage

const KEY = 'chatai-sound'

// ---------- สถานะเปิด/ปิด ----------
let state = { sfx: true, bgm: true }
try {
  Object.assign(state, JSON.parse(localStorage.getItem(KEY) || '{}'))
} catch {
  /* อ่านไม่ได้ ใช้ค่าเริ่มต้น */
}
const listeners = new Set()

// ---------- โน้ต ----------
const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const hz = (s) => {
  const m = /^([A-G])([#b]?)(\d)$/.exec(s)
  const n = SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12
  return 440 * 2 ** ((n - 69) / 12)
}
// "E5:2 R:2" = โน้ต:ความยาว(เท่ากับโน้ตเขบ็ตเดียว) | R = เงียบ | X = เสียงฉาบ(noise)
const seq = (str) =>
  str
    .trim()
    .split(/\s+/)
    .map((t) => {
      const [n, l] = t.split(':')
      return [n === 'R' ? null : n === 'X' ? -1 : hz(n), +l]
    })

// ---------- เพลงพื้นหลัง (แต่งเองทั้งหมด วนลูป 8 ห้อง) ----------
const arp = (r, f) => `${r}:2 ${f}:2 ${r}:2 ${f}:2`
const HAT = 'R:1 X:1 '.repeat(32)

const TRACKS = {
  // หน้า title screen — เรียบ ๆ ลึกลับนิด ๆ (A minor)
  title: {
    bpm: 92,
    voices: [
      {
        wave: 'sq50',
        vol: 0.55,
        notes: seq(
          'A4:4 C5:2 E5:2  A5:4 G5:2 E5:2  F5:4 A5:2 G5:2  F5:6 E5:2  E5:2 G5:2 C6:4  B5:2 G5:2 E5:4  D5:2 G5:2 B5:2 D6:2  B5:4 G5:2 R:2'
        ),
      },
      {
        wave: 'tri',
        vol: 1,
        notes: seq(
          [arp('A2', 'E3'), arp('A2', 'E3'), arp('F2', 'C3'), arp('F2', 'C3'), arp('C3', 'G3'), arp('C3', 'G3'), arp('G2', 'D3'), arp('G2', 'D3')].join(' ')
        ),
      },
    ],
  },
  // หน้าเว็บหลัก — ร่าเริงแบบเมืองในเกม (C major)
  town: {
    bpm: 112,
    voices: [
      {
        wave: 'sq25',
        vol: 0.5,
        notes: seq(
          'E5:2 G5:2 C6:2 G5:2  A5:2 G5:2 E5:2 D5:2  F5:2 A5:2 C6:2 A5:2  G5:4 E5:2 R:2  E5:2 G5:2 C6:2 E6:2  D6:2 C6:2 A5:2 G5:2  F5:2 G5:2 A5:2 B5:2  C6:6 R:2'
        ),
      },
      {
        wave: 'tri',
        vol: 1,
        notes: seq(
          [arp('C3', 'G3'), arp('A2', 'E3'), arp('F2', 'C3'), arp('G2', 'D3'), arp('C3', 'G3'), arp('F2', 'C3'), 'F2:2 C3:2 G2:2 D3:2', arp('C3', 'G3')].join(' ')
        ),
      },
      { wave: 'noise', vol: 0.35, notes: seq(HAT) },
    ],
  },
}

// ---------- Audio engine ----------
let ctx = null
let sfxBus = null
let bgmBus = null
let noiseBuf = null
const WAVES = {}
let wanted = null // เพลงที่ "ควรเล่น" ตอนนี้ (จำไว้เผื่อผู้ใช้เปิด BGM ทีหลัง)
let wantedDelay = 0
let run = null // เพลงที่กำลังเล่นอยู่จริง

// คลื่นสี่เหลี่ยมแบบ Game Boy (duty 12.5% / 25% / 50%)
function pulse(d) {
  const N = 32
  const real = new Float32Array(N)
  const imag = new Float32Array(N)
  for (let n = 1; n < N; n++) real[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * d)
  return ctx.createPeriodicWave(real, imag)
}

function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    ctx = new AC()
    const master = ctx.createGain()
    master.gain.value = 0.7
    master.connect(ctx.destination)
    sfxBus = ctx.createGain()
    sfxBus.gain.value = 0.9
    sfxBus.connect(master)
    bgmBus = ctx.createGain()
    bgmBus.gain.value = 0.22
    bgmBus.connect(master)
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const ch = noiseBuf.getChannelData(0)
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1
    WAVES.sq50 = pulse(0.5)
    WAVES.sq25 = pulse(0.25)
    WAVES.sq125 = pulse(0.125)
    applyBgm()
  }
  if (ctx.state === 'suspended') ctx.resume()
}

function tone(t, f, dur, { w = 'sq50', v = 0.15, to, a = 0.003, bus } = {}) {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  if (w === 'tri') o.type = 'triangle'
  else if (w === 'saw') o.type = 'sawtooth'
  else o.setPeriodicWave(WAVES[w])
  o.frequency.setValueAtTime(f, t)
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(v, t + a)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g)
  g.connect(bus || sfxBus)
  o.start(t)
  o.stop(t + dur + 0.02)
}

function noise(t, dur, { v = 0.1, from = 2000, to = 2000, q = 1, type = 'bandpass', bus } = {}) {
  const s = ctx.createBufferSource()
  s.buffer = noiseBuf
  s.loop = true
  const flt = ctx.createBiquadFilter()
  flt.type = type
  flt.Q.value = q
  flt.frequency.setValueAtTime(from, t)
  flt.frequency.exponentialRampToValueAtTime(to, t + dur)
  const g = ctx.createGain()
  g.gain.setValueAtTime(v, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  s.connect(flt)
  flt.connect(g)
  g.connect(bus || sfxBus)
  s.start(t, Math.random() * 0.5)
  s.stop(t + dur + 0.02)
}

// ---------- เอฟเฟกต์เสียง ----------
const CRY = [330, 262, 392, 294, 349] // เสียงร้องของตัวละครแต่ละตัว (เหมือน cry ของโปเกมอน)
const rnd = (a) => a[Math.floor(Math.random() * a.length)]

const S = {
  // เมาส์ชี้ปุ่ม
  hover: (t) => tone(t, 1320, 0.03, { w: 'sq25', v: 0.04 }),
  // กดปุ่ม/เลือกเมนู
  select: (t) => {
    tone(t, 988, 0.04, { v: 0.12 })
    tone(t + 0.04, 1319, 0.07, { v: 0.12 })
  },
  // ยืนยัน / ไปหน้าถัดไปในกล่องข้อความ
  confirm: (t) => {
    tone(t, 1175, 0.05)
    tone(t + 0.05, 1568, 0.1)
  },
  // ยกเลิก / ปิดกล่องข้อความ
  cancel: (t) => {
    tone(t, 880, 0.05)
    tone(t + 0.05, 587, 0.1)
  },
  // พิมพ์ตัวอักษร / ลบ
  type: (t) => tone(t, 1500 + Math.random() * 400, 0.02, { w: 'sq25', v: 0.05 }),
  back: (t) => tone(t, 900, 0.025, { w: 'sq25', v: 0.05 }),
  // ข้อความในกล่องคุยแบบพิมพ์ทีละตัว
  talk: (t) => tone(t, 520 + Math.random() * 120, 0.035, { v: 0.07 }),
  // เปิดกล่องข้อความ
  dialog: (t) => {
    tone(t, 784, 0.04)
    tone(t + 0.04, 1047, 0.06)
  },
  // ส่งข้อความ (อาร์เพจจิโอขึ้น)
  send: (t) => [523, 659, 784, 1047].forEach((f, i) => tone(t + i * 0.05, f, i === 3 ? 0.14 : 0.06, { v: 0.12 })),
  // AI ตอบกลับ (เสียงได้ไอเทม)
  receive: (t) => {
    ;[587, 740, 880].forEach((f, i) => tone(t + i * 0.06, f, 0.07))
    tone(t + 0.18, 1175, 0.24, { v: 0.13 })
  },
  // AI กำลังคิด
  think: (t) => tone(t, rnd([330, 392, 440, 494]), 0.05, { w: 'tri', v: 0.1 }),
  // เกิดข้อผิดพลาด
  error: (t) => {
    tone(t, 220, 0.12, { w: 'saw', v: 0.12, to: 180 })
    tone(t + 0.14, 165, 0.24, { w: 'saw', v: 0.12, to: 120 })
  },
  // ล้างประวัติ
  delete: (t) => {
    noise(t, 0.18, { v: 0.12, from: 4000, to: 500 })
    tone(t, 700, 0.18, { to: 150, v: 0.08 })
  },
  // คัดลอกโค้ดสำเร็จ (เสียงเหรียญ)
  coin: (t) => {
    tone(t, 988, 0.07, { v: 0.12 })
    tone(t + 0.07, 1319, 0.28, { v: 0.12 })
  },
  // เลื่อนไปหัวข้ออื่นในหน้า
  page: (t) => noise(t, 0.14, { v: 0.09, from: 600, to: 3500, q: 2 }),
  // ดับเบิลคลิกเปิดเกมบน Desktop
  launch: (t) => [523, 659, 784, 1047].forEach((f, i) => tone(t + i * 0.07, f, 0.08, { w: 'sq25', v: 0.1 })),
  // แถบโหลดเดินทีละช่อง (arg = 0..1 ยิ่งโหลดมากเสียงยิ่งสูง)
  load: (t, p = 0) => tone(t, 600 + p * 900, 0.025, { w: 'sq25', v: 0.06 }),
  loaded: (t) => {
    tone(t, 1319, 0.08, { v: 0.12 })
    tone(t + 0.08, 1760, 0.25, { v: 0.12 })
  },
  // เสียงเปิดเครื่อง Game Boy "ติ๊ง" ตอนเข้า title screen
  boot: (t) => {
    tone(t, 1047, 0.09, { v: 0.14 })
    tone(t + 0.09, 2093, 0.7, { v: 0.14 })
  },
  // กด PRESS START: โปเกบอลหมุน + แถบวาบเข้าฉากต่อสู้ (จังหวะตรงกับ animation ของ .gate.leave)
  enter: (t) => {
    tone(t, 300, 0.5, { w: 'sq25', to: 1800, v: 0.1 })
    noise(t, 0.45, { v: 0.05, from: 800, to: 5000 })
    tone(t + 0.5, 2400, 0.03, { v: 0.1 })
    for (let i = 0; i < 8; i++) tone(t + 0.05 + i * 0.04, 180 + i * 90, 0.09, { v: 0.07 })
    for (let i = 0; i < 8; i++) tone(t + 0.8 + i * 0.04, 1000 - i * 100, 0.09, { v: 0.06 })
    stopRun(0.7)
  },
  // เข้าเว็บหลักสำเร็จ (แฟนแฟร์สั้น ๆ)
  welcome: (t) => {
    const n = [[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.1], [1047, 0.3, 0.28], [784, 0.62, 0.1], [1047, 0.72, 0.1], [1319, 0.82, 0.5]]
    n.forEach(([f, d, l]) => tone(t + d, f, l, { v: 0.12 }))
    tone(t, 131, 0.3, { w: 'tri', v: 0.2 })
    tone(t + 0.62, 196, 0.7, { w: 'tri', v: 0.2 })
  },
  // เสียงร้องของตัวละคร (arg = ลำดับตัวละคร)
  cry: (t, i = 0) => {
    const b = CRY[i % CRY.length]
    tone(t, b, 0.1, { w: 'sq25', to: b * 1.6, v: 0.12 })
    tone(t + 0.1, b * 1.6, 0.2, { w: 'sq25', to: b * 0.8, v: 0.1 })
  },
}

function play(name, arg) {
  if (!state.sfx || !ctx || !S[name]) return
  if (ctx.state === 'suspended') ctx.resume()
  S[name](ctx.currentTime + 0.005, arg)
}

// ---------- เพลงพื้นหลัง ----------
function playNote(v, f, t, dur, bus) {
  if (f === -1) {
    noise(t, 0.05, { v: 0.12 * v.vol, from: 7000, to: 5000, type: 'highpass', bus })
    return
  }
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  if (v.wave === 'tri') o.type = 'triangle'
  else o.setPeriodicWave(WAVES[v.wave])
  o.frequency.value = f
  const peak = 0.25 * v.vol
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(peak, t + 0.008)
  g.gain.linearRampToValueAtTime(peak * 0.7, t + dur * 0.8)
  g.gain.linearRampToValueAtTime(0.0001, t + dur * 0.97)
  o.connect(g)
  g.connect(bus)
  o.start(t)
  o.stop(t + dur)
}

function schedule() {
  if (!run || !ctx) return
  const now = ctx.currentTime
  const horizon = now + 0.35
  const step = 60 / run.track.bpm / 2
  for (const v of run.voices) {
    while (v.t < horizon) {
      const [f, len] = v.notes[v.i]
      const dur = len * step
      if (f !== null && v.t >= now - 0.05) playNote(v, f, v.t, dur, run.gain)
      v.t += dur
      v.i = (v.i + 1) % v.notes.length
    }
  }
}

function stopRun(fade = 0.4) {
  if (!run) return
  const r = run
  run = null
  clearInterval(r.timer)
  try {
    r.gain.gain.cancelScheduledValues(ctx.currentTime)
    r.gain.gain.setValueAtTime(r.gain.gain.value, ctx.currentTime)
    r.gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + fade)
  } catch {
    /* ignore */
  }
  setTimeout(() => r.gain.disconnect(), fade * 1000 + 100)
}

function startRun(name, delay) {
  const track = TRACKS[name]
  if (!track) return
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, ctx.currentTime)
  g.gain.linearRampToValueAtTime(1, ctx.currentTime + delay + 0.25)
  g.connect(bgmBus)
  const t0 = ctx.currentTime + 0.1 + delay
  run = { name, track, gain: g, voices: track.voices.map((v) => ({ ...v, i: 0, t: t0 })) }
  run.timer = setInterval(schedule, 100)
  schedule()
}

function applyBgm() {
  if (!ctx) return
  if (run && state.bgm && run.name === wanted) return // เล่นเพลงเดิมอยู่แล้ว
  stopRun(0.4)
  if (state.bgm && wanted) startRun(wanted, wantedDelay)
}

function bgm(name, delay = 0) {
  wanted = name
  wantedDelay = delay
  applyBgm()
}

// ---------- ดักเสียง UI ทั้งเว็บ (ไม่ต้องแก้ปุ่มทีละอัน) ----------
// ใส่ data-sfx="none" ที่ปุ่มใด ๆ เพื่อปิดเสียงอัตโนมัติของปุ่มนั้น (ใช้เมื่อโค้ดเล่นเสียงเองอยู่แล้ว)
// หรือใส่ data-sfx="ชื่อเสียง" เพื่อเปลี่ยนเสียงที่เล่น
function install() {
  const CLICK = 'button, a[href], [role="button"], summary'
  const HOVER = `${CLICK}, .card`
  let lastEl = null
  let lastHover = 0
  let lastType = 0

  const usable = (el) => !el.disabled && el.getAttribute('aria-disabled') !== 'true' && el.dataset.sfx !== 'none'

  const onGesture = () => unlock()
  const onClick = (e) => {
    const el = e.target.closest?.(CLICK)
    if (!el || !usable(el)) return
    play(el.dataset.sfx || (el.matches('a[href^="#"]') ? 'page' : 'select'))
  }
  const onOver = (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return
    const el = e.target.closest?.(HOVER)
    if (el === lastEl) return
    lastEl = el
    if (!el || !usable(el)) return
    const now = performance.now()
    if (now - lastHover < 60) return
    lastHover = now
    play('hover')
  }
  const onInput = (e) => {
    const el = e.target
    if (!el.matches?.('input:not([type=checkbox]):not([type=radio]):not([type=range]), textarea')) return
    const now = performance.now()
    if (now - lastType < 25) return
    lastType = now
    play(String(e.inputType || '').startsWith('delete') ? 'back' : 'type')
  }
  const onVis = () => {
    if (!ctx) return
    if (document.hidden) ctx.suspend()
    else ctx.resume()
  }

  const gestures = ['pointerdown', 'keydown', 'touchend']
  gestures.forEach((ev) => window.addEventListener(ev, onGesture, true))
  document.addEventListener('click', onClick, true)
  document.addEventListener('pointerover', onOver, true)
  document.addEventListener('input', onInput, true)
  document.addEventListener('visibilitychange', onVis)
  return () => {
    gestures.forEach((ev) => window.removeEventListener(ev, onGesture, true))
    document.removeEventListener('click', onClick, true)
    document.removeEventListener('pointerover', onOver, true)
    document.removeEventListener('input', onInput, true)
    document.removeEventListener('visibilitychange', onVis)
  }
}

// ---------- API ----------
export const sfx = { play, bgm }

export const sound = {
  getState: () => state,
  subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
  toggle(key) {
    state = { ...state, [key]: !state[key] }
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
    if (key === 'bgm') applyBgm()
    listeners.forEach((fn) => fn(state))
  },
  install,
}
