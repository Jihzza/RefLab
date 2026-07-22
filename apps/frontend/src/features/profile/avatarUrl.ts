const ALLOWED_REMOTE_AVATAR_HOSTS = ['supabase.co', 'googleusercontent.com']

export function getSafeRemoteAvatarUrl(value: string | null | undefined): string | null {
  if (!value) return null

  try {
    const parsed = new URL(value)
    const hasAllowedHost = ALLOWED_REMOTE_AVATAR_HOSTS.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
    )

    if (parsed.protocol !== 'https:' || !hasAllowedHost) return null
    return parsed.href
  } catch {
    return null
  }
}
