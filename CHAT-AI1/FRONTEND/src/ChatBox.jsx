import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { sfx } from './sound.js'

// ตอนพัฒนา (npm run dev) ปล่อยว่างไว้ ใช้ proxy ใน vite.config.js | ตอนขึ้น Vercel ตั้ง VITE_API_URL เป็น URL ของ backend
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

// ครอบ <pre> ของ Markdown เพื่อเพิ่มปุ่ม Copy
function CodeBlock({ children }) {
  const [copied, setCopied] = useState(false)
  const code = String(children?.props?.children ?? '').replace(/\n$/, '')

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      sfx.play('coin')
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard ใช้ไม่ได้ ไม่ต้องทำอะไร
    }
  }

  return (
    <div className="code-block">
      <button type="button" className="copy-btn" data-sfx="none" onClick={copy}>
        {copied ? 'คัดลอกแล้ว' : 'Copy'}
      </button>
      <pre>{children}</pre>
    </div>
  )
}

// state แชตอยู่ที่เดียว: ตัวละครในฉาก ช่องพิมพ์ และประวัติสนทนาใช้ข้อมูลชุดเดียวกัน
export function useChat() {
  const [messages, setMessages] = useState([]) // { role: 'user' | 'assistant', text }
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // AI กำลังคิด: มีเสียงบี๊บเบา ๆ เป็นจังหวะระหว่างรอ
  useEffect(() => {
    if (!loading) return
    const t = setInterval(() => sfx.play('think'), 520)
    return () => clearInterval(t)
  }, [loading])

  // ส่งข้อความหนึ่งข้อความ (ใช้ทั้งจากช่องพิมพ์และปุ่มลัด)
  async function ask(raw) {
    const text = raw.trim()
    if (!text || loading) return
    sfx.play('send')
    const history = messages
    setMessages([...history, { role: 'user', text }])
    setInput('')
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, history }),
        signal: AbortSignal.timeout(30000),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setMessages((prev) => [...prev, { role: 'assistant', text: data.reply }])
      sfx.play('receive')
    } catch (err) {
      sfx.play('error')
      if (err.name === 'TimeoutError') setError('AI ตอบช้าเกินไป ลองใหม่อีกครั้ง')
      else if (err instanceof TypeError) setError('เชื่อมต่อ backend ไม่ได้ — backend รันอยู่หรือยัง? (ตั้ง VITE_API_URL ถูกหรือเปล่า)')
      else setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function send(e) {
    e.preventDefault()
    ask(input)
  }

  function clear() {
    sfx.play('delete')
    setMessages([])
    setError(null)
  }

  return { messages, input, setInput, loading, error, ask, send, clear }
}

// ปุ่มคำถามลัด: label = ข้อความบนปุ่ม, text = สิ่งที่ส่งให้ AI จริง ๆ
const QUICK = [
  { label: '👥 สมาชิกมีใครบ้าง', text: 'สมาชิกในทีมมีใครบ้าง' },
  { label: '🛠️ ทีมนี้ทำอะไรได้', text: 'ทีมนี้ทำอะไรได้บ้าง' },
  { label: '🎯 ใครทำส่วนไหน', text: 'สมาชิกแต่ละคนรับผิดชอบส่วนไหนของโปรเจกต์' },
  { label: '💡 จุดเด่นของทีม', text: 'จุดเด่นของทีมนี้คืออะไร' },
  { label: '🧰 ใช้เทคโนโลยีอะไร', text: 'ทีมนี้ใช้เทคโนโลยีและภาษาโปรแกรมอะไรบ้าง' },
  { label: '📧 ติดต่อทีมยังไง', text: 'ติดต่อสมาชิกในทีมได้ทางไหน' },
]

// แถบพิมพ์ใต้ฉาก = เสียงของตัวละคร YOU (มีปุ่มลัดอยู่ด้านบน)
export function ChatInput({ chat }) {
  return (
    <div className="say-wrap">
      <div className="quick" role="group" aria-label="คำถามลัด">
        <span className="quick-label">ถามเร็ว</span>
        {QUICK.map((q) => (
          <button type="button" key={q.label} className="quick-btn" data-sfx="none" disabled={chat.loading} onClick={() => chat.ask(q.text)}>
            {q.label}
          </button>
        ))}
      </div>
      <form className="say-bar" onSubmit={chat.send}>
        <span className="you">YOU▶</span>
        <input
          value={chat.input}
          onChange={(e) => chat.setInput(e.target.value)}
          placeholder="พิมพ์ข้อความถึง AI..."
          aria-label="พิมพ์ข้อความ"
        />
        <button type="submit" data-sfx="none" disabled={!chat.input.trim() || chat.loading}>ส่ง</button>
      </form>
    </div>
  )
}

// แผงประวัติสนทนาด้านขวา
export function ChatHistory({ chat }) {
  const endRef = useRef(null)
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [chat.messages, chat.loading])

  return (
    <aside className="hist" aria-label="ประวัติสนทนา">
      <div className="hist-head">
        <b>ประวัติสนทนา</b>
        <button type="button" data-sfx="none" onClick={chat.clear} disabled={!chat.messages.length}>ล้าง</button>
      </div>
      <div className="hist-log">
        {!chat.messages.length && !chat.loading && <p className="hist-empty">ยังไม่มีบทสนทนา ลองพิมพ์ถาม หรือกดปุ่มลัดเหนือช่องพิมพ์ได้เลย</p>}
        {chat.messages.map((m, i) => (
          <div key={i} className={`m ${m.role === 'user' ? 'user' : 'ai'}`}>
            <small>{m.role === 'user' ? 'YOU' : 'AI'}</small>
            {m.role === 'assistant' ? <ReactMarkdown components={{ pre: CodeBlock }}>{m.text}</ReactMarkdown> : m.text}
          </div>
        ))}
        {chat.loading && <div className="m ai"><small>AI</small>กำลังพิมพ์...</div>}
        <div ref={endRef} />
      </div>
      {chat.error && <div className="hist-err">{chat.error}</div>}
    </aside>
  )
}
