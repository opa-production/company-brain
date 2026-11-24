import { useEffect, useRef, useState } from 'react'
import { Lock, Mail, ArrowLeft, ShieldCheck, Loader2, Eye, EyeOff } from 'lucide-react'
import Orb from '../components/Orb.jsx'

// Mirrors the admin dashboard's two-step sign-in:
//   POST /admin/auth/login      { email, password }  -> { otp_token }
//   POST /admin/auth/verify-otp { otp_token, code }  -> admin token
//   POST /brain/auth/session    (admin token)        -> Brain session
// Mock: any email + password, any 6 digits.
export default function Login({ onSignedIn }) {
  const [step, setStep] = useState('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const boxes = useRef([])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const submitPassword = (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) return setError('Enter your admin email and password.')
    setBusy(true)
    setTimeout(() => {
      setBusy(false)
      setStep('otp')
      setCooldown(30)
      setTimeout(() => boxes.current[0]?.focus(), 50)
    }, 800)
  }

  const verify = (digits) => {
    setBusy(true)
    setTimeout(() => {
      setBusy(false)
      if (digits.length !== 6) return setError('Enter the 6-digit code.')
      onSignedIn({ email })
    }, 900)
  }

  const setDigit = (i, v) => {
    const d = v.replace(/\D/g, '')
    if (d.length > 1) {
      const all = d.slice(0, 6).split('')
      const next = [...code]
      all.forEach((c, j) => { if (i + j < 6) next[i + j] = c })
      setCode(next)
      boxes.current[Math.min(i + all.length, 5)]?.focus()
      if (next.every(Boolean)) verify(next.join(''))
      return
    }
    const next = [...code]
    next[i] = d
    setCode(next)
    if (d && i < 5) boxes.current[i + 1]?.focus()
    if (next.every(Boolean)) verify(next.join(''))
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-bot"><Orb variant="full" size={150} /></div>
        <div className="login-brand"><img src="/logo.png" alt="Ardena" /></div>

        {step === 'password' ? (
          <form onSubmit={submitPassword}>
            <h2>Sign in</h2>
            <p className="muted">Use your Ardena admin account.</p>
            <label className="field">Email
              <div className="input-icon"><Mail size={16} /><input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@ardena.co.ke" /></div>
            </label>
            <label className="field">Password
              <div className="input-icon">
                <Lock size={16} />
                <input type={showPw ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                <button type="button" className="icon-btn sm" onClick={() => setShowPw(!showPw)}>{showPw ? <EyeOff size={15} /> : <Eye size={15} />}</button>
              </div>
            </label>
            {error && <div className="form-error">{error}</div>}
            <button className="primary-btn block" disabled={busy}>{busy ? <Loader2 size={16} className="spin" /> : 'Continue'}</button>
          </form>
        ) : (
          <div>
            <button className="link-btn" onClick={() => { setStep('password'); setCode(['', '', '', '', '', '']); setError('') }}><ArrowLeft size={15} /> Back</button>
            <h2>Enter your code</h2>
            <p className="muted">We sent a 6-digit code to your phone and to {email}. It expires in 5 minutes.</p>
            <div className="otp">
              {code.map((c, i) => (
                <input
                  key={i}
                  ref={(el) => (boxes.current[i] = el)}
                  inputMode="numeric"
                  maxLength={6}
                  value={c}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Backspace' && !c && i > 0) boxes.current[i - 1]?.focus() }}
                />
              ))}
            </div>
            {error && <div className="form-error">{error}</div>}
            <button className="primary-btn block" disabled={busy} onClick={() => verify(code.join(''))}>
              {busy ? <Loader2 size={16} className="spin" /> : 'Verify and sign in'}
            </button>
            <button className="link-btn center" disabled={cooldown > 0} onClick={() => setCooldown(30)}>
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        )}

        <div className="login-foot"><ShieldCheck size={14} /> Same login as the Ardena admin dashboard. Every sign-in is logged.</div>
      </div>
    </div>
  )
}
