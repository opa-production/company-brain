// Renders the voice samples Settings plays, as static files in public/voices/.
// Run once (and again only if the voice list or the sample line changes):
//
//   node scripts/make-voice-samples.mjs                  key from ../opabackend/.env
//   node scripts/make-voice-samples.mjs path/to/key.txt  key from a file
//   ELEVENLABS_API_KEY=... node scripts/make-voice-samples.mjs
//
// Add --force to re-render files that already exist. Commit the mp3s: the UI
// serves them itself, so previews never touch the backend or ElevenLabs.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { VOICES } from '../src/config.js'

const args = process.argv.slice(2)
const force = args.includes('--force')
const keyFile = args.find((a) => !a.startsWith('--')) || process.env.ELEVENLABS_API_KEY_FILE

function findKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY
  if (keyFile) return readFileSync(keyFile, 'utf8')
  for (const f of ['../opabackend/.env', '.env.local', '.env']) {
    if (!existsSync(f)) continue
    const m = /^ELEVENLABS_API_KEY\s*=\s*["']?([^"'\r\n]+)/m.exec(readFileSync(f, 'utf8'))
    if (m) return m[1]
  }
  throw new Error('No ElevenLabs key. Pass a key file, set ELEVENLABS_API_KEY, or add it to ../opabackend/.env.')
}
const key = findKey().trim()

const line = (v) =>
  `Hi, I'm ${v.name}, your Ardena Brain voice. Ask me about bookings, the pitch deck or our KRA details, and I'll answer like this.`

mkdirSync('public/voices', { recursive: true })
for (const v of VOICES) {
  const out = `public/voices/${v.key}.mp3`
  if (existsSync(out) && !force) { console.log(`skip ${out} (exists)`); continue }
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${v.voiceId}?output_format=mp3_44100_64`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({
      text: line(v),
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.8 },
    }),
  })
  if (!res.ok) throw new Error(`${v.name}: ${res.status} ${await res.text()}`)
  writeFileSync(out, Buffer.from(await res.arrayBuffer()))
  console.log(`wrote ${out}`)
}
