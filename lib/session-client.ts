export type StoredAuthUser = {
  id?: string
  email?: string
  name?: string
  role?: string
  firstName?: string
  lastName?: string
}

const KEY_TOKEN = "token"
const KEY_USER = "user"
const KEY_LAST_ACTIVITY = "session:lastActivity"
const KEY_IDLE_TIMEOUT_MS = "session:idleTimeoutMs"

export function getDefaultIdleTimeoutMs(): number {
  const raw = process.env.NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_MINUTES
  const minutes = raw ? Number(raw) : 30
  if (!Number.isFinite(minutes) || minutes <= 0) return 30 * 60 * 1000
  return Math.round(minutes * 60 * 1000)
}

export function touchSessionActivity(now: number = Date.now()): void {
  try {
    localStorage.setItem(KEY_LAST_ACTIVITY, String(now))
  } catch {
    // ignore
  }
}

export function setIdleTimeoutMs(idleTimeoutMs: number): void {
  try {
    localStorage.setItem(KEY_IDLE_TIMEOUT_MS, String(Math.max(1, Math.floor(idleTimeoutMs))))
  } catch {
    // ignore
  }
}

export function clearAuthSession(): void {
  try {
    localStorage.removeItem(KEY_TOKEN)
    localStorage.removeItem(KEY_USER)
    localStorage.removeItem(KEY_LAST_ACTIVITY)
    localStorage.removeItem(KEY_IDLE_TIMEOUT_MS)
  } catch {
    // ignore
  }
}

export function setAuthSession(args: { token: string; user: StoredAuthUser; idleTimeoutMs?: number }): void {
  try {
    localStorage.setItem(KEY_TOKEN, args.token)
    localStorage.setItem(KEY_USER, JSON.stringify(args.user))
    setIdleTimeoutMs(args.idleTimeoutMs ?? getDefaultIdleTimeoutMs())
    touchSessionActivity()
  } catch {
    // ignore
  }
}

export function getAuthToken(): string | null {
  try {
    const t = localStorage.getItem(KEY_TOKEN)
    return t && t.trim() ? t : null
  } catch {
    return null
  }
}

export function getStoredUser(): StoredAuthUser | null {
  try {
    const raw = localStorage.getItem(KEY_USER)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return null
    return parsed as StoredAuthUser
  } catch {
    return null
  }
}

export function getSessionLastActivityMs(): number | null {
  try {
    const raw = localStorage.getItem(KEY_LAST_ACTIVITY)
    const value = raw ? Number(raw) : NaN
    return Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

export function getIdleTimeoutMs(): number {
  try {
    const raw = localStorage.getItem(KEY_IDLE_TIMEOUT_MS)
    const value = raw ? Number(raw) : NaN
    if (Number.isFinite(value) && value > 0) return Math.floor(value)
  } catch {
    // ignore
  }
  return getDefaultIdleTimeoutMs()
}

export function installSessionActivityTracker(opts?: { throttleMs?: number }): () => void {
  const throttleMs = Math.max(250, Math.floor(opts?.throttleMs ?? 15_000))
  let lastWrite = 0

  const handler = () => {
    const now = Date.now()
    if (now - lastWrite < throttleMs) return
    lastWrite = now
    touchSessionActivity(now)
  }

  const events: Array<keyof WindowEventMap> = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"]
  for (const ev of events) {
    window.addEventListener(ev, handler, { passive: true })
  }

  // Touch once on install to avoid immediate logout after refresh.
  handler()

  return () => {
    for (const ev of events) {
      window.removeEventListener(ev, handler)
    }
  }
}

export function installIdleLogout(opts: { onExpire: () => void; pollMs?: number }): () => void {
  const pollMs = Math.max(1000, Math.floor(opts.pollMs ?? 10_000))

  const tick = () => {
    const token = getAuthToken()
    if (!token) return

    const idleTimeoutMs = getIdleTimeoutMs()
    const last = getSessionLastActivityMs()
    if (!last) return

    if (Date.now() - last > idleTimeoutMs) {
      clearAuthSession()
      opts.onExpire()
    }
  }

  const id = window.setInterval(tick, pollMs)
  return () => window.clearInterval(id)
}
