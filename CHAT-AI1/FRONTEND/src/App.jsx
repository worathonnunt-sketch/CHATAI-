import { useCallback, useEffect, useRef, useState } from 'react'
import { useChat, ChatInput, ChatHistory } from './ChatBox.jsx'
import './App.css'
import './pokemon.css'
import PixelCrew, { Pix } from './PixelCrew.jsx'
import SoundControl from './SoundControl.jsx'
import { sfx } from './sound.js'
import { BALL, CREW, PINE, LAMP, HOUSE } from './pixelData.js'
import { TEAM, MEMBERS } from './teamData.js'

const STRENGTH_ICONS = ['💡', '🤝', '🚀', '📈']
const WORDS = ['Learn', 'Build', 'Improve']

const SKILLS = ['PostgreSQL', 'REST API', 'React', 'Tailwind CSS', 'Node.js', 'Prompt Engineering', 'Git']
const LANGS = ['Python', 'SQL', 'HTML', 'CSS', 'JavaScript']

// desc = คำอธิบายทั่วไป, here = ใช้ในโปรเจกต์นี้อย่างไร (ใส่เฉพาะที่ใช้จริง)
const SKILL_INFO = {
  PostgreSQL: {
    desc: 'ระบบฐานข้อมูลแบบโอเพนซอร์สที่เก็บข้อมูลเป็นตารางและมีความสัมพันธ์ระหว่างกัน ค้นหาและจัดการด้วยภาษา SQL เหมาะกับข้อมูลที่ต้องแม่นยำ เช่น ข้อมูลผู้ใช้ ประวัติแชต หรือคำสั่งซื้อ',
  },
  'REST API': {
    desc: 'แนวทางออกแบบช่องทางให้หน้าเว็บคุยกับเซิร์ฟเวอร์ผ่าน HTTP โดยใช้คำสั่งอย่าง GET, POST, PUT, DELETE แต่ละ URL แทนข้อมูลหนึ่งอย่าง และส่งข้อมูลกลับเป็น JSON',
    here: 'หน้าเว็บส่งข้อความไปที่ POST /api/chat แล้วได้คำตอบของ AI กลับมาเป็น JSON',
  },
  React: {
    desc: 'ไลบรารี JavaScript สำหรับสร้างหน้าเว็บจากคอมโพเนนต์ย่อย ๆ ที่นำกลับมาใช้ซ้ำได้ และอัปเดตหน้าจออัตโนมัติเมื่อข้อมูลเปลี่ยน',
    here: 'หน้าพอร์ตโฟลิโอและกล่องแชตทั้งหมดสร้างด้วย React',
  },
  'Tailwind CSS': {
    desc: 'เฟรมเวิร์ก CSS ที่จัดสไตล์ด้วย class สั้น ๆ เขียนไว้ในโค้ด HTML ได้เลย เช่น flex หรือ p-4 ทำให้ออกแบบหน้าเว็บได้เร็วโดยไม่ต้องเขียนไฟล์ CSS ยาว ๆ',
  },
  'Node.js': {
    desc: 'สภาพแวดล้อมที่รัน JavaScript นอกเบราว์เซอร์ ใช้สร้างเซิร์ฟเวอร์ฝั่งหลังบ้านที่รับคำขอจากหน้าเว็บ ติดต่อฐานข้อมูล และเรียกบริการอื่น เช่น AI',
    here: 'backend ของแชตรันด้วย Node.js และ Express',
  },
  'Prompt Engineering': {
    desc: 'ศิลปะการเขียนคำสั่งให้ AI ตอบได้ตรงตามต้องการ เช่น กำหนดบทบาท รูปแบบคำตอบ และกฎที่ต้องทำตาม',
    here: 'บอทมี system prompt กำหนดให้เป็นผู้ช่วยของทีม และตอบจากข้อมูลทีมเท่านั้น',
  },
  Git: {
    desc: 'ระบบควบคุมเวอร์ชันที่บันทึกประวัติการแก้โค้ดทุกครั้ง ย้อนกลับได้เมื่อพลาด และช่วยให้หลายคนทำงานในโปรเจกต์เดียวกันโดยไม่เขียนทับกัน',
  },
}

const LANG_INFO = {
  Python: {
    desc: 'ภาษาโปรแกรมที่อ่านง่าย ใช้ได้หลากหลาย ทั้งเว็บหลังบ้าน การวิเคราะห์ข้อมูล และงาน AI',
  },
  SQL: {
    desc: 'ภาษามาตรฐานสำหรับสั่งงานฐานข้อมูล เช่น SELECT ดึงข้อมูล INSERT เพิ่มข้อมูล UPDATE แก้ไข และ DELETE ลบข้อมูล',
  },
  HTML: {
    desc: 'ภาษากำหนดโครงสร้างของหน้าเว็บ เช่น หัวข้อ ย่อหน้า ลิงก์ และรูปภาพ',
  },
  CSS: {
    desc: 'ภาษากำหนดหน้าตาของเว็บ ทั้งสี ขนาด การจัดวาง และแอนิเมชัน',
    here: 'ลูกเล่นของหน้านี้ เช่น ตึกเงา การ์ดเอียง และกล่องแชต เขียนด้วย CSS',
  },
  JavaScript: {
    desc: 'ภาษาที่ทำให้หน้าเว็บโต้ตอบกับผู้ใช้ได้ และรันฝั่งเซิร์ฟเวอร์ได้ด้วย Node.js',
    here: 'โค้ดทั้ง frontend และ backend ของโปรเจกต์นี้เขียนด้วย JavaScript',
  },
}

// ----- ตัวอักษรพิมพ์แล้วลบ วนคำใน words -----
function Typewriter({ words }) {
  const [i, setI] = useState(0)
  const [text, setText] = useState('')
  const [del, setDel] = useState(false)

  useEffect(() => {
    const word = words[i]
    let delay = del ? 60 : 110
    if (!del && text === word) delay = 1200
    if (del && text === '') delay = 300

    const t = setTimeout(() => {
      if (!del && text === word) setDel(true)
      else if (del && text === '') {
        setDel(false)
        setI((i + 1) % words.length)
      } else setText(del ? text.slice(0, -1) : word.slice(0, text.length + 1))
    }, delay)
    return () => clearTimeout(t)
  }, [text, del, i, words])

  return (
    <span className="type">
      {text}
      <span className="caret" />
    </span>
  )
}

// ----- กลุ่มปุ่มทักษะ -----
function SkillGroup({ title, items, group, sel, onSelect }) {
  return (
    <div className="skill-group">
      <p className="skill-label">{title}</p>
      <div className="skill-btns">
        {items.map((name) => {
          const active = sel.group === group && sel.name === name
          return (
            <button
              type="button"
              key={name}
              className={`skill-btn ${active ? 'active' : ''}`}
              aria-pressed={active}
              onClick={() => onSelect({ group, name })}
            >
              {name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ----- ปุ่มกดทักษะ + กล่องอธิบาย -----
function SkillExplorer() {
  const [sel, setSel] = useState({ group: 'skill', name: 'React' })
  const info = (sel.group === 'skill' ? SKILL_INFO : LANG_INFO)[sel.name]

  return (
    <div>
      <SkillGroup title="ทักษะ" items={SKILLS} group="skill" sel={sel} onSelect={setSel} />
      <SkillGroup title="ภาษาโปรแกรม" items={LANGS} group="lang" sel={sel} onSelect={setSel} />

      <div className="skill-panel" key={sel.group + sel.name}>
        <span className="skill-cat">{sel.group === 'skill' ? 'ทักษะ' : 'ภาษาโปรแกรม'}</span>
        <h3>{sel.name}</h3>
        <p>{info.desc}</p>
        {info.here && (
          <p className="skill-here">
            <b>ในโปรเจกต์นี้:</b> {info.here}
          </p>
        )}
      </div>
    </div>
  )
}

const short = (t = '', n) => {
  const s = t.replace(/[*_`#>]/g, '').replace(/\s+/g, ' ').trim()
  return s.length > n ? s.slice(0, n) + '…' : s
}

// ----- หน้า title screen แบบเกม Pokémon: คลิกแล้วโปเกบอลหมุน แถบวาบแบบเข้าฉากต่อสู้ แล้วเข้าเว็บ -----
const GATE_DECO = [
  { o: PINE, left: '3%', bottom: 118, z: 40 },
  { o: HOUSE, left: '12%', bottom: 112, z: 38, label: 'DEV CENTER' },
  { o: LAMP, left: '30%', bottom: 112, z: 39, glow: true },
  { o: LAMP, left: '72%', bottom: 112, z: 39, glow: true },
  { o: PINE, left: '90%', bottom: 116, z: 40 },
]
// ตัวละครเดินข้ามฉากวนไปเรื่อย ๆ (dir: r = ไปขวา, l = ไปซ้าย)
const WALKERS = [
  { c: 0, dir: 'r', bottom: 36, dur: 16, delay: -2, s: 1 },
  { c: 1, dir: 'l', bottom: 70, dur: 22, delay: -9, s: 0.9 },
  { c: 2, dir: 'r', bottom: 100, dur: 28, delay: -15, s: 0.8 },
]
const CLOUDS = [
  { top: '8%', u: 10, dur: 90, delay: -30 },
  { top: '20%', u: 7, dur: 120, delay: -70 },
  { top: '31%', u: 12, dur: 75, delay: -10 },
  { top: '14%', u: 6, dur: 150, delay: -110 },
]
const CLOUD_PIX = ['..###...', '.#####..', '########']
const cloudShadow = (u) =>
  CLOUD_PIX.flatMap((r, y) => [...r].map((ch, x) => (ch === '#' ? `${x * u}px ${y * u}px #fff` : null))).filter(Boolean).join(',')
const SPARKS = [['16%', '22%', 0], ['82%', '18%', 0.6], ['26%', '46%', 1.2], ['74%', '50%', 0.3], ['50%', '9%', 0.9], ['92%', '42%', 1.5]]
const FLIES = Array.from({ length: 18 }, (_, i) => ({ left: `${(i * 53 + 7) % 100}%`, delay: `${(i * 0.7) % 6}s`, dur: `${5 + (i % 5)}s` }))
const letters = (s) =>
  typeof Intl !== 'undefined' && Intl.Segmenter
    ? Array.from(new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(s), (x) => x.segment)
    : Array.from(s)

function Intro({ onDone }) {
  const go = useRef(false)
  const [leave, setLeave] = useState(false)

  useEffect(() => {
    document.documentElement.classList.add('locked')
    return () => document.documentElement.classList.remove('locked')
  }, [])

  function enter() {
    if (go.current) return
    go.current = true
    sfx.play('enter')
    setLeave(true)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setTimeout(onDone, reduce ? 400 : 1800)
  }

  useEffect(() => {
    const key = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        enter()
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })

  return (
    <>
      <div className={`gate ${leave ? 'leave' : ''}`} onClick={enter} role="button" data-sfx="none" tabIndex={0} aria-label={`เข้าสู่เว็บไซต์ ${TEAM.name}`}>
        <div className="gate-sun" aria-hidden="true" />
        {CLOUDS.map((c, i) => (
          <i
            key={i}
            className="gate-cloud"
            aria-hidden="true"
            style={{ top: c.top, width: c.u, height: c.u, boxShadow: cloudShadow(c.u), animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}
          />
        ))}
        {[0, 1, 2].map((i) => (
          <i key={i} className="gate-meteor" aria-hidden="true" style={{ top: `${6 + i * 11}%`, left: `${58 + i * 12}%`, animationDelay: `${i * 3 + 1}s` }} />
        ))}
        {SPARKS.map(([l, t, d], i) => (
          <i key={i} className="gate-spark" aria-hidden="true" style={{ left: l, top: t, animationDelay: `${d}s` }} />
        ))}

        <div className="gate-box">
          <div className="gate-ball" aria-hidden="true">
            <Pix rows={BALL.rows} pal={BALL.pal} />
          </div>
          <h1 aria-label={TEAM.name}>
            {letters(TEAM.name).map((ch, i) => (
              <span key={i} aria-hidden="true" style={{ animationDelay: `${0.3 + i * 0.07}s, ${1.4 + i * 0.12}s` }}>{ch}</span>
            ))}
          </h1>
          <p className="gate-sub">Learn · Build · Improve</p>
          <p className="gate-start">PRESS START</p>
          <p className="gate-th">คลิกที่หน้าจอเพื่อเริ่ม</p>
        </div>

        <div className="px-scene gate-scene" aria-hidden="true">
          <div className="px-world"><div className="px-ground" /></div>
          {GATE_DECO.map((d, i) => (
            <div key={i} className={`px-deco ${d.glow ? 'glow' : ''}`} style={{ left: d.left, bottom: d.bottom, zIndex: d.z }}>
              <Pix rows={d.o.rows} pal={d.o.pal} />
              {d.label && <span className="px-sign">{d.label}</span>}
            </div>
          ))}
          {WALKERS.map((w, i) => (
            <div
              key={i}
              className={`px-char gate-walker ${w.dir}`}
              data-mv="walk"
              data-face={w.dir}
              style={{ bottom: w.bottom, scale: w.s, zIndex: 100 - w.bottom, animationDuration: `${w.dur}s`, animationDelay: `${w.delay}s` }}
            >
              <span className="px-shadow" />
              <span className="px-spr">
                <Pix className="f-i" rows={CREW[w.c].frames.i} pal={CREW[w.c].pal} />
                <Pix className="f-a" rows={CREW[w.c].frames.a} pal={CREW[w.c].pal} />
                <Pix className="f-b" rows={CREW[w.c].frames.b} pal={CREW[w.c].pal} />
              </span>
            </div>
          ))}
        </div>

        <div className="gate-roll" aria-hidden="true">
          <Pix rows={BALL.rows} pal={BALL.pal} />
        </div>
        {FLIES.map((f, i) => (
          <i key={i} className="gate-fly" aria-hidden="true" style={{ left: f.left, animationDelay: f.delay, animationDuration: f.dur }} />
        ))}
      </div>
      {leave && (
        <div className="gate-bars" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => (
            <i key={i} style={{ animationDelay: `${i * 40}ms` }} />
          ))}
        </div>
      )}
    </>
  )
}

// ----- หน้า Desktop แบบ Windows: ดับเบิลคลิกไอคอน CHATAI → หน้าต่างโหลด → title screen → เข้าเว็บ -----
const DESK_ICONS = [
  { id: 'chatai', label: 'CHATAI', game: true },
  { id: 'pc', label: 'This PC', emoji: '🖥️' },
  { id: 'docs', label: 'Documents', emoji: '📁' },
  { id: 'net', label: 'Network', emoji: '🌐' },
  { id: 'bin', label: 'Recycle Bin', emoji: '🗑️' },
]
const LOAD_STEPS = [
  [0, 'กำลังเริ่มต้น CHATAI.exe...'],
  [25, 'กำลังโหลดสไปรต์และแผนที่...'],
  [55, 'กำลังเตรียมโปเกบอล...'],
  [80, 'กำลังเชื่อมต่อ AI...'],
  [100, 'พร้อมลุยแล้ว!'],
]
const BLOCKS = 20

function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="dt-clock" aria-hidden="true">
      <div>{now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>
      <div>{now.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
    </div>
  )
}

function Desktop({ onDone }) {
  const [sel, setSel] = useState(null)
  const [phase, setPhase] = useState('idle') // idle → loading → closing
  const [pct, setPct] = useState(0)
  const lastTap = useRef(0)

  useEffect(() => {
    document.documentElement.classList.add('locked')
    return () => document.documentElement.classList.remove('locked')
  }, [])

  const launch = useCallback(() => {
    setSel('chatai')
    setPhase((p) => (p === 'idle' ? 'loading' : p))
  }, [])

  // คลิกไอคอน: เลือกไอคอน, ถ้าเป็น CHATAI และคลิกซ้ำภายใน 0.6 วินาที (ดับเบิลคลิก/แตะสองครั้ง) → เปิดเกม
  function pick(icon) {
    setSel(icon.id)
    sfx.play('select')
    if (!icon.game) return
    const now = Date.now()
    if (now - lastTap.current < 600) launch()
    lastTap.current = now
  }

  useEffect(() => {
    if (phase !== 'loading') return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let p = 0
    let prevFilled = 0
    let done
    sfx.play('launch')
    const t = setInterval(() => {
      p = Math.min(100, p + (reduce ? 20 : p < 70 ? 3 + Math.random() * 5 : 1 + Math.random() * 3))
      setPct(p)
      const f = Math.floor(p / (100 / BLOCKS))
      if (f > prevFilled) {
        prevFilled = f
        sfx.play('load', f / BLOCKS)
      }
      if (p >= 100) {
        sfx.play('loaded')
        clearInterval(t)
        done = setTimeout(() => setPhase('closing'), 400)
      }
    }, 110)
    return () => {
      clearInterval(t)
      clearTimeout(done)
    }
  }, [phase])

  useEffect(() => {
    if (phase !== 'closing') return
    const t = setTimeout(onDone, 450)
    return () => clearTimeout(t)
  }, [phase, onDone])

  const status = [...LOAD_STEPS].reverse().find(([at]) => pct >= at)[1]
  const filled = Math.floor(pct / (100 / BLOCKS))

  return (
    <div className={`dt ${phase === 'loading' ? 'busy' : ''} ${phase === 'closing' ? 'closing' : ''}`} onClick={() => setSel(null)}>
      <div className="dt-icons">
        {DESK_ICONS.map((ic) => (
          <button
            type="button"
            key={ic.id}
            data-sfx="none"
            className={`dt-icon ${sel === ic.id ? 'sel' : ''}`}
            autoFocus={ic.game}
            aria-label={ic.game ? 'CHATAI — ดับเบิลคลิกหรือกด Enter เพื่อเปิดเกม' : ic.label}
            onClick={(e) => {
              e.stopPropagation()
              pick(ic)
            }}
            onKeyDown={(e) => {
              if (ic.game && e.key === 'Enter') {
                e.preventDefault()
                launch()
              }
            }}
          >
            <span className={`dt-glyph ${ic.game ? 'sc' : ''}`}>
              {ic.game ? <Pix rows={BALL.rows} pal={BALL.pal} /> : ic.emoji}
            </span>
            <span className="dt-label">{ic.label}</span>
          </button>
        ))}
        {phase === 'idle' && <p className="dt-hint">ดับเบิลคลิกที่ไอคอน CHATAI เพื่อเปิดเกม</p>}
      </div>

      {phase !== 'idle' && (
        <div className="dt-win" role="dialog" aria-label="กำลังเปิด CHATAI" aria-busy={phase === 'loading'}>
          <div className="dt-title">
            <span className="dt-mini" aria-hidden="true"><Pix rows={BALL.rows} pal={BALL.pal} /></span>
            <span>CHATAI</span>
            <span className="ctl" aria-hidden="true"><b>–</b><b>□</b><b>✕</b></span>
          </div>
          <div className="dt-body">
            <div className="dt-load-ball" aria-hidden="true"><Pix rows={BALL.rows} pal={BALL.pal} /></div>
            <div className="dt-name">CHATAI</div>
            <div className="dt-prog" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
              {Array.from({ length: BLOCKS }, (_, i) => (
                <i key={i} className={i < filled ? '' : 'off'} />
              ))}
            </div>
            <div className="dt-stat"><span>{status}</span><span>{Math.round(pct)}%</span></div>
          </div>
        </div>
      )}

      <div className="dt-bar" onClick={(e) => e.stopPropagation()}>
        <div className="dt-start">
          <span className="dt-logo" aria-hidden="true"><i /><i /><i /><i /></span>
          Start
        </div>
        {phase !== 'idle' && (
          <div className="dt-task">
            <span className="dt-mini" aria-hidden="true"><Pix rows={BALL.rows} pal={BALL.pal} /></span>
            CHATAI
          </div>
        )}
        <Clock />
      </div>
    </div>
  )
}

export default function App() {
  const [stage, setStage] = useState('desktop') // desktop → gate (title screen) → game
  const toGate = useCallback(() => setStage('gate'), [])
  const toGame = useCallback(() => setStage('game'), [])
  const chat = useChat()
  const last = chat.messages[chat.messages.length - 1]
  const lastUser = [...chat.messages].reverse().find((m) => m.role === 'user')
  const bubbles = {
    user: short(lastUser?.text, 70),
    ai: last?.role === 'assistant' ? short(last.text, 120) : '',
    busy: chat.loading,
  }

  return (
    <div className="app">
      <SoundControl stage={stage} />
      {stage === 'desktop' && <Desktop onDone={toGate} />}
      {stage === 'gate' && <Intro onDone={toGame} />}
      <nav className="nav">
        <a className="logo" href="#top">&lt;ยะฮู้วว/&gt;</a>
        <div className="nav-links">
          <a href="#team">สมาชิก</a>
          <a href="#skills">ทักษะ</a>
        </div>
      </nav>

      <header className="hero" id="top">
        <div className="hero-main">
          <div className="hero-copy">
            <h1>{TEAM.name}</h1>
            <p className="motto">▶ <Typewriter words={WORDS} /></p>
            <p className="intro">{TEAM.intro}</p>
          </div>
          <PixelCrew members={MEMBERS} bubbles={bubbles} />
          <ChatInput chat={chat} />
        </div>
        <ChatHistory chat={chat} />
      </header>

      <main className="page">
        <section className="section">
          <h2 className="sec-title">จุดเด่นของทีม</h2>
          <ul className="strengths">
            {TEAM.strengths.map((s, i) => (
              <li key={s}><span className="ico">{STRENGTH_ICONS[i]}</span>{s}</li>
            ))}
          </ul>
        </section>

        <section className="section" id="team">
          <h2 className="sec-title">สมาชิก</h2>
          <div className="cards">
            {MEMBERS.map((m, i) => (
              <article className="card" key={m.email}>
                <span className="no">No.{String(i + 1).padStart(3, '1')}</span>
                <img className="photo" src={m.photo} alt={m.name} />
                <h3>{m.name}</h3>
                <p className="role">{m.role}</p>
                <div className="hp" aria-hidden="true"><span>HP</span><i><b /></i></div>
                <p className="task">{m.task}</p>
                <p className="bio">{m.bio}</p>
                <p className="nick">ชื่อเล่น: {m.nickname}</p>
                <p className="uni">{m.major} · ปี {m.year} · {m.uni}</p>
                <ul className="chips">
                  {m.skills.map((k) => <li key={k}>{k}</li>)}
                </ul>
                <dl className="stats">
                  {Object.entries(m.stats).map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd><i><b style={{ width: `${v * 10}%` }} /></i><span>{v}/10</span></dd>
                    </div>
                  ))}
                </dl>
                <p className="meta"><b>งานอดิเรก:</b> {m.hobbies.join(', ')}</p>
                <p className="meta"><b>เป้าหมาย:</b> {m.goal}</p>
                <blockquote className="member-motto">“{m.motto}”</blockquote>
                <a href={`mailto:${m.email}`}>{m.email}</a>
                {m.contact && <a href={`mailto:${m.contact}`}>{m.contact}</a>}
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="skills">
          <h2 className="sec-title">ทักษะของทีม</h2>
          <SkillExplorer />
        </section>

        <footer className="foot">© 2026 {TEAM.name}</footer>
      </main>

    </div>
  )
}
