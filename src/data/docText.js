// Mock "extracted text" for seeded documents: what Brain reads after
// ingestion, page by page. Real version: GET /brain/kb/documents/{id}/chunks.

const SPECIFIC = {
  d1: [
    { heading: 'Ardena Ltd — Company profile 2026', text: 'Ardena is the car-rental platform for Africa. We run a marketplace where renters book cars from trusted hosts, and Ardena Business, an operating system for rental fleets.\n\nHeadquarters: Nairobi, Kenya. Founded: January 2026. Team: 14 people across product, operations, sales and finance.' },
    { heading: 'What we do', text: 'Renters book self-drive cars, chauffeurs and airport transfers in the Ardena app. They pay by M-Pesa, card or USDC, and deposits are held in escrow until the trip ends.\n\nHosts and fleet operators list their cars, manage bookings, walk-ins, payments and damage claims from one dashboard.' },
    { heading: 'Traction', text: 'Bookings grew 18% month on month through Q4 2026. More than 400 vehicles are listed across Nairobi, Mombasa and Kisumu, and 60+ fleet operators use Ardena Business.' },
    { heading: 'Contact', text: 'info@ardena.co.ke · https://ardena.co.ke\nRegistered office: Nairobi, Kenya (mock).' },
  ],
  d14: [
    { heading: 'Kenya Revenue Authority — PIN Certificate', text: 'This is to certify that the taxpayer shown herein has been registered with the Kenya Revenue Authority.\n\nTaxpayer name: ARDENA LTD\nPersonal Identification Number: P05XXXXXXXXZ\nRegistration date: 15/01/2026\nTax obligations: Income Tax – Company, VAT, PAYE\n\n(Mock document.)' },
  ],
  d18: [
    { heading: 'Cancellation policy', text: 'Renters can cancel any booking from the app. Refunds depend on how far ahead of pickup the cancellation is made.' },
    { heading: 'Refund tiers', text: '• More than 48 hours before pickup: full refund.\n• 24–48 hours before pickup: 50% refund.\n• Less than 24 hours before pickup: no refund, deposit returned in full.\n\nHosts who cancel a confirmed booking pay a KES 1,000 penalty and lose search ranking for 7 days.' },
  ],
  d8: [
    { heading: 'Slide 1 — Ardena', text: 'The car-rental platform for Africa.' },
    { heading: 'Slide 2 — Problem', text: 'Renting a car in Kenya runs on WhatsApp, cash deposits and trust. Renters can’t compare, hosts can’t get paid reliably, and nobody is insured properly.' },
    { heading: 'Slide 3 — Solution', text: 'A marketplace for renters and hosts, plus Ardena Business: bookings, payments, escrowed deposits and damage waivers in one place.' },
    { heading: 'Slide 7 — Traction', text: '1,284 bookings in November (+18% MoM). 400+ vehicles. 60+ fleet operators on Ardena Business. (Mock figures.)' },
  ],
}

const BY_GROUP = {
  company: ['Overview', 'Details', 'Notes'],
  legal: ['Certificate details', 'Terms and conditions', 'Signatures'],
  pitch: ['Summary', 'Key numbers', 'Appendix'],
  applications: ['Background', 'Answers', 'Supporting information'],
  finance: ['Statement', 'Figures', 'Notes'],
  product: ['Purpose', 'Process', 'Exceptions'],
  brand: ['Logo', 'Colour and type', 'Tone of voice'],
}

export function docPages(doc) {
  if (SPECIFIC[doc.id]) return SPECIFIC[doc.id]
  const name = doc.title.replace(/\.[a-z0-9]+$/i, '')
  const heads = BY_GROUP[doc.group] || ['Page 1', 'Page 2']
  return heads.map((h, i) => ({
    heading: i === 0 ? name : h,
    text:
      i === 0
        ? `${name}. This is the text Brain extracted from the document and split into searchable passages. Answers that use this document cite the page they came from.`
        : `${h}: placeholder text for the UI preview. Once the backend is connected, this shows the real extracted text of “${doc.title}”, page by page.`,
  }))
}
