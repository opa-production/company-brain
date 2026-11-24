// Mock data for the UI build. Every value here is a placeholder: swap this
// module for real API calls in phase 5 (see PLAN.md). Identifiers such as the
// KRA PIN and registration number are deliberately fake ("XXXX").

export const currentUser = {
  name: 'Deon',
  email: 'admin@ardena.co.ke',
  role: 'Super admin',
  initials: 'DO',
}

// Answer modes, picked from the composer. The knowledge base is always on.
export const models = [
  { id: 'fast', name: 'Fast', icon: 'Gauge', hint: 'Quick answers from the knowledge base' },
  { id: 'reason', name: 'Reason', icon: 'Lightbulb', hint: 'Thinks step by step before answering' },
  { id: 'deep', name: 'Deep research', icon: 'Telescope', hint: 'Reads every relevant document, slower' },
]

// Department specialists. Picking one tailors Brain: it searches that
// department's documents first, uses its vocabulary and suggests its tasks.
// The real version sends `specialist` with each turn so the backend can swap
// the system prompt and boost the listed knowledge-base groups.
export const specialists = [
  {
    id: 'finance',
    name: 'Finance',
    icon: 'Wallet',
    tagline: 'Budgets, runway, tax and reporting',
    groups: ['finance', 'pitch'],
    placeholder: 'Ask Finance about cash, tax, budgets or reports',
    suggestions: [
      { icon: 'TrendingUp', label: 'Runway & burn', prompt: 'What is our current burn and runway?' },
      { icon: 'Landmark', label: 'Tax compliance', prompt: 'Are our KRA and tax compliance documents up to date?' },
      { icon: 'FileSpreadsheet', label: 'Monthly P&L', prompt: 'Summarise our P&L for October' },
      { icon: 'Receipt', label: 'Unpaid invoices', prompt: 'Which invoices are still unpaid?' },
    ],
  },
  {
    id: 'sales',
    name: 'Sales',
    icon: 'Handshake',
    tagline: 'Pipeline, clients, pricing and proposals',
    groups: ['product', 'pitch', 'company'],
    placeholder: 'Ask Sales about pipeline, clients, pricing or proposals',
    suggestions: [
      { icon: 'Target', label: 'Pipeline this month', prompt: 'Show me our sales pipeline this month' },
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
    groups: ['brand', 'pitch', 'company'],
    placeholder: 'Ask Marketing about campaigns, content or brand',
    suggestions: [
      { icon: 'Megaphone', label: 'Campaign ideas', prompt: 'Give me campaign ideas for the December holidays' },
      { icon: 'PenLine', label: 'Write social posts', prompt: 'Write three social posts about airport transfers' },
      { icon: 'Palette', label: 'Brand voice', prompt: 'What are our brand guidelines for tone of voice?' },
      { icon: 'Users', label: 'Our audience', prompt: 'Who is our target audience?' },
    ],
  },
]

export const kbGroups = [
  { id: 'company', name: 'Company docs', icon: 'Building2', roles: 'All Brain users' },
  { id: 'legal', name: 'Legal & compliance', icon: 'Scale', roles: 'Super, general admin' },
  { id: 'pitch', name: 'Pitch & investors', icon: 'Presentation', roles: 'Super, general admin' },
  { id: 'applications', name: 'Applications & grants', icon: 'FileSignature', roles: 'All Brain users' },
  { id: 'finance', name: 'Finance & tax', icon: 'Landmark', roles: 'Super, general, finance admin' },
  { id: 'product', name: 'Product & operations', icon: 'Boxes', roles: 'All Brain users' },
  { id: 'brand', name: 'Brand', icon: 'Palette', roles: 'All Brain users' },
  { id: 'links', name: 'Links', icon: 'Link2', roles: 'All Brain users' },
]

export const documents = [
  { id: 'd1', group: 'company', title: 'Company profile 2026.pdf', type: 'pdf', size: '2.4 MB', updated: '12 Nov 2026', status: 'indexed', chunks: 38, owner: 'Deon' },
  { id: 'd2', group: 'company', title: 'Organisation chart.pdf', type: 'pdf', size: '410 KB', updated: '02 Nov 2026', status: 'indexed', chunks: 4, owner: 'Deon' },
  { id: 'd3', group: 'company', title: 'Employee handbook.docx', type: 'docx', size: '1.1 MB', updated: '21 Oct 2026', status: 'indexed', chunks: 62, owner: 'HR' },
  { id: 'd4', group: 'legal', title: 'Certificate of incorporation.pdf', type: 'pdf', size: '820 KB', updated: '15 Jan 2026', status: 'indexed', chunks: 2, owner: 'Legal' },
  { id: 'd5', group: 'legal', title: 'CR12 — October 2026.pdf', type: 'pdf', size: '640 KB', updated: '18 Oct 2026', status: 'indexed', chunks: 3, owner: 'Legal' },
  { id: 'd6', group: 'legal', title: 'Rental agreement template.docx', type: 'docx', size: '96 KB', updated: '09 Sep 2026', status: 'indexed', chunks: 21, owner: 'Legal' },
  { id: 'd7', group: 'legal', title: 'Data protection registration (ODPC).pdf', type: 'pdf', size: '310 KB', updated: '30 Jun 2026', status: 'indexed', chunks: 3, owner: 'Legal' },
  { id: 'd8', group: 'pitch', title: 'Ardena pitch deck — Nov 2026.pptx', type: 'pptx', size: '8.7 MB', updated: '20 Nov 2026', status: 'indexed', chunks: 24, owner: 'Deon' },
  { id: 'd9', group: 'pitch', title: 'One-pager.pdf', type: 'pdf', size: '1.2 MB', updated: '20 Nov 2026', status: 'indexed', chunks: 3, owner: 'Deon' },
  { id: 'd10', group: 'pitch', title: 'Financial model FY27.xlsx', type: 'xlsx', size: '540 KB', updated: '14 Nov 2026', status: 'processing', chunks: 0, owner: 'Finance' },
  { id: 'd11', group: 'applications', title: 'Stellar Instawards R2 — SOW.docx', type: 'docx', size: '210 KB', updated: '01 Oct 2026', status: 'indexed', chunks: 14, owner: 'Deon' },
  { id: 'd12', group: 'applications', title: 'Stellar deliverables report.docx', type: 'docx', size: '3.2 MB', updated: '24 Nov 2026', status: 'indexed', chunks: 31, owner: 'Deon' },
  { id: 'd13', group: 'applications', title: 'Accelerator application answers.docx', type: 'docx', size: '120 KB', updated: '03 Aug 2026', status: 'indexed', chunks: 18, owner: 'Deon' },
  { id: 'd14', group: 'finance', title: 'KRA PIN certificate.pdf', type: 'pdf', size: '180 KB', updated: '15 Jan 2026', status: 'indexed', chunks: 1, owner: 'Finance' },
  { id: 'd15', group: 'finance', title: 'Tax compliance certificate 2026.pdf', type: 'pdf', size: '220 KB', updated: '02 Apr 2026', status: 'indexed', chunks: 1, owner: 'Finance' },
  { id: 'd16', group: 'finance', title: 'Bank letter — business account.pdf', type: 'pdf', size: '150 KB', updated: '11 Mar 2026', status: 'failed', chunks: 0, owner: 'Finance' },
  { id: 'd17', group: 'product', title: 'Booking flow — ops manual.docx', type: 'docx', size: '640 KB', updated: '27 Oct 2026', status: 'indexed', chunks: 44, owner: 'Ops' },
  { id: 'd18', group: 'product', title: 'Cancellation policy.pdf', type: 'pdf', size: '90 KB', updated: '29 Jul 2026', status: 'indexed', chunks: 6, owner: 'Ops' },
  { id: 'd19', group: 'brand', title: 'Brand guidelines.pdf', type: 'pdf', size: '14.1 MB', updated: '05 May 2026', status: 'indexed', chunks: 27, owner: 'Design' },
]

export const links = [
  { id: 'l1', title: 'Ardena website', url: 'https://ardena.co.ke', crawled: '23 Nov 2026', status: 'indexed' },
  { id: 'l2', title: 'Terms & conditions', url: 'https://ardena.co.ke/terms', crawled: '23 Nov 2026', status: 'indexed' },
  { id: 'l3', title: 'Ardena Business', url: 'https://business.ardena.co.ke', crawled: '23 Nov 2026', status: 'indexed' },
  { id: 'l4', title: 'Status page', url: 'https://ardena.co.ke/status', crawled: '23 Nov 2026', status: 'indexed' },
  { id: 'l5', title: 'Escrow contracts (GitHub)', url: 'https://github.com/opa-production/ardena-deposit-escrow', crawled: '24 Nov 2026', status: 'indexed' },
]

export const facts = [
  { key: 'legal_name', label: 'Registered name', value: 'Ardena Ltd (mock)', group: 'legal', restricted: false, source: 'Certificate of incorporation.pdf' },
  { key: 'reg_no', label: 'Registration number', value: 'PVT-XXXXXXXX', group: 'legal', restricted: false, source: 'Certificate of incorporation.pdf' },
  { key: 'incorporated', label: 'Date of incorporation', value: '15 Jan 2026 (mock)', group: 'legal', restricted: false, source: 'Certificate of incorporation.pdf' },
  { key: 'kra_pin', label: 'KRA PIN', value: 'P05XXXXXXXXZ', group: 'finance', restricted: true, source: 'KRA PIN certificate.pdf' },
  { key: 'tcc', label: 'Tax compliance certificate', value: 'Valid until 31 Mar 2027 (mock)', group: 'finance', restricted: false, source: 'Tax compliance certificate 2026.pdf' },
  { key: 'odpc', label: 'ODPC registration', value: 'Registered — data controller (mock)', group: 'legal', restricted: false, source: 'Data protection registration (ODPC).pdf' },
  { key: 'address', label: 'Registered address', value: 'Nairobi, Kenya (mock)', group: 'company', restricted: false, source: 'Company profile 2026.pdf' },
  { key: 'email', label: 'Official email', value: 'info@ardena.co.ke', group: 'company', restricted: false, source: 'Company profile 2026.pdf' },
  { key: 'website', label: 'Website', value: 'https://ardena.co.ke', group: 'company', restricted: false, source: 'Ardena website' },
  { key: 'bank', label: 'Bank account', value: 'XXXX XXXX 1234 (mock)', group: 'finance', restricted: true, source: 'Bank letter — business account.pdf' },
]

export const initialChats = [
  { id: 'c1', title: 'KRA PIN for tender form', day: 'Today', messages: [] },
  { id: 'c2', title: 'Pitch deck traction slide', day: 'Today', messages: [] },
  { id: 'c3', title: 'Stellar closeout answers', day: 'Today', messages: [] },
  { id: 'c4', title: 'Bookings in October', day: 'Yesterday', messages: [] },
  { id: 'c5', title: 'Draft accelerator application', day: 'Yesterday', messages: [] },
  { id: 'c6', title: 'Cancellation policy tiers', day: 'Previous 7 days', messages: [] },
]

export const suggestions = [
  { icon: 'FileSignature', label: 'Fill an application', prompt: 'Help me fill an accelerator application for Ardena' },
  { icon: 'Presentation', label: 'Pitch deck summary', prompt: 'Summarise our pitch deck' },
  { icon: 'Landmark', label: 'KRA & registration', prompt: 'What are our KRA PIN and company registration number?' },
  { icon: 'CalendarCheck', label: 'Bookings this month', prompt: 'How many bookings do we have this month?' },
]
