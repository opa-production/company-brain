// Tiny renderer for the subset of markdown Brain answers use:
// paragraphs, "- " bullets, "1. " numbered lists, **bold**, _italic_, links.
import React from 'react'

function inline(text, keyBase) {
  const out = []
  const re = /(\*\*[^*]+\*\*|_[^_]+_|https?:\/\/[^\s)]+)/g
  let last = 0
  let m
  let k = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const tok = m[0]
    if (tok.startsWith('**')) out.push(<strong key={`${keyBase}-${k++}`}>{tok.slice(2, -2)}</strong>)
    else if (tok.startsWith('_')) out.push(<em key={`${keyBase}-${k++}`}>{tok.slice(1, -1)}</em>)
    else out.push(<a key={`${keyBase}-${k++}`} href={tok} target="_blank" rel="noreferrer">{tok}</a>)
    last = m.index + tok.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function Markdown({ text }) {
  const blocks = []
  const lines = text.split('\n')
  let list = null

  const flush = () => {
    if (list) {
      const Tag = list.ordered ? 'ol' : 'ul'
      blocks.push(<Tag key={`l${blocks.length}`}>{list.items.map((it, i) => <li key={i}>{inline(it, `li${blocks.length}-${i}`)}</li>)}</Tag>)
      list = null
    }
  }

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd()
    const ul = line.match(/^- (.*)/)
    const ol = line.match(/^\d+\. (.*)/)
    if (ul || ol) {
      const ordered = !!ol
      if (!list || list.ordered !== ordered) {
        flush()
        list = { ordered, items: [] }
      }
      list.items.push((ul || ol)[1])
    } else if (line.trim() === '') {
      flush()
    } else {
      flush()
      blocks.push(<p key={`p${idx}`}>{inline(line, `p${idx}`)}</p>)
    }
  })
  flush()
  return <div className="md">{blocks}</div>
}
