// Simulates one Brain turn the way the real SSE stream will deliver it:
// a few `status` events (the "Thinking… / Searching…" labels), then
// `sources`, then `token`s, then `done`. Replace with an EventSource /
// fetch-stream reader against POST /brain/conversations/{id}/stream.

const COOKING = ['Cooking', 'Connecting the dots', 'Noodling', 'Brewing an answer']

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

const RESPONSES = [
  {
    match: /\b(kra|pin|tax|tcc|vat)\b/i,
    steps: ['Thinking', 'Searching Finance & tax', 'Reading KRA PIN certificate.pdf', '%cook'],
    sources: [
      { title: 'KRA PIN certificate.pdf', group: 'Finance & tax', where: 'page 1' },
      { title: 'Tax compliance certificate 2026.pdf', group: 'Finance & tax', where: 'page 1' },
    ],
    answer: `Here are Ardena's tax details:

- **KRA PIN:** P05XXXXXXXXZ
- **Tax compliance certificate:** valid until 31 Mar 2027
- **Registered name on the PIN:** Ardena Ltd

Most tender and grant forms ask for the TCC alongside the PIN. Both certificates are in **Finance & tax**, and I can attach them to your draft.

_Mock data: real values arrive once the Finance documents are uploaded._`,
  },
  {
    match: /\b(reg(istration)?|incorporat\w*|cr12|company number|directors?)\b/i,
    steps: ['Thinking', 'Searching Legal & compliance', 'Reading CR12 — October 2026.pdf', '%cook'],
    sources: [
      { title: 'Certificate of incorporation.pdf', group: 'Legal & compliance', where: 'page 1' },
      { title: 'CR12 — October 2026.pdf', group: 'Legal & compliance', where: 'page 2' },
    ],
    answer: `From our incorporation documents:

- **Registered name:** Ardena Ltd
- **Registration number:** PVT-XXXXXXXX
- **Incorporated:** 15 Jan 2026
- **Latest CR12:** October 2026 (directors and shareholding)

A CR12 is usually only accepted if it's under 6 months old, so the October copy is good until April 2027.`,
  },
  {
    match: /\b(pitch|deck|investor|traction|raise|fundrais\w*)\b/i,
    steps: ['Thinking', 'Opening Ardena pitch deck — Nov 2026.pptx', 'Reading 24 slides', '%cook'],
    sources: [
      { title: 'Ardena pitch deck — Nov 2026.pptx', group: 'Pitch & investors', where: 'slides 2–9' },
      { title: 'One-pager.pdf', group: 'Pitch & investors', where: 'page 1' },
    ],
    answer: `**Ardena pitch deck (Nov 2026): the short version**

1. **Problem:** renting a car in Kenya runs on WhatsApp, cash deposits and trust.
2. **Solution:** a marketplace app for renters and hosts, plus Ardena Business, an operating system for rental fleets.
3. **Product:** bookings, payments (M-Pesa, card, USDC), deposits held in Stellar escrow, damage waivers, chauffeurs and airport transfers.
4. **Traction:** see slide 7 for the latest bookings, GMV and fleet numbers.
5. **Business model:** booking commission, Fleet plan subscriptions and waiver fees.
6. **Ask:** see slide 9 for the raise and use of funds.

Want this rewritten as a 150-word answer for an application form?`,
  },
  {
    match: /\b(bookings?|trips?|gmv|revenue)\b/i,
    steps: ['Thinking', 'Querying live bookings', '%cook'],
    sources: [{ title: 'Live data · bookings', group: 'Ardena backend', where: 'Nov 1–24, 2026' }],
    answer: `**Bookings this month (1–24 Nov 2026)**

- **Total bookings:** 1,284 (+18% on the same days in October)
- **Completed trips:** 1,032
- **Cancelled:** 71 (5.5%)
- **Ardena Business walk-ins:** 402
- **Busiest day:** Fri 21 Nov (96 bookings)

_Mock figures: once the backend is connected these come live from the bookings table._`,
  },
  {
    match: /\b(appl(y|ication)|grant|accelerator|form|tender)\b/i,
    steps: ['Thinking', 'Searching Applications & grants', 'Reading Accelerator application answers.docx', 'Pulling company facts', '%cook'],
    sources: [
      { title: 'Accelerator application answers.docx', group: 'Applications & grants', where: 'Q1–Q12' },
      { title: 'Company profile 2026.pdf', group: 'Company docs', where: 'pages 1–3' },
      { title: 'Certificate of incorporation.pdf', group: 'Legal & compliance', where: 'page 1' },
    ],
    answer: `I can fill most of it from what we already have. Here are the usual fields:

- **Company name:** Ardena Ltd
- **Registration number:** PVT-XXXXXXXX
- **Country:** Kenya
- **Website:** https://ardena.co.ke
- **One-line description:** Ardena is the car-rental platform for Africa: a marketplace for renters and hosts, and an operating system for rental fleets.
- **Stage:** live, with paying customers
- **Problem / solution / traction:** taken from the pitch deck, slides 2–7

Paste the form's questions here and I'll draft each answer within its word limit, citing where every fact came from.`,
  },
  {
    match: /\b(stellar|escrow|waiver|usdc|instawards)\b/i,
    steps: ['Thinking', 'Searching Applications & grants', 'Reading Stellar deliverables report.docx', '%cook'],
    sources: [
      { title: 'Stellar deliverables report.docx', group: 'Applications & grants', where: 'sections 1–6' },
      { title: 'Escrow contracts (GitHub)', group: 'Links', where: 'README' },
    ],
    answer: `**Stellar Instawards Round 2: status**

- **D1 Deposit escrow (B2B + B2C):** built, running on testnet
- **D2 Damage-waiver micro-fee + approval console:** built, running on testnet
- **D3 Reconciliation and monitoring:** complete; the latest run checked 14 records and found 0 mismatches

Mainnet is pending a security audit of the contracts, so the 50+ escrowed bookings and 50+ waiver fee targets are next. The closeout was submitted as **Mostly completed**.`,
  },
]

const FALLBACK = {
  steps: ['Thinking', 'Searching the knowledge base', '%cook'],
  sources: [{ title: 'Company profile 2026.pdf', group: 'Company docs', where: 'page 1' }],
  answer: `I'm Ardena Brain. I know what's in our knowledge base and can look at live numbers from the backend.

Try asking me to:
- **Fill an application:** company details, the problem, traction, team
- **Find a fact:** KRA PIN, registration number, TCC expiry, ODPC
- **Summarise a document:** pitch deck, SOW, policies
- **Pull numbers:** bookings, fleet size, Ardena Business workspaces

_This is the UI preview, so answers come from mock data._`,
}

// Specialist-only answers, checked before the shared ones. Each specialist
// also has its own fallback so even an unknown question gets a
// department-flavoured reply.
const SPECIALIST = {
  finance: {
    label: 'Finance & tax',
    responses: [
      {
        match: /\b(burn|runway|cash|budget|spend|expenses?)\b/i,
        steps: ['Thinking as Finance', 'Opening Financial model FY27.xlsx', 'Checking bank balances', '%cook'],
        sources: [
          { title: 'Financial model FY27.xlsx', group: 'Pitch & investors', where: 'Cashflow tab' },
          { title: 'Live data · payments', group: 'Ardena backend', where: 'Oct 2026' },
        ],
        answer: `**Burn and runway (as of 24 Nov 2026)**

- **Net monthly burn:** KES 1.9M (3-month average)
- **Cash in bank:** KES 21.4M
- **Runway:** about **11 months** at current burn
- **Biggest cost lines:** payroll 58%, cloud & tools 14%, marketing 12%

If October's revenue growth (+18%) holds, runway stretches to roughly 14 months. Want a best / base / worst case table?

_Mock figures: real values come from the financial model and bank feeds._`,
      },
      {
        match: /\b(p&l|pnl|profit|loss|margin|income statement)\b/i,
        steps: ['Thinking as Finance', 'Reading Financial model FY27.xlsx', 'Matching live payments', '%cook'],
        sources: [{ title: 'Financial model FY27.xlsx', group: 'Pitch & investors', where: 'P&L tab, Oct' }],
        answer: `**P&L: October 2026**

- **Revenue:** 4.82M (commissions 3.1M, Fleet plans 1.2M, waivers 0.52M)
- **Cost of revenue:** 1.06M (payments fees, insurance)
- **Gross margin:** 78%
- **Operating expenses:** 5.66M
- **Net loss:** (1.90M)

Gross margin improved 3 points on September thanks to more Fleet plan revenue.`,
      },
      {
        match: /\b(invoices?|unpaid|receivables?|owed)\b/i,
        steps: ['Thinking as Finance', 'Querying invoices', '%cook'],
        sources: [{ title: 'Live data · invoices', group: 'Ardena backend', where: 'open invoices' }],
        answer: `**Unpaid invoices: 4 open, KES 612,400 total**

- **Savannah Car Hire:** KES 240,000, 18 days overdue
- **Kilele Tours:** KES 186,400, due in 3 days
- **Pwani Rentals:** KES 121,000, 6 days overdue
- **Nairobi Executive Cars:** KES 65,000, due in 12 days

I can draft polite reminders for the two overdue ones.`,
      },
    ],
    fallback: `As your **Finance specialist** I look at Finance & tax and the financial model first, and answer in numbers.

I can help with:
- **Cash:** burn, runway, bank balances
- **Reporting:** monthly P&L, revenue by product, margins
- **Compliance:** KRA PIN, TCC, VAT and filing dates
- **Receivables:** unpaid invoices and reminders

_UI preview: figures are mock data._`,
  },
  sales: {
    label: 'Product & operations',
    responses: [
      {
        match: /\b(pipeline|leads?|deals?|prospects?|quota)\b/i,
        steps: ['Thinking as Sales', 'Querying CRM pipeline', '%cook'],
        sources: [{ title: 'Live data · Ardena Business sign-ups', group: 'Ardena backend', where: 'Nov 2026' }],
        answer: `**Sales pipeline: November 2026**

- **New leads:** 46 fleet operators (31 inbound, 15 outbound)
- **Demo booked:** 18
- **Trial running:** 9 workspaces
- **Won:** 6 Fleet plans (KES 540K ARR)
- **Win rate (trial → paid):** 40%

Hottest deals: **Kilele Tours** (32 cars) and **Pwani Rentals** (14 cars), both on day 10 of the trial.`,
      },
      {
        match: /\b(proposal|pitch|offer|quote)\b/i,
        steps: ['Thinking as Sales', 'Reading Ardena pitch deck — Nov 2026.pptx', 'Pulling Fleet plan pricing', '%cook'],
        sources: [
          { title: 'Ardena pitch deck — Nov 2026.pptx', group: 'Pitch & investors', where: 'slides 4–6' },
          { title: 'Booking flow — ops manual.docx', group: 'Product & operations', where: 'section 2' },
        ],
        answer: `**Draft proposal: Ardena Business Fleet plan (20 cars)**

**Why Ardena:** one dashboard for bookings, payments, deposits and damage claims, with listings on the Ardena marketplace.

- **Plan:** Fleet, 20 vehicles
- **Price:** KES 45,000 / month (KES 2,250 per car)
- **Included:** M-Pesa + card payments, escrowed deposits, damage waivers, walk-in bookings
- **Onboarding:** 1 week, free
- **Trial:** 14 days, no card needed

Want me to adapt the tone for a specific client?`,
      },
      {
        match: /\b(pric(e|es|ing)|plans?|cost)\b/i,
        steps: ['Thinking as Sales', 'Searching Product & operations', '%cook'],
        sources: [{ title: 'Company profile 2026.pdf', group: 'Company docs', where: 'page 4' }],
        answer: `**Ardena Business pricing**

- **Starter:** free up to 3 cars, 8% commission on marketplace bookings
- **Fleet:** KES 2,250 per car / month, 5% commission
- **Enterprise:** custom, for 50+ cars, dedicated support

Annual billing gets two months free. Damage waivers are charged to the renter, not the host.`,
      },
    ],
    fallback: `As your **Sales specialist** I focus on clients, pipeline and pricing, and I write in a customer-ready voice.

I can help with:
- **Pipeline:** leads, trials, won deals
- **Proposals:** tailored offers for fleet operators
- **Pricing:** plans, discounts, comparisons
- **Clients:** history and bookings for any account

_UI preview: figures are mock data._`,
  },
  marketing: {
    label: 'Brand',
    responses: [
      {
        match: /\b(campaigns?|ideas?|holiday|december|launch)\b/i,
        steps: ['Thinking as Marketing', 'Reading Brand guidelines.pdf', 'Checking last season’s bookings', '%cook'],
        sources: [
          { title: 'Brand guidelines.pdf', group: 'Brand', where: 'pages 8–12' },
          { title: 'Live data · bookings', group: 'Ardena backend', where: 'Dec 2025' },
        ],
        answer: `**December campaign ideas**

1. **"Home for the holidays":** upcountry road-trip bundles, 3+ day rentals get a free second driver.
2. **Airport transfers, sorted:** JKIA pickups for diaspora arrivals, booked before they land.
3. **Coast escape:** Mombasa and Diani one-way rentals with hosts on the coast.
4. **Gift a ride:** shareable voucher codes for family visits.

Last December bookings peaked 20–24 Dec, so start ads by 5 Dec.`,
      },
      {
        match: /\b(posts?|social|instagram|tiktok|twitter|x|content|caption|write)\b/i,
        steps: ['Thinking as Marketing', 'Reading Brand guidelines.pdf · tone of voice', '%cook'],
        sources: [{ title: 'Brand guidelines.pdf', group: 'Brand', where: 'page 10 · voice' }],
        answer: `Three posts in the Ardena voice (calm, clear, no hype):

1. **Landing at JKIA?** Your car's already waiting. Book an Ardena airport transfer before you fly.
2. **No queues. No cash deposits.** Pick up at the arrivals hall and go. Airport transfers on Ardena.
3. **Late flight? We track it.** Your driver adjusts, you don't pay extra. Book in the app.

Suggested visual: monochrome photo of arrivals at night, white logo bottom-left.`,
      },
      {
        match: /\b(brand|tone|voice|guidelines?|logo|colou?rs?)\b/i,
        steps: ['Thinking as Marketing', 'Reading Brand guidelines.pdf', '%cook'],
        sources: [{ title: 'Brand guidelines.pdf', group: 'Brand', where: 'pages 4–10' }],
        answer: `**Ardena brand, in short**

- **Colours:** ink (#1F1F21) and white. No accent colours.
- **Logo:** the circle-and-arc mark plus wordmark; keep clear space of one mark height.
- **Tone:** calm, plain, confident. Short sentences. No exclamation marks.
- **Say:** "book", "host", "trip". **Avoid:** "hire", "cheap", "deal".`,
      },
    ],
    fallback: `As your **Marketing specialist** I lean on Brand guidelines and the pitch deck, and write in the Ardena voice.

I can help with:
- **Campaigns:** seasonal ideas and timing from past bookings
- **Content:** social posts, emails, landing-page copy
- **Brand:** tone of voice, logo use, colours
- **Audience:** who books, when and why

_UI preview: answers are mock data._`,
  },
}

const MODE_STEPS = {
  fast: [],
  reason: ['Breaking the question down', 'Checking the reasoning'],
  deep: ['Reading 12 more related documents', 'Cross-checking sources'],
}

export function runMockTurn(prompt, { onStep, onSources, onToken, onDone }, { specialist, mode } = {}) {
  const sp = SPECIALIST[specialist]
  let r = (sp && sp.responses.find((x) => x.match.test(prompt))) || RESPONSES.find((x) => x.match.test(prompt))
  if (!r) r = sp ? { steps: [`Thinking as ${specialist[0].toUpperCase()}${specialist.slice(1)}`, `Searching ${sp.label} first`, '%cook'], sources: [], answer: sp.fallback } : FALLBACK
  else if (sp && !r.steps[0].startsWith('Thinking as')) r = { ...r, steps: [`Thinking as ${specialist[0].toUpperCase()}${specialist.slice(1)}`, ...r.steps.slice(1)] }
  const extra = MODE_STEPS[mode] || []
  if (extra.length) r = { ...r, steps: [...r.steps.slice(0, -1), ...extra, r.steps[r.steps.length - 1]] }
  const timers = []
  let streamTimer = null
  let t = 300

  r.steps.forEach((label) => {
    const shown = label === '%cook' ? pick(COOKING) : label
    timers.push(setTimeout(() => onStep(shown), t))
    t += 850 + Math.random() * 650
  })

  timers.push(
    setTimeout(() => {
      onSources(r.sources)
      const parts = r.answer.split(/(\s+)/)
      let i = 0
      streamTimer = setInterval(() => {
        const n = 2 + Math.floor(Math.random() * 4)
        onToken(parts.slice(i, i + n).join(''))
        i += n
        if (i >= parts.length) {
          clearInterval(streamTimer)
          onDone()
        }
      }, 28)
    }, t),
  )

  return () => {
    timers.forEach(clearTimeout)
    if (streamTimer) clearInterval(streamTimer)
  }
}

export const voiceScript = [
  { who: 'you', text: "What's our KRA PIN?" },
  { who: 'brain', text: 'Our KRA PIN is P zero five, X X X X X X X X, Z. The tax compliance certificate is valid until the end of March 2027.' },
]
