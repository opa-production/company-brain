import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, X, Maximize2 } from 'lucide-react'
import VoiceVisualizer from './VoiceVisualizer.jsx'
import Orb from './Orb.jsx'
import { Icon } from './Icon.jsx'
import * as api from '../lib/api.js'
import { SPEAK_KEY, VOICE_KEY } from '../config.js'

// Hands-free voice loop: listening → thinking → speaking → listening.
//   listening  record the mic; stop once speech is followed by a pause
//   thinking   ElevenLabs speech-to-text, then a normal Brain turn (the
//              transcript and answer land in the open chat)
//   speaking   ElevenLabs text-to-speech of the answer
// The ElevenLabs key never reaches the browser: both calls go through the API.
//
// Lives inside the main panel so the sidebar stays usable. Navigating away
// shrinks it to a mini bar; the session keeps running until it's ended.

const SILENCE_MS = 1300 // pause that ends a question
const MAX_RECORD_MS = 45000
const SPEECH_LEVEL = 0.035 // RMS above which we count it as talking

export default function VoiceMode({ minimized, specialist, enabled, onExpand, onClose, ask }) {
  const [phase, setPhase] = useState('listening')
  const [muted, setMuted] = useState(false)
  const [caption, setCaption] = useState('')
  const [problem, setProblem] = useState(enabled ? '' : "Voice isn't switched on for Ardena yet.")
  const mutedRef = useRef(muted)
  mutedRef.current = muted
  const stopped = useRef(false)
  const streamRef = useRef(null)
  const audioRef = useRef(null)
  const wakeRef = useRef(null)

  // Unmuting wakes a loop that is waiting.
  useEffect(() => { if (!muted) wakeRef.current?.() }, [muted])

  useEffect(() => {
    if (!enabled) return
    stopped.current = false
    let ctx

    const waitWhileMuted = () => new Promise((resolve) => {
      if (!mutedRef.current) return resolve()
      wakeRef.current = resolve
    })

    // Record one utterance. Resolves with a Blob, or null if nothing was said.
    const record = (stream) => new Promise((resolve) => {
      const rec = new MediaRecorder(stream)
      const parts = []
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      const src = ctx.createMediaStreamSource(stream)
      src.connect(analyser)
      const buf = new Float32Array(analyser.fftSize)
      let spoke = false
      let quietSince = 0
      const started = performance.now()
      let raf

      const tick = () => {
        if (stopped.current || mutedRef.current) return rec.state === 'recording' && rec.stop()
        analyser.getFloatTimeDomainData(buf)
        let sum = 0
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
        const level = Math.sqrt(sum / buf.length)
        const now = performance.now()
        if (level > SPEECH_LEVEL) { spoke = true; quietSince = 0 } else if (spoke && !quietSince) quietSince = now
        if ((spoke && quietSince && now - quietSince > SILENCE_MS) || now - started > MAX_RECORD_MS) {
          return rec.state === 'recording' && rec.stop()
        }
        raf = requestAnimationFrame(tick)
      }

      rec.ondataavailable = (e) => e.data.size && parts.push(e.data)
      rec.onstop = () => {
        cancelAnimationFrame(raf)
        src.disconnect()
        resolve(spoke && !mutedRef.current && !stopped.current ? new Blob(parts, { type: rec.mimeType || 'audio/webm' }) : null)
      }
      rec.start()
      raf = requestAnimationFrame(tick)
    })

    const play = (url) => new Promise((resolve) => {
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = audio.onerror = () => { URL.revokeObjectURL(url); resolve() }
      audio.play().catch(() => resolve())
    })

    ;(async () => {
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      } catch {
        setProblem('Brain needs your microphone. Allow it in the browser and open voice again.')
        return
      }
      streamRef.current = stream
      ctx = new (window.AudioContext || window.webkitAudioContext)()

      while (!stopped.current) {
        setPhase('listening')
        await waitWhileMuted()
        if (stopped.current) break
        const blob = await record(stream)
        if (stopped.current) break
        if (!blob) continue

        setPhase('thinking')
        let text = ''
        try {
          text = (await api.transcribe(blob)).text.trim()
        } catch (e) {
          setCaption(e.message)
          continue
        }
        if (!text) { setCaption("I didn't catch that."); continue }
        setCaption(text)

        const answer = await ask(text)
        if (stopped.current) break
        if (!answer) { setCaption('Brain couldn’t answer that. Try again.'); continue }

        setPhase('speaking')
        setCaption(answer.length > 280 ? answer.slice(0, 277) + '…' : answer)
        if (localStorage.getItem(SPEAK_KEY) !== 'off') {
          try {
            await play(await api.speak(answer.slice(0, 4000), localStorage.getItem(VOICE_KEY)))
          } catch (e) {
            setCaption(e.message)
          }
        } else {
          await new Promise((r) => setTimeout(r, 2500))
        }
        if (!stopped.current) setCaption('')
      }
    })()

    return () => {
      stopped.current = true
      wakeRef.current?.()
      audioRef.current?.pause()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      ctx?.close().catch(() => {})
    }
  }, [enabled, ask])

  useEffect(() => {
    if (minimized) return
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose, minimized])

  const label = problem ? 'Voice unavailable' : { listening: muted ? 'Muted' : 'Listening', thinking: 'Thinking', speaking: 'Speaking' }[phase]

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
          <VoiceVisualizer phase={phase} muted={muted || !!problem} size={420} />
          <div className="voice-bot">
            <img src="/ai.png" alt="Ardena Brain" draggable="false" />
          </div>
        </div>
        <div className="voice-status">
          <span className="voice-dot" />
          <span className={phase === 'thinking' && !problem ? 'shimmer' : ''}>{label}</span>
        </div>
        <div className={`voice-caption ${phase === 'speaking' ? 'is-brain' : ''}`} key={phase === 'speaking' ? 'b' : 'y'}>
          {problem || caption || (phase === 'listening' && !muted ? 'Ask anything. I answer when you pause.' : '')}
        </div>
      </div>

      <div className="voice-controls">
        <button className={`round-btn ${muted ? 'on' : ''}`} onClick={() => setMuted(!muted)} title={muted ? 'Unmute' : 'Mute'} disabled={!!problem}>
          {muted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        <button className="round-btn end" onClick={onClose} title="End voice"><X size={20} /></button>
      </div>
      <div className="voice-foot">Voice by ElevenLabs</div>
    </div>
  )
}
