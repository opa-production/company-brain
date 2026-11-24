// Client for the Ardena Brain API (opabackend, /api/v1/brain): the only way
// pages talk to the backend.
//
// Base URL comes from VITE_API_BASE_URL, e.g.
//   VITE_API_BASE_URL=https://testing.ardena.xyz/api/v1   (staging)
//   VITE_API_BASE_URL=https://api.ardena.xyz/api/v1       (production)
//
// The Brain token lives in sessionStorage only (gone when the tab closes) and
// is never the admin token: that one is used once, to open the Brain session,
// and dropped.

const BASE = (import.meta.env.VITE_API_BASE_URL || 'https://api.ardena.xyz/api/v1').replace(/\/$/, '')
const TOKEN_KEY = 'ardena-brain-token'

export const hasApi = () => !!import.meta.env.VITE_API_BASE_URL

export class ApiError extends Error {
  constructor(status, detail) {
    super(detail || `Request failed (${status})`)
    this.status = status
    this.detail = detail
  }
}

let onSignedOut = () => {}
export const setSignedOutHandler = (fn) => { onSignedOut = fn }

export const getToken = () => sessionStorage.getItem(TOKEN_KEY)
const setToken = (t) => (t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY))

async function request(path, { method = 'GET', body, form, token, raw } = {}) {
  const headers = {}
  const auth = token ?? getToken()
  if (auth) headers.Authorization = `Bearer ${auth}`
  let payload
  if (form) payload = form
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload })
  if (raw && res.ok) return res
  if (res.status === 204) return null
  let data = null
  try { data = await res.json() } catch { /* empty body */ }
  if (!res.ok) {
    const detail = typeof data?.detail === 'string' ? data.detail : data?.detail?.[0]?.msg
    if (res.status === 401 && !token && path.startsWith('/brain')) {
      setToken(null)
      onSignedOut(detail)
    }
    throw new ApiError(res.status, detail)
  }
  return data
}

// ---------------------------------------------------------------- auth

/** Step 1: email + password. Returns { otp_token, ... }. */
export const login = (email, password) =>
  request('/admin/auth/login', { method: 'POST', body: { email, password }, token: '' })

export const resendCode = (otp_token) =>
  request('/admin/auth/resend-otp', { method: 'POST', body: { otp_token }, token: '' })

/** Step 2: the 6-digit code. Opens the Brain session and returns its user. */
export async function verifyCode(otp_token, code) {
  const admin = await request('/admin/auth/verify-otp', { method: 'POST', body: { otp_token, code }, token: '' })
  const session = await request('/brain/auth/session', { method: 'POST', token: admin.access_token })
  setToken(session.token)
  return session // { token, expires_in, idle_timeout_minutes, user }
}

export async function logout() {
  try { await request('/brain/auth/logout', { method: 'POST' }) } finally { setToken(null) }
}
export const logoutEverywhere = async () => {
  try { return await request('/brain/auth/logout-all', { method: 'POST' }) } finally { setToken(null) }
}
export const me = () => request('/brain/me')

// ---------------------------------------------------------------- knowledge base

export const groups = () => request('/brain/kb/groups')

export function documents({ group, q, kind } = {}) {
  const p = new URLSearchParams()
  if (group && group !== 'all') p.set('group', group)
  if (q) p.set('q', q)
  if (kind) p.set('kind', kind)
  return request(`/brain/kb/documents${p.toString() ? `?${p}` : ''}`)
}

export function uploadDocument(file, group, onProgress) {
  const form = new FormData()
  form.append('file', file)
  if (group) form.append('group', group)
  if (!onProgress) return request('/brain/kb/documents', { method: 'POST', form })

  // XHR rather than fetch: fetch can't report upload progress.
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${BASE}/brain/kb/documents`)
    const auth = getToken()
    if (auth) xhr.setRequestHeader('Authorization', `Bearer ${auth}`)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total)
    xhr.onerror = () => reject(new ApiError(0, 'Network problem. Check your connection.'))
    xhr.onload = () => {
      let data = null
      try { data = JSON.parse(xhr.responseText) } catch { /* empty body */ }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(data)
      const detail = typeof data?.detail === 'string' ? data.detail : data?.detail?.[0]?.msg
      if (xhr.status === 401) { setToken(null); onSignedOut(detail) }
      reject(new ApiError(xhr.status, detail))
    }
    xhr.send(form)
  })
}

export const addLink = (url, group = 'links', title) =>
  request('/brain/kb/links', { method: 'POST', body: { url, group, title } })
export const getDocument = (id) => request(`/brain/kb/documents/${id}`)
export const documentText = (id) => request(`/brain/kb/documents/${id}/text`)
export const downloadLink = (id) => request(`/brain/kb/documents/${id}/download`)
export const retryDocument = (id) => request(`/brain/kb/documents/${id}/retry`, { method: 'POST' })
export const updateDocument = (id, patch) => request(`/brain/kb/documents/${id}`, { method: 'PATCH', body: patch })
export const deleteDocument = (id) => request(`/brain/kb/documents/${id}`, { method: 'DELETE' })

/** Poll a document until it is indexed or failed. Calls onUpdate each time. */
export async function watchDocument(id, onUpdate, { every = 1500, timeout = 180000 } = {}) {
  const until = Date.now() + timeout
  for (;;) {
    const doc = await getDocument(id)
    onUpdate(doc)
    if (doc.status === 'indexed' || doc.status === 'failed' || Date.now() > until) return doc
    await new Promise((r) => setTimeout(r, every))
  }
}

// ---------------------------------------------------------------- facts

export const facts = () => request('/brain/facts')
export const revealFact = (key) => request(`/brain/facts/${key}/reveal`, { method: 'POST' })
export const saveFact = (key, fact) => request(`/brain/facts/${key}`, { method: 'PUT', body: fact })
export const deleteFact = (key) => request(`/brain/facts/${key}`, { method: 'DELETE' })

// ---------------------------------------------------------------- chat

/** Chats, newest first. Archived chats only come back with { archived: true }. */
export const conversations = ({ archived } = {}) => request(`/brain/conversations${archived ? '?archived=true' : ''}`)
export const conversation = (id) => request(`/brain/conversations/${id}`)
export const renameConversation = (id, title) => request(`/brain/conversations/${id}`, { method: 'PATCH', body: { title } })
export const archiveConversation = (id, archived = true) => request(`/brain/conversations/${id}`, { method: 'PATCH', body: { archived } })
export const deleteConversation = (id) => request(`/brain/conversations/${id}`, { method: 'DELETE' })
export const feedback = (messageId, value) => request(`/brain/messages/${messageId}/feedback`, { method: 'POST', body: { value } })

/**
 * Ask Brain. Streams the answer as server-sent events:
 *   onMeta({conversation_id, title, specialist})  first
 *   onStep(label)                                 "Thinking", "Searching Finance & tax", "Reading …", "Writing"
 *   onSources(sources)                            cumulative [{document_id, title, group_name, where}]
 *   onToken(text)
 *   onDone({conversation_id, message_id, steps, sources, out_of_scope})
 *   onError({detail, status})
 * Returns a cancel function (the Stop button).
 */
export function streamChat({ message, conversationId, specialist, mode, spoken = false }, handlers) {
  const ctrl = new AbortController()
  const h = { onMeta() {}, onStep() {}, onSources() {}, onToken() {}, onDone() {}, onError() {}, ...handlers }

  ;(async () => {
    let res
    try {
      res = await fetch(`${BASE}/brain/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ message, conversation_id: conversationId ?? null, specialist: specialist ?? null, mode: mode || 'fast', spoken: !!spoken }),
        signal: ctrl.signal,
      })
    } catch (e) {
      if (e.name !== 'AbortError') h.onError({ detail: "Couldn't reach Brain. Check your connection.", status: 0 })
      return
    }
    if (!res.ok) {
      let detail
      try { detail = (await res.json()).detail } catch { /* */ }
      if (res.status === 401) { setToken(null); onSignedOut(detail) }
      h.onError({ detail: detail || 'Brain could not answer that.', status: res.status })
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    try {
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let cut
        while ((cut = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, cut)
          buffer = buffer.slice(cut + 2)
          if (frame.startsWith(':')) continue // heartbeat
          const ev = /^event: (.*)$/m.exec(frame)?.[1]
          const data = /^data: (.*)$/m.exec(frame)?.[1]
          if (!ev || !data) continue
          const p = JSON.parse(data)
          if (ev === 'meta') h.onMeta(p)
          else if (ev === 'status') h.onStep(p.label)
          else if (ev === 'sources') h.onSources(p.sources)
          else if (ev === 'token') h.onToken(p.text)
          else if (ev === 'done') h.onDone(p)
          else if (ev === 'error') h.onError(p)
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') h.onError({ detail: 'The answer was cut off. Try again.', status: 0 })
    }
  })()

  return () => ctrl.abort()
}

// ---------------------------------------------------------------- voice

export function transcribe(blob) {
  const form = new FormData()
  form.append('audio', blob, 'voice.webm')
  return request('/brain/voice/transcribe', { method: 'POST', form })
}

/** Returns an object URL for an mp3 of `text`; revoke it after playing. */
export async function speak(text, voice) {
  const res = await request('/brain/voice/speak', { method: 'POST', body: { text, voice: voice || null }, raw: true })
  return URL.createObjectURL(await res.blob())
}

// ---------------------------------------------------------------- super admin

export const auditLog = (params = {}) => request(`/brain/audit?${new URLSearchParams(params)}`)
