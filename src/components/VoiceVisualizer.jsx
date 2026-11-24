import { useEffect, useRef } from 'react'

// Canvas aura drawn behind the robot in voice mode. Each phase has its own look
// and the weights cross-fade so state changes feel fluid:
//   listening → a slow liquid ring that breathes, with ripples drifting outward
//   thinking  → comet arcs orbiting at different speeds, particles spiralling
//   speaking  → a radial equaliser of bars bursting with "speech" energy
export default function VoiceVisualizer({ phase, muted, size = 420 }) {
  const canvas = useRef(null)
  const phaseRef = useRef(phase)
  const mutedRef = useRef(muted)
  phaseRef.current = phase
  mutedRef.current = muted

  useEffect(() => {
    const c = canvas.current
    const ctx = c.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    c.width = size * dpr
    c.height = size * dpr
    ctx.scale(dpr, dpr)

    const w = { listening: 1, thinking: 0, speaking: 0 }
    const ripples = []
    let lastRipple = 0
    let energy = 0
    let raf
    const cx = size / 2
    const cy = size / 2
    const R = size * 0.3
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Cheap smooth noise: a few layered sines.
    const noise = (x, t) =>
      (Math.sin(x * 1.7 + t * 1.3) + Math.sin(x * 3.1 - t * 2.1) * 0.6 + Math.sin(x * 5.3 + t * 3.7) * 0.35) / 1.95

    const draw = (ms) => {
      const t = reduce ? 0 : ms / 1000
      const p = phaseRef.current
      for (const k of Object.keys(w)) w[k] += ((p === k ? 1 : 0) - w[k]) * 0.06
      const quiet = mutedRef.current && p === 'listening'

      // Speech energy envelope: syllable-like bursts.
      const target = p === 'speaking' ? 0.55 + 0.45 * Math.abs(Math.sin(t * 7.3) * Math.sin(t * 2.9 + 1)) : quiet ? 0.05 : 0.25
      energy += (target - energy) * 0.18

      ctx.clearRect(0, 0, size, size)

      // Soft glow behind everything.
      const glow = ctx.createRadialGradient(cx, cy, R * 0.4, cx, cy, R * 1.65)
      glow.addColorStop(0, `rgba(23,24,27,${0.05 + 0.05 * energy})`)
      glow.addColorStop(1, 'rgba(23,24,27,0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, size, size)

      // --- listening: ripples + liquid ring ---
      if (w.listening > 0.01) {
        if (!quiet && t - lastRipple > 1.1) { ripples.push(t); lastRipple = t }
        for (let i = ripples.length - 1; i >= 0; i--) {
          const age = (t - ripples[i]) / 3.2
          if (age > 1) { ripples.splice(i, 1); continue }
          ctx.beginPath()
          ctx.arc(cx, cy, R * (1 + age * 0.62), 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(23,24,27,${(1 - age) * 0.35 * w.listening})`
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
      }

      // Liquid ring (listening + speaking share it, speaking deforms harder).
      const liquid = w.listening + w.speaking
      if (liquid > 0.01) {
        for (let layer = 0; layer < 3; layer++) {
          ctx.beginPath()
          const amp = (quiet ? 2 : 6 + 10 * w.speaking * energy) * (1 + layer * 0.35)
          for (let a = 0; a <= 360; a += 3) {
            const rad = (a * Math.PI) / 180
            const r = R + 6 + layer * 7 + amp * noise(rad * (2 + layer), t * (0.8 + layer * 0.3) + layer)
            const x = cx + Math.cos(rad) * r
            const y = cy + Math.sin(rad) * r
            a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
          }
          ctx.closePath()
          ctx.strokeStyle = `rgba(23,24,27,${(0.55 - layer * 0.15) * liquid})`
          ctx.lineWidth = 2 - layer * 0.5
          ctx.stroke()
        }
      }

      // --- speaking: radial equaliser ---
      if (w.speaking > 0.01) {
        const N = 72
        ctx.lineCap = 'round'
        for (let i = 0; i < N; i++) {
          const ang = (i / N) * Math.PI * 2 - Math.PI / 2
          const n = (noise(i * 0.45, t * 2.4) + 1) / 2
          const len = (6 + n * 46 * energy) * w.speaking
          const r0 = R + 30
          ctx.beginPath()
          ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0)
          ctx.lineTo(cx + Math.cos(ang) * (r0 + len), cy + Math.sin(ang) * (r0 + len))
          ctx.strokeStyle = `rgba(23,24,27,${(0.35 + n * 0.55) * w.speaking})`
          ctx.lineWidth = 3
          ctx.stroke()
        }
      }

      // --- thinking: orbiting comets + spiral particles ---
      if (w.thinking > 0.01) {
        const orbits = [
          { r: R + 22, speed: 1.6, len: 1.6, width: 3 },
          { r: R + 40, speed: -1.1, len: 1.1, width: 2 },
          { r: R + 58, speed: 0.7, len: 0.8, width: 1.5 },
        ]
        orbits.forEach((o, idx) => {
          const head = t * o.speed + idx * 2.1
          const steps = 28
          for (let s = 0; s < steps; s++) {
            const f = s / steps
            const a0 = head - Math.sign(o.speed) * o.len * f
            const a1 = head - Math.sign(o.speed) * o.len * (f + 1 / steps)
            ctx.beginPath()
            ctx.arc(cx, cy, o.r, Math.min(a0, a1), Math.max(a0, a1))
            ctx.strokeStyle = `rgba(23,24,27,${(1 - f) * 0.85 * w.thinking})`
            ctx.lineWidth = o.width
            ctx.lineCap = 'round'
            ctx.stroke()
          }
          ctx.beginPath()
          ctx.arc(cx + Math.cos(head) * o.r, cy + Math.sin(head) * o.r, o.width + 1.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(23,24,27,${w.thinking})`
          ctx.fill()
        })
        for (let i = 0; i < 24; i++) {
          const life = ((t * 0.35 + i / 24) % 1)
          const ang = i * 2.399 + life * 4
          const r = R + 80 - life * 70
          ctx.beginPath()
          ctx.arc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 1.6, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(23,24,27,${Math.sin(life * Math.PI) * 0.7 * w.thinking})`
          ctx.fill()
        }
      }

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [size])

  return <canvas ref={canvas} className="voice-canvas" style={{ width: size, height: size }} />
}
