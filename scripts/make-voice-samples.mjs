// One-time: render the five voice samples the Settings page plays.
//   ELEVENLABS_API_KEY_FILE=path/to/key.txt node scripts/make-voice-samples.mjs
// (or ELEVENLABS_API_KEY=...). Writes public/voices/<key>.mp3; commit them.
// Keep the list in step with opabackend app/brain/voices.py.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const key = (process.env.ELEVENLABS_API_KEY || readFileSync(process.env.ELEVENLABS_API_KEY_FILE, 'utf8')).trim()
const VOICES = {
  sarah: ['EXAVITQu4vr4xnSDxMaL', 'Sarah'],
  jessica: ['cgSgspJ2msm6clMCkdW9', 'Jessica'],
  lily: ['pFZP5JQG7iQjIQuC4Bku', 'Lily'],
  brian: ['nPczCjzI2devNBz1zQrb', 'Brian'],
  george: ['JBFqnCBsd6RMkjVDRZzb', 'George'],
}

mkdirSync('public/voices', { recursive: true })
for (const [slug, [id, name]] of Object.entries(VOICES)) {
  const text = `Hi, I'm ${name}. I'm Ardena Brain. Ask me about bookings, our pitch deck, or our KRA details, and I'll answer in this voice.`
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${id}?output_format=mp3_44100_64`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' }),
  })
  if (!res.ok) throw new Error(`${name}: ${res.status} ${await res.text()}`)
  writeFileSync(`public/voices/${slug}.mp3`, Buffer.from(await res.arrayBuffer()))
  console.log(`public/voices/${slug}.mp3`)
}
