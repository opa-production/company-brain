// Read an answer aloud in the typed chat. One player for the whole app, so
// starting one answer stops any other. Long answers are split at sentence ends
// into chunks the speech API takes comfortably, and the next chunk is fetched
// while the current one plays, so there are no gaps.
import { useSyncExternalStore } from 'react'
import * as api from './api.js'
import { VOICE_KEY } from '../config.js'
import { toSpeech } from '../components/VoiceMode.jsx'

const CHUNK = 900

let state = { id: null, phase: 'idle', error: '', errorId: null } // phase: idle | loading | playing
const subs = new Set()
const set = (patch) => { state = { ...state, ...patch }; subs.forEach((f) => f()) }

let run = 0
let audio = null
let urls = []

function chunks(text) {
  const out = []
  let rest = text
  while (rest.length > CHUNK) {
    const cut = rest.slice(0, CHUNK)
    const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '), cut.lastIndexOf(': '))
    const at = end > 200 ? end + 1 : cut.lastIndexOf(' ') > 200 ? cut.lastIndexOf(' ') : CHUNK
    out.push(rest.slice(0, at).trim())
    rest = rest.slice(at).trim()
  }
  if (rest) out.push(rest)
  return out
}

export function stopReading() {
  run++
  if (audio) { audio.onended = audio.onerror = null; audio.pause(); audio = null }
  urls.forEach((u) => URL.revokeObjectURL(u))
  urls = []
  if (state.id) set({ id: null, phase: 'idle' })
}

export async function readAloud(id, markdown) {
  stopReading()
  const text = toSpeech(markdown, Infinity)
  if (!text) return
  const mine = ++run
  set({ id, phase: 'loading', error: '', errorId: null })
  const voice = localStorage.getItem(VOICE_KEY)
  const parts = chunks(text)
  const fetchPart = (i) => api.speak(parts[i], voice).then((u) => { urls.push(u); return u })

  try {
    let next = fetchPart(0)
    for (let i = 0; i < parts.length; i++) {
      const url = await next
      if (mine !== run) return
      next = i + 1 < parts.length ? fetchPart(i + 1) : null
      next?.catch(() => {}) // surfaced when awaited
      set({ phase: 'playing' })
      await new Promise((resolve, reject) => {
        audio = new Audio(url)
        audio.onended = resolve
        audio.onerror = () => reject(new Error("Couldn't play the answer."))
        audio.play().catch(reject)
      })
      URL.revokeObjectURL(url)
      urls = urls.filter((u) => u !== url)
      if (mine !== run) return
      if (next) set({ phase: 'loading' })
    }
    if (mine === run) { audio = null; set({ id: null, phase: 'idle' }) }
  } catch (e) {
    if (mine !== run) return
    stopReading()
    set({ error: e.message || "Couldn't read that aloud.", errorId: id })
  }
}

export const toggleReading = (id, markdown) => (state.id === id ? stopReading() : readAloud(id, markdown))

export function useReadAloud() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => state)
}

// "Read answers aloud" in the composer: every new typed answer is spoken.
const AUTO_KEY = 'ardena-brain-autoread'
export const autoReadOn = () => localStorage.getItem(AUTO_KEY) === 'on'
export const setAutoRead = (on) => localStorage.setItem(AUTO_KEY, on ? 'on' : 'off')
