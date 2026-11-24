import {
  Building2, Scale, Presentation, FileSignature, Landmark, Boxes, Palette, Link2,
  CalendarCheck, FileText, FileSpreadsheet, Globe, Gauge, Lightbulb, Telescope, Wallet, Handshake,
  Megaphone, TrendingUp, Receipt, Target, Tag, PenLine, Users, Sparkles,
} from 'lucide-react'

const MAP = {
  Building2, Scale, Presentation, FileSignature, Landmark, Boxes, Palette, Link2,
  CalendarCheck, FileText, FileSpreadsheet, Globe, Gauge, Lightbulb, Telescope, Wallet, Handshake,
  Megaphone, TrendingUp, Receipt, Target, Tag, PenLine, Users, Sparkles,
}

export function Icon({ name, size = 16, ...rest }) {
  const C = MAP[name] || FileText
  return <C size={size} strokeWidth={1.8} {...rest} />
}

const FAMILY = { pdf: 'pdf', doc: 'doc', docx: 'doc', ppt: 'ppt', pptx: 'ppt', xls: 'xls', xlsx: 'xls', csv: 'xls' }

// A small document-shaped tag with a folded corner. Monochrome on purpose so
// file types read as labels, not as warnings.
export function FileBadge({ type = 'file', size = 'md' }) {
  const t = (type || 'file').toLowerCase()
  return (
    <span className={`file-badge fb-${size} ff-${FAMILY[t] || 'other'}`}>
      <span className="fb-label">{t.slice(0, 4).toUpperCase()}</span>
    </span>
  )
}
