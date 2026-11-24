import { useEffect, useState } from 'react'
import { Mic, MicOff, X, Maximize2 } from 'lucide-react'
import VoiceVisualizer from './VoiceVisualizer.jsx'
import Orb from './Orb.jsx'
import { Icon } from './Icon.jsx'
import { voiceScript } from '../lib/mockBrain.js'

// Mock voice loop: listening → thinking → speaking. The real version records
// audio, posts it to /brain/voice/turn (ElevenLabs STT → Brain → ElevenLabs TTS)
// and plays the streamed audio back.
//
// Lives inside the main panel so the sidebar stays usable. Navigating away
// shrinks it to a mini bar; the session keeps running until it's ended.
export default function VoiceMode({ minimized, specialist, onExpand, onClose, onTranscript }) {
  const [phase, setPhase] = useState('listening')
  const [muted, setMuted] = useState(false)
  const [caption, setCaption] = useState('')

  useEffect(() => {
    const you = voiceScript[0].text
    const brain = voiceScript[1].text
    const timers = []
    let i = 0
    const iv = setInterval(() => {
      i += 1
      setCaption(you.slice(0, i))
      if (i >= you.length) clearInterval(iv)
    }, 55)
    timers.push(setTimeout(() => setPhase('thinking'), 2600))
    timers.push(setTimeout(() => { setPhase('speaking'); setCaption(brain) }, 4200))
    timers.push(setTimeout(() => { onTranscript?.(you); setPhase('listening'); setCaption('') }, 10500))
    return () => { clearInterval(iv); timers.forEach(clearTimeout) }
  }, [onTranscript])

  useEffect(() => {
    if (minimized) return
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose, minimized])

  const label = { listening: muted ? 'Muted' : 'Listening', thinking: 'Thinking', speaking: 'Speaking' }[phase]

  if (minimized) {
    return (
      <div className={`voice-mini phase-${phase}`}>
        <Orb size={30} state={phase === 'listening' ? 'idle' : 'busy'} />
        <div className="vm-bars" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        <span className="vm-label">{label}</span>
        <button className="icon-btn sm" onClick={() => setMuted(!muted)} title={muted ? 'Unmute' : 'Mute'}>
          {muted ? <MicOff size={15} /> : <Mic size={15} />}
        </button>
        <button className="icon-btn sm" onClick={onExpand} title="Open voice"><Maximize2 size={15} /></button>
        <button className="icon-btn sm vm-end" onClick={onClose} title="End voice"><X size={15} /></button>
      </div>
    )
  }

  return (
    <div className={`voice-panel phase-${phase}`}>
      <div className="voice-top">
        {specialist ? (
          <span className="spec-chip"><Icon name={specialist.icon} size={14} /> {specialist.name} specialist</span>
        ) : <span className="voice-title">Voice</span>}
        <button className="icon-btn" onClick={onClose} title="Close (Esc)"><X size={19} /></button>
      </div>

      <div className="voice-center">
        <div className="voice-stage">
          <VoiceVisualizer phase={phase} muted={muted} size={420} />
          <div className="voice-bot">
            <img src="/ai.png" alt="Ardena Brain" draggable="false" />
          </div>
        </div>
        <div className="voice-status">
          <span className="voice-dot" />
          <span className={phase === 'thinking' ? 'shimmer' : ''}>{label}</span>
        </div>
        <div className={`voice-caption ${phase === 'speaking' ? 'is-brain' : ''}`} key={phase === 'speaking' ? 'b' : 'y'}>
          {caption}
        </div>
      </div>

      <div className="voice-controls">
        <button className={`round-btn ${muted ? 'on' : ''}`} onClick={() => setMuted(!muted)} title={muted ? 'Unmute' : 'Mute'}>
          {muted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        <button className="round-btn end" onClick={onClose} title="End voice"><X size={20} /></button>
      </div>
      <div className="voice-foot">Voice by ElevenLabs · mock preview</div>
    </div>
  )
}
