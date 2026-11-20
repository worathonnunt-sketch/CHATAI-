import { useEffect, useMemo, useRef, useState } from 'react'
import { CREW, PINE, LAMP, BALL, HOUSE } from './pixelData.js'
import { sfx } from './sound.js'

// แปลงตาราง pixel เป็น <path> (รวมพิกเซลสีเดียวกันในแถวเดียวกัน)
function toPaths(rows, pal) {
  const m = {}
  rows.forEach((row, y) => {
    for (let x = 0, n; x < row.length; x += n) {
      const ch = row[x]
      for (n = 1; row[x + n] === ch; n++);
      if (ch !== '.' && pal[ch]) m[ch] = (m[ch] || '') + `M${x} ${y}h${n}v1h-${n}z`
    }
  })
  return Object.entries(m)
}

export function Pix({ rows, pal, className }) {
  const paths = useMemo(() => toPaths(rows, pal), [rows, pal])
  return (
    <svg
      className={className}
      viewBox={`0 0 ${rows[0].length} ${rows.length}`}
      style={{ '--w': rows[0].length, '--h': rows.length }}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {paths.map(([ch, d]) => (
        <path key={ch} d={d} fill={pal[ch]} />
      ))}
    </svg>
  )
}

// ----- กล่องข้อความแบบ Pokémon: พิมพ์ทีละตัว คลิก/Enter เพื่อไปต่อ -----
function Dialog({ m, onClose }) {
  const pages = useMemo(
    () =>
      [
        `สวัสดี! ฉันคือ ${m.nickname || m.name.split(' ')[0]} ยินดีที่ได้รู้จัก`,
        m.uni && `เรียนอยู่ ${m.uni} ปี ${m.year}`,
        `ตำแหน่ง: ${m.role}`,
        `หน้าที่: ${m.task}`,
        m.bio,
        m.hobbies?.length && `งานอดิเรก: ${m.hobbies.join(', ')}`,
        m.motto && `คติประจำใจ: “${m.motto}”`,
        (m.goalShort || m.goal) && `เป้าหมาย: ${m.goalShort || m.goal}`,
        `ติดต่อฉันได้ที่ ${m.email}`,
      ].filter(Boolean),
    [m]
  )
  const [p, setP] = useState(0)
  const [n, setN] = useState(0)
  const text = pages[p]
  const done = n >= text.length

  useEffect(() => {
    setN(0)
    const t = setInterval(() => setN((v) => v + 1), 30)
    return () => clearInterval(t)
  }, [text])

  // เสียงกล่องข้อความ: เปิดกล่อง + บี๊บทุก 2 ตัวอักษรที่พิมพ์
  useEffect(() => sfx.play('dialog'), [])
  useEffect(() => {
    if (n > 0 && n <= text.length && n % 2 === 1 && text[n - 1].trim()) sfx.play('talk')
  }, [n, text])

  const next = () => {
    if (!done) setN(text.length)
    else if (p < pages.length - 1) {
      sfx.play('confirm')
      setP(p + 1)
    } else {
      sfx.play('cancel')
      onClose()
    }
  }

  useEffect(() => {
    const key = (e) => {
      if (e.key === 'Escape') {
        sfx.play('cancel')
        onClose()
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })

  return (
    <div className="px-dialog" role="dialog" aria-live="polite" onClick={next}>
      <b className="px-who">{m.role}</b>
      <p>{text.slice(0, n)}</p>
      {done && <i className="px-more">▼</i>}
    </div>
  )
}

const DECO = [
  { rows: PINE.rows, pal: PINE.pal, left: '3%', bottom: 118, s: 1, z: 40 },
  { rows: HOUSE.rows, pal: HOUSE.pal, left: '12%', bottom: 112, s: 1, z: 38, label: 'DEV CENTER' },
  { rows: LAMP.rows, pal: LAMP.pal, left: '33%', bottom: 112, s: 1, z: 39, glow: true },
  { rows: PINE.rows, pal: PINE.pal, left: '55%', bottom: 122, s: 0.9, z: 37 },
  { rows: LAMP.rows, pal: LAMP.pal, left: '72%', bottom: 112, s: 1, z: 39, glow: true },
  { rows: PINE.rows, pal: PINE.pal, left: '90%', bottom: 116, s: 1.15, z: 40 },
  { rows: BALL.rows, pal: BALL.pal, left: '46%', bottom: 26, s: 1, z: 150 },
  { rows: BALL.rows, pal: BALL.pal, left: '82%', bottom: 44, s: 0.9, z: 120 },
]

const sayOf = (i, b) => (i === 0 ? b?.user : i === 1 ? (b?.busy ? '• • •' : b?.ai) : null)

export default function PixelCrew({ members, bubbles }) {
  const scene = useRef(null)
  const nodes = useRef([])
  const [talk, setTalk] = useState(null)
  const talkRef = useRef(null)
  talkRef.current = talk
  const chatRef = useRef(null)
  chatRef.current = bubbles

  // ให้ตัวละครเดินสุ่มในฉาก (ทั้งซ้าย-ขวา และใกล้-ไกล)
  useEffect(() => {
    const el = scene.current
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    let W = el.clientWidth
    let raf = 0
    let last = performance.now()
    const pick = (s) => {
      s.tx = 30 + Math.random() * Math.max(60, W - 130)
      s.tz = Math.random()
    }
    const st = CREW.map((_, i) => {
      const s = { x: W * (0.22 + 0.27 * i), z: 0.25 + Math.random() * 0.5, wait: 0.4 + i * 0.8, face: 'r', mv: '' }
      pick(s)
      return s
    })

    const paint = () =>
      st.forEach((s, i) => {
        const n = nodes.current[i]
        if (!n) return
        n.style.transform = `translate3d(${s.x}px,0,0) scale(${1 - s.z * 0.22})`
        n.style.bottom = `${18 + s.z * 92}px`
        n.style.zIndex = Math.round(100 - s.z * 100) + (i < 2 && chatRef.current?.user ? 200 : 0)
      })

    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      st.forEach((s, i) => {
        const n = nodes.current[i]
        if (!n) return
        let mv = 'idle'
        if (talkRef.current === i || (i < 2 && (chatRef.current?.user || chatRef.current?.busy))) {
          /* กำลังคุยอยู่: ยืนนิ่ง */
        } else if (s.wait > 0) s.wait -= dt
        else {
          const dx = s.tx - s.x
          const dz = s.tz - s.z
          if (Math.abs(dx) < 3 && Math.abs(dz) < 0.02) {
            s.wait = 1.5 + Math.random() * 3
            pick(s)
          } else {
            mv = 'walk'
            const sp = 58 * dt
            s.x += Math.sign(dx) * Math.min(Math.abs(dx), sp)
            s.z += Math.sign(dz) * Math.min(Math.abs(dz), sp / 240)
            if (Math.abs(dx) > 3) s.face = dx > 0 ? 'r' : 'l'
          }
        }
        if (mv !== s.mv) n.dataset.mv = s.mv = mv
        if (n.dataset.face !== s.face) n.dataset.face = s.face
      })
      paint()
      raf = requestAnimationFrame(tick)
    }

    paint()
    const io = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(raf)
      if (e.isIntersecting && !reduce) {
        last = performance.now()
        raf = requestAnimationFrame(tick)
      }
    })
    io.observe(el)
    const ro = new ResizeObserver(() => {
      W = el.clientWidth
      st.forEach((s) => (s.x = Math.min(s.x, Math.max(0, W - 90))))
      paint()
    })
    ro.observe(el)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
    }
  }, [])

  return (
    <section className="px-scene" ref={scene} aria-label="ตัวละครพิกเซลของสมาชิกทีม">
      <div className="px-world" aria-hidden="true">
        <div className="px-ground" />
      </div>

      {DECO.map((d, i) => (
        <div
          key={i}
          className={`px-deco ${d.glow ? 'glow' : ''}`}
          style={{ left: d.left, bottom: d.bottom, zIndex: d.z, scale: d.s }}
          aria-hidden="true"
        >
          <Pix rows={d.rows} pal={d.pal} />
          {d.label && <span className="px-sign">{d.label}</span>}
        </div>
      ))}

      {CREW.map((c, i) => (
        <button
          type="button"
          key={i}
          className="px-char"
          data-sfx="none"
          data-mv="idle"
          data-face="r"
          ref={(n) => (nodes.current[i] = n)}
          onClick={() => {
            sfx.play('cry', i)
            if (i > 1) setTalk(i)
          }}
          aria-label={i === 0 ? 'ตัวละคร YOU' : i === 1 ? 'ตัวละคร AI' : `คุยกับ ${members[i].name}`}
        >
          <span className="px-emote">
            <Pix rows={c.icon} pal={c.iconPal} />
          </span>
          <span className={`px-tag ${i < 2 ? 'always' : ''}`}>{i === 0 ? 'YOU' : i === 1 ? 'AI' : members[i].role}</span>
          {sayOf(i, bubbles) && <span className={`px-say ${i === 0 ? 'u' : 'a'}`} key={sayOf(i, bubbles)}>{sayOf(i, bubbles)}</span>}
          <span className="px-shadow" />
          <span className="px-spr">
            <Pix className="f-i" rows={c.frames.i} pal={c.pal} />
            <Pix className="f-a" rows={c.frames.a} pal={c.pal} />
            <Pix className="f-b" rows={c.frames.b} pal={c.pal} />
          </span>
        </button>
      ))}

      {talk === null && <p className="px-hint">▶ พิมพ์ข้อความด้านล่าง แล้วดู YOU กับ AI คุยกัน</p>}
      {talk !== null && <Dialog key={talk} m={members[talk]} onClose={() => setTalk(null)} />}
    </section>
  )
}
