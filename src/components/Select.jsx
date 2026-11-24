import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'

// Styled replacement for <select>: a button that opens a menu.
// options: [{ value, label, hint? }]
export default function Select({ value, onChange, options, placeholder = 'Choose…', invalid, id }) {
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(-1)
  const ref = useRef(null)
  const current = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    setHi(Math.max(0, options.findIndex((o) => o.value === value)))
    const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (o) => { onChange(o.value); setOpen(false) }

  const onKey = (e) => {
    if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); setOpen(true); return }
    if (!open) return
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setHi((i) => Math.min(options.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((i) => Math.max(0, i - 1)) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (options[hi]) pick(options[hi]) }
    else if (e.key === 'Tab') setOpen(false)
  }

  return (
    <div className={`select ${open ? 'open' : ''} ${invalid ? 'invalid' : ''}`} ref={ref}>
      <button type="button" id={id} className="select-btn" onClick={() => setOpen((o) => !o)} onKeyDown={onKey} aria-haspopup="listbox" aria-expanded={open}>
        <span className={current ? '' : 'select-ph'}>{current ? current.label : placeholder}</span>
        <ChevronDown size={15} className="select-chev" />
      </button>
      {open && (
        <div className="select-menu" role="listbox">
          {options.map((o, i) => (
            <button
              type="button"
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={`select-opt ${i === hi ? 'hi' : ''} ${o.value === value ? 'on' : ''}`}
              onMouseEnter={() => setHi(i)}
              onClick={() => pick(o)}
            >
              <span className="menu-grow">
                <span>{o.label}</span>
                {o.hint && <span className="select-hint">{o.hint}</span>}
              </span>
              {o.value === value && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
