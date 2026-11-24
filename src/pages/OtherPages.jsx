import { useState } from 'react'
import { Copy, Check, Eye, EyeOff, Lock, FileText, MessageSquare, Shield, AudioLines, UserRound, ShieldCheck, LogOut, SlidersHorizontal } from 'lucide-react'
import { facts, kbGroups, models, currentUser } from '../data/mock.js'

export function FactsPage() {
  const [revealed, setRevealed] = useState({})
  const [copied, setCopied] = useState(null)
  const groups = [...new Set(facts.map((f) => f.group))]

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Company facts</h2>
          <p className="muted">Exact values Brain quotes word for word: registration numbers, PINs, certificates. Restricted values are masked, and every reveal is logged.</p>
        </div>
      </div>
      {groups.map((gid) => (
        <section key={gid} className="facts-section">
          <h3>{kbGroups.find((k) => k.id === gid)?.name}</h3>
          <div className="facts-grid">
            {facts.filter((f) => f.group === gid).map((f) => {
              const show = !f.restricted || revealed[f.key]
              return (
                <div key={f.key} className="fact-card">
                  <div className="fact-label">{f.label} {f.restricted && <span className="restricted"><Lock size={11} /> Restricted</span>}</div>
                  <div className={`fact-value ${show ? '' : 'masked'}`}>{show ? f.value : '•••• •••• ••••'}</div>
                  <div className="fact-foot">
                    <span className="muted small"><FileText size={12} /> {f.source}</span>
                    <span className="row-actions">
                      {f.restricted && (
                        <button className="icon-btn sm" title={show ? 'Hide' : 'Reveal (logged)'} onClick={() => setRevealed({ ...revealed, [f.key]: !revealed[f.key] })}>
                          {show ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      )}
                      <button
                        className="icon-btn sm"
                        title="Copy"
                        disabled={!show}
                        onClick={() => { navigator.clipboard?.writeText(f.value); setCopied(f.key); setTimeout(() => setCopied(null), 1400) }}
                      >
                        {copied === f.key ? <Check size={15} /> : <Copy size={15} />}
                      </button>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

export function HistoryPage({ chats, openChat }) {
  return (
    <div className="page">
      <div className="page-head"><div><h2>History</h2><p className="muted">Your conversations. Only you can see them.</p></div></div>
      <div className="table">
        {chats.map((c) => (
          <button key={c.id} className="tr history-row" onClick={() => openChat(c.id)}>
            <span className="doc-cell"><MessageSquare size={16} /> {c.title}</span>
            <span className="muted">{c.day}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function SettingsPage({ onLogout, model, setModel }) {
  const [voice, setVoice] = useState('Amani')
  const [speakAnswers, setSpeakAnswers] = useState(true)
  return (
    <div className="page narrow">
      <div className="page-head"><div><h2>Settings</h2><p className="muted">Your profile, how Brain answers, and your session.</p></div></div>

      <section className="settings-card">
        <header className="sc-head"><UserRound size={16} /> Profile</header>
        <div className="sc-body profile-row">
          <div className="avatar lg">{currentUser.initials}</div>
          <div className="profile-text">
            <div className="profile-name">{currentUser.name}</div>
            <div className="muted small">{currentUser.email}</div>
          </div>
          <span className="role-tag"><ShieldCheck size={13} /> {currentUser.role}</span>
        </div>
        <footer className="sc-foot">
          <span className="muted small">Same account as the Ardena admin dashboard.</span>
          <button className="ghost-btn danger" onClick={onLogout}><LogOut size={15} /> Sign out</button>
        </footer>
      </section>

      <section className="settings-card">
        <header className="sc-head"><SlidersHorizontal size={16} /> Answers</header>
        <div className="sc-body">
          <div className="field">Default mode
            <div className="seg">
              {models.map((m) => (
                <button key={m.id} className={model === m.id ? 'on' : ''} onClick={() => setModel(m.id)}>{m.name}</button>
              ))}
            </div>
            <span className="muted small">{models.find((m) => m.id === model)?.hint}. The knowledge base is always used.</span>
          </div>
        </div>
      </section>

      <section className="settings-card">
        <header className="sc-head"><AudioLines size={16} /> Voice</header>
        <div className="sc-body">
          <label className="field">Voice (ElevenLabs)
            <select value={voice} onChange={(e) => setVoice(e.target.value)}>
              <option>Amani</option><option>Wanjiru</option><option>Otieno</option>
            </select>
          </label>
          <label className="toggle"><input type="checkbox" checked={speakAnswers} onChange={() => setSpeakAnswers(!speakAnswers)} /> Read answers aloud in voice mode</label>
        </div>
      </section>

      <section className="settings-card">
        <header className="sc-head"><Shield size={16} /> Security</header>
        <div className="sc-body">
          <div className="kv"><span>Sign-in</span><span>Admin account + one-time code</span></div>
          <div className="kv"><span>Session</span><span>8 hours, signs out after 30 min idle</span></div>
          <div className="kv"><span>Active sessions</span><span>1 (this browser)</span></div>
        </div>
        <footer className="sc-foot">
          <span className="muted small">Every sign-in and reveal is logged.</span>
          <button className="ghost-btn">Sign out everywhere</button>
        </footer>
      </section>
    </div>
  )
}
