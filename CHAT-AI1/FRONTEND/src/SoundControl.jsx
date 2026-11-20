import { useEffect, useSyncExternalStore } from 'react'
import { sfx, sound } from './sound.js'
import './sound.css'

// ปุ่มเปิด/ปิดเสียง + ผูกเพลงพื้นหลังกับฉาก (desktop → gate → game) + ติดตั้งเสียง UI ทั้งเว็บ
export default function SoundControl({ stage }) {
  const st = useSyncExternalStore(sound.subscribe, sound.getState)

  useEffect(() => sound.install(), [])

  useEffect(() => {
    if (stage === 'gate') {
      sfx.play('boot')
      sfx.bgm('title')
    } else if (stage === 'game') {
      sfx.play('welcome')
      sfx.bgm('town', 1.3)
    } else {
      sfx.bgm(null)
    }
  }, [stage])

  function flip(key) {
    if (key === 'sfx' && st.sfx) sfx.play('cancel')
    sound.toggle(key)
    if (key === 'sfx' && !st.sfx) sfx.play('confirm')
  }

  return (
    <div className={`snd ${stage === 'desktop' ? 'on-desktop' : ''}`} role="group" aria-label="ตั้งค่าเสียง">
      <button type="button" data-sfx="none" className={st.sfx ? 'on' : ''} aria-pressed={st.sfx} aria-label="เสียงเอฟเฟกต์" title="เสียงเอฟเฟกต์" onClick={() => flip('sfx')}>
        ♪ SFX
      </button>
      <button type="button" data-sfx="none" className={st.bgm ? 'on' : ''} aria-pressed={st.bgm} aria-label="เพลงพื้นหลัง" title="เพลงพื้นหลัง" onClick={() => flip('bgm')}>
        ♫ BGM
      </button>
    </div>
  )
}
