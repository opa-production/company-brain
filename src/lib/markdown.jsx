// Renderer for the markdown Brain answers use. Covers headings, paragraphs,
// bullet and numbered lists (one level of nesting), tables, quotes, code,
// horizontal rules, **bold**, *italic*, `code` and links.
//
// `tidy` cleans the text first so answers read calmly: long dashes become
// commas or colons, stray "•" bullets become real lists, and runs of blank
// lines collapse.
import React from 'react'

export function tidy(text) {
  return text
    .replace(/\r\n?/g, '\n')
    // "**Label** — value" / "Label — value" at the start of a line or item → "Label: value"
    .replace(/^(\s*(?:[-*+]|\d+\.)?\s*(?:\*\*[^*\n]+\*\*|[^\s—–*][^\s—–]*(?: [^\s—–]+){0,2}?))\s+[—–]\s+/gm, (_, head) => `${head.replace(/\s+$/, '')}: `)
    // Remaining spaced long dashes inside sentences → comma
    .replace(/\s+[—–]\s+/g, ', ')
    // Unspaced em dashes between words → comma
    .replace(/(\w)—(\w)/g, '$1, $2')
    // Lone dashes left at a line end or start
    .replace(/[—]\s*$/gm, '')
    .replace(/^\s*[—]\s*/gm, '')
    // "• item" bullets → markdown bullets
    .replace(/^(\s*)[•·▪]\s+/gm, '$1- ')
    // Fix ", ," and ": ," leftovers
    .replace(/([,:])\s*,/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const INLINE = /(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\[[^\]\n]+\]\([^)\s]+\)|(?<![\w*])\*[^*\n]+\*(?![\w*])|(?<![\w])_[^_\n]+_(?![\w])|https?:\/\/[^\s)<]+[^\s)<.,;:!?'"])/g

function inline(text, keyBase) {
  const out = []
  let last = 0
  let m
  let k = 0
  INLINE.lastIndex = 0
  while ((m = INLINE.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const tok = m[0]
    const key = `${keyBase}-${k++}`
    if (tok.startsWith('`')) out.push(<code key={key}>{tok.slice(1, -1)}</code>)
    else if (tok.startsWith('**') || tok.startsWith('__')) out.push(<strong key={key}>{inline(tok.slice(2, -2), key)}</strong>)
    else if (tok.startsWith('[')) {
      const [, label, href] = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok)
      out.push(<a key={key} href={href} target="_blank" rel="noreferrer">{label}</a>)
    } else if (tok.startsWith('*') || tok.startsWith('_')) out.push(<em key={key}>{tok.slice(1, -1)}</em>)
    else out.push(<a key={key} href={tok} target="_blank" rel="noreferrer">{tok.replace(/^https?:\/\//, '')}</a>)
    last = m.index + tok.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

const LIST = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/
const isTableSep = (l) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l)
const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())

function renderList(items, key) {
  const ordered = /\d/.test(items[0].marker)
  const Tag = ordered ? 'ol' : 'ul'
  const start = ordered ? parseInt(items[0].marker, 10) : undefined
  return (
    <Tag key={key} start={start && start !== 1 ? start : undefined}>
      {items.map((it, i) => (
        <li key={i}>
          {inline(it.text, `${key}-${i}`)}
          {it.children.length > 0 && renderList(it.children, `${key}-${i}c`)}
        </li>
      ))}
    </Tag>
  )
}

export function Markdown({ text }) {
  const lines = tidy(text).split('\n')
  const blocks = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const key = `b${blocks.length}`

    if (!line.trim()) { i++; continue }

    // fenced code
    if (/^\s*```/.test(line)) {
      const body = []
      i++
      while (i < lines.length && !/^\s*```/.test(lines[i])) body.push(lines[i++])
      i++
      blocks.push(<pre key={key}><code>{body.join('\n')}</code></pre>)
      continue
    }

    // headings
    const h = /^(#{1,6})\s+(.*?)\s*#*$/.exec(line)
    if (h) {
      const level = Math.min(Math.max(h[1].length, 2), 4) // keep answers modest: h2–h4
      const Tag = `h${level}`
      blocks.push(<Tag key={key}>{inline(h[2], key)}</Tag>)
      i++
      continue
    }

    // a line that is only bold text reads as a small heading
    const boldHead = /^\*\*([^*]+)\*\*:?\s*$/.exec(line.trim())
    if (boldHead) {
      blocks.push(<h4 key={key}>{inline(boldHead[1], key)}</h4>)
      i++
      continue
    }

    // horizontal rule
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      blocks.push(<hr key={key} />)
      i++
      continue
    }

    // table
    if (line.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const head = cells(line)
      i += 2
      const rows = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(cells(lines[i++]))
      blocks.push(
        <div key={key} className="md-table">
          <table>
            <thead><tr>{head.map((c, j) => <th key={j}>{inline(c, `${key}h${j}`)}</th>)}</tr></thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>{head.map((_, j) => <td key={j}>{inline(r[j] || '', `${key}r${ri}c${j}`)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }

    // blockquote
    if (/^\s*>/.test(line)) {
      const body = []
      while (i < lines.length && /^\s*>/.test(lines[i])) body.push(lines[i++].replace(/^\s*>\s?/, ''))
      blocks.push(<blockquote key={key}>{inline(body.join(' '), key)}</blockquote>)
      continue
    }

    // lists (one nesting level, by indentation)
    if (LIST.test(line)) {
      const top = []
      let baseIndent = LIST.exec(line)[1].length
      const ordered = /\d/.test(LIST.exec(line)[2])
      while (i < lines.length) {
        const l = lines[i]
        const lm = LIST.exec(l)
        if (lm) {
          const indent = lm[1].length
          const item = { marker: lm[2], text: lm[3], children: [] }
          if (indent > baseIndent && top.length) top[top.length - 1].children.push(item)
          else {
            if (/\d/.test(lm[2]) !== ordered && top.length) break
            baseIndent = Math.min(baseIndent, indent)
            top.push(item)
          }
          i++
        } else if (l.trim() && /^\s{2,}/.test(l) && top.length) {
          // continuation line of the previous item
          const last = top[top.length - 1]
          const target = last.children.length ? last.children[last.children.length - 1] : last
          target.text += ' ' + l.trim()
          i++
        } else if (!l.trim() && i + 1 < lines.length && LIST.test(lines[i + 1])) {
          i++ // blank line between items of the same list
        } else break
      }
      blocks.push(renderList(top, key))
      continue
    }

    // paragraph: consecutive plain lines, kept as line breaks
    const para = []
    while (
      i < lines.length && lines[i].trim() && !LIST.test(lines[i]) && !/^(#{1,6})\s/.test(lines[i]) &&
      !/^\s*(```|>)/.test(lines[i]) && !(lines[i].includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1]))
    ) para.push(lines[i++])
    blocks.push(
      <p key={key}>
        {para.map((l, j) => (
          <React.Fragment key={j}>{j > 0 && <br />}{inline(l.trim(), `${key}-${j}`)}</React.Fragment>
        ))}
      </p>,
    )
  }

  return <div className="md">{blocks}</div>
}
