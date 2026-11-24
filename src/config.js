// Fixed interface copy: answer modes, how each specialist is presented, and
// the starter questions. Everything else (who you are, which knowledge groups
// you can read, documents, facts, chats) comes from the API.

// Answer modes, picked from the composer. The knowledge base is always on.
export const models = [
  { id: 'fast', name: 'Fast', icon: 'Gauge', hint: 'Quick answers from the knowledge base' },
  { id: 'reason', name: 'Reason', icon: 'Lightbulb', hint: 'Thinks step by step before answering' },
  { id: 'deep', name: 'Deep research', icon: 'Telescope', hint: 'Reads every relevant document, slower' },
]

// Department specialists. The id is sent with each new chat; the backend
// switches the brief and searches these departments' groups first.
export const specialists = [
  {
    id: 'finance',
    name: 'Finance',
    icon: 'Wallet',
    tagline: 'Budgets, runway, tax and reporting',
    placeholder: 'Ask Finance about cash, tax, budgets or reports',
    suggestions: [
      { icon: 'TrendingUp', label: 'Revenue this month', prompt: 'What is our revenue this month, and how does it compare with last month?' },
      { icon: 'Landmark', label: 'Tax compliance', prompt: 'Are our KRA and tax compliance documents up to date?' },
      { icon: 'Receipt', label: 'Pending withdrawals', prompt: 'Which withdrawals are pending and how much do they add up to?' },
      { icon: 'FileSpreadsheet', label: 'Refunds', prompt: 'Summarise refunds raised this month' },
    ],
  },
  {
    id: 'sales',
    name: 'Sales',
    icon: 'Handshake',
    tagline: 'Pipeline, clients, pricing and proposals',
    placeholder: 'Ask Sales about pipeline, clients, pricing or proposals',
    suggestions: [
      { icon: 'Target', label: 'Access requests', prompt: 'Which businesses are waiting for an Ardena Business workspace?' },
      { icon: 'FileSignature', label: 'Draft a proposal', prompt: 'Draft a Fleet plan proposal for a rental company with 20 cars' },
      { icon: 'Tag', label: 'Pricing', prompt: 'What is our pricing for Ardena Business?' },
      { icon: 'CalendarCheck', label: 'Bookings this month', prompt: 'How many bookings do we have this month?' },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing',
    icon: 'Megaphone',
    tagline: 'Brand, campaigns, content and audience',
    placeholder: 'Ask Marketing about campaigns, content or brand',
    suggestions: [
      { icon: 'Megaphone', label: 'Campaign ideas', prompt: 'Give me campaign ideas for the December holidays' },
      { icon: 'PenLine', label: 'Write social posts', prompt: 'Write three social posts about airport transfers' },
      { icon: 'Palette', label: 'Brand voice', prompt: 'What are our brand guidelines for tone of voice?' },
      { icon: 'Users', label: 'Our audience', prompt: 'Who is our target audience?' },
    ],
  },
]

export const suggestions = [
  { icon: 'FileSignature', label: 'Fill an application', prompt: 'Help me fill an accelerator application for Ardena' },
  { icon: 'Presentation', label: 'Pitch deck summary', prompt: 'Summarise our pitch deck' },
  { icon: 'Landmark', label: 'KRA & registration', prompt: 'What are our KRA PIN and company registration number?' },
  { icon: 'CalendarCheck', label: 'Bookings this month', prompt: 'How many bookings do we have this month?' },
]

export const ROLE_LABELS = {
  super_admin: 'Super admin',
  general_admin: 'General admin',
  manager: 'Manager',
  finance: 'Finance',
  customer_service: 'Customer service',
}

// localStorage key: whether voice mode reads answers aloud.
export const SPEAK_KEY = 'ardena-brain-speak'
// localStorage key: which of the API's voices this person picked.
export const VOICE_KEY = 'ardena-brain-voice'
