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

// Departments that file monthly reports (Department reports page). Keys are
// sent to the API; keep them in step with opabackend app/brain/reports.py.
export const departments = [
  { key: 'finance', name: 'Finance' },
  { key: 'sales', name: 'Sales' },
  { key: 'marketing', name: 'Marketing' },
  { key: 'operations', name: 'Operations' },
  { key: 'product', name: 'Product & tech' },
  { key: 'customer_service', name: 'Customer service' },
  { key: 'hr', name: 'People & HR' },
]

// Platforms on the Company socials page, in display order.
export const SOCIAL_PLATFORMS = [
  { key: 'website', name: 'Website' },
  { key: 'instagram', name: 'Instagram' },
  { key: 'linkedin', name: 'LinkedIn' },
  { key: 'x', name: 'X (Twitter)' },
  { key: 'facebook', name: 'Facebook' },
  { key: 'tiktok', name: 'TikTok' },
  { key: 'youtube', name: 'YouTube' },
  { key: 'whatsapp', name: 'WhatsApp' },
  { key: 'email', name: 'Email' },
  { key: 'other', name: 'Other' },
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
// localStorage key: which voice this person picked.
export const VOICE_KEY = 'ardena-brain-voice'

// The voices Brain can speak with (ElevenLabs premade voices). The list and
// the samples live in the UI: Settings plays public/voices/<key>.mp3, so
// hearing a voice never calls the backend or ElevenLabs. Only the chosen `key`
// is sent with /brain/voice/speak. Keep the keys in step with opabackend
// app/brain/voices.py, and regenerate samples with scripts/make-voice-samples.mjs.
export const VOICES = [
  { key: 'sarah', name: 'Sarah', gender: 'female', style: 'Warm and reassuring', voiceId: 'EXAVITQu4vr4xnSDxMaL' },
  { key: 'jessica', name: 'Jessica', gender: 'female', style: 'Bright and conversational', voiceId: 'cgSgspJ2msm6clMCkdW9' },
  { key: 'lily', name: 'Lily', gender: 'female', style: 'Calm and clear', voiceId: 'pFZP5JQG7iQjIQuC4Bku' },
  { key: 'brian', name: 'Brian', gender: 'male', style: 'Deep and steady', voiceId: 'nPczCjzI2devNBz1zQrb' },
  { key: 'george', name: 'George', gender: 'male', style: 'Warm storyteller', voiceId: 'JBFqnCBsd6RMkjVDRZzb' },
]
export const DEFAULT_VOICE = 'sarah'
