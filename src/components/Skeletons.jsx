// Loading placeholders shaped like the page they stand in for, so content
// slots in without a jump. All share the .sk shimmer.

const Line = ({ w = '100%', h = 12, r = 6, style }) => <span className="sk" style={{ width: w, height: h, borderRadius: r, ...style }} />
const widths = ['72%', '54%', '86%', '63%', '78%', '48%', '69%', '58%']

export function AppSkeleton() {
  return (
    <div className="app">
      <div className="shell sk-shell" aria-busy="true" aria-label="Loading Ardena Brain">
        <aside className="sidebar sk-side">
          <Line w={110} h={22} style={{ marginBottom: 22 }} />
          <Line h={38} r={6} style={{ marginBottom: 20 }} />
          {[0, 1, 2].map((i) => <Line key={i} w={`${60 + i * 9}%`} h={14} style={{ margin: '10px 10px' }} />)}
          <Line w={70} h={10} style={{ margin: '24px 10px 8px' }} />
          {[0, 1, 2, 3].map((i) => <Line key={i} w={`${55 + i * 8}%`} h={14} style={{ margin: '10px 10px' }} />)}
          <Line w={60} h={10} style={{ margin: '24px 10px 8px' }} />
          {widths.slice(0, 6).map((w, i) => <Line key={i} w={w} h={13} style={{ margin: '11px 10px' }} />)}
        </aside>
        <main className="main sk-main">
          <div className="topbar"><span /><span className="sk" style={{ width: 34, height: 34, borderRadius: '50%' }} /></div>
          <div className="home">
            <span className="sk" style={{ width: 130, height: 90, borderRadius: 20 }} />
            <Line w={280} h={22} style={{ marginTop: 26 }} />
            <Line w={220} h={12} style={{ marginTop: 12 }} />
            <span className="sk" style={{ width: 'min(760px, 100%)', height: 112, borderRadius: 22, marginTop: 28 }} />
          </div>
        </main>
      </div>
    </div>
  )
}

export function ChatSkeleton() {
  return (
    <div className="chat" aria-busy="true">
      <div className="chat-scroll">
        <div className="thread">
          {[0, 1].map((t) => (
            <div key={t} style={{ display: 'contents' }}>
              <div className="msg user"><span className="sk" style={{ width: t ? '38%' : '52%', height: 42, borderRadius: '20px 20px 6px 20px' }} /></div>
              <div className="msg assistant">
                <span className="sk" style={{ width: 34, height: 34, borderRadius: '50%', flex: 'none' }} />
                <div className="msg-body sk-stack">
                  <Line w={90} h={10} />
                  {widths.slice(t * 2, t * 2 + (t ? 3 : 5)).map((w, i) => <Line key={i} w={w} h={13} />)}
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}><Line w={150} h={26} r={8} /><Line w={120} h={26} r={8} /></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function GroupGridSkeleton({ count = 8 }) {
  return (
    <div className="group-grid" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="group-card sk-card">
          <span className="sk" style={{ width: 34, height: 34, borderRadius: 6, marginBottom: 12 }} />
          <Line w={`${55 + (i % 3) * 12}%`} h={13} />
          <Line w={70} h={10} style={{ marginTop: 8 }} />
        </div>
      ))}
    </div>
  )
}

// Rows for the documents, links, history and audit tables.
export function TableSkeleton({ rows = 6, badge = true, cols = 2 }) {
  return (
    <div className="table" aria-busy="true">
      <div className="tr th sk-th"><Line w={90} h={10} /><span /></div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="tr sk-row">
          <span className="doc-cell">
            {badge && <span className="sk" style={{ width: 32, height: 38, borderRadius: 6, flex: 'none' }} />}
            <span className="sk-stack" style={{ flex: 1 }}>
              <Line w={widths[i % widths.length]} h={13} />
              {badge && <Line w={110} h={10} />}
            </span>
          </span>
          {cols > 2 && <Line w={80} h={11} />}
          <Line w={76} h={22} r={999} style={{ justifySelf: 'end' }} />
        </div>
      ))}
    </div>
  )
}

export function FactsSkeleton() {
  return (
    <div aria-busy="true">
      {[3, 2].map((n, s) => (
        <section key={s} className="facts-section">
          <Line w={120} h={10} style={{ marginBottom: 12 }} />
          <div className="facts-grid">
            {Array.from({ length: n }, (_, i) => (
              <div key={i} className="fact-card sk-card">
                <Line w="45%" h={11} />
                <Line w={`${60 + i * 10}%`} h={18} style={{ margin: '12px 0 14px' }} />
                <div className="fact-foot"><Line w="50%" h={10} /><Line w={56} h={10} /></div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export function PagesSkeleton() {
  return (
    <div className="pages" aria-busy="true">
      {[0, 1].map((p) => (
        <article key={p} className="paper sk-stack">
          <Line w={60} h={10} />
          <Line w="55%" h={18} style={{ marginBottom: 6 }} />
          {widths.map((w, i) => <Line key={i} w={i % 4 === 3 ? '40%' : '100%'} h={12} />)}
        </article>
      ))}
    </div>
  )
}
