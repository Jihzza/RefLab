import { supabaseBrowserConfiguration } from '@/lib/supabaseClient'

const PROFILE_MEDIA_PUBLIC_PREFIX = '/storage/v1/object/public/profile-media/'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const OBJECT_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,255}$/
const MAX_STORED_VALUE_LENGTH = 2048

function configuredSupabaseOrigin(): string | null {
  try {
    return new URL(supabaseBrowserConfiguration.url).origin
  } catch {
    return null
  }
}

function normalizeOwnedPath(value: string, expectedOwnerId?: string): string | null {
  if (!value || value.length > 1024 || value.includes('\\')) return null

  let decoded: string
  try {
    decoded = decodeURIComponent(value)
  } catch {
    return null
  }

  const segments = decoded.split('/')
  if (
    segments.length !== 3
    || !UUID_PATTERN.test(segments[0])
    || segments[1] !== 'avatars'
    || !OBJECT_NAME_PATTERN.test(segments[2])
  ) {
    return null
  }

  if (expectedOwnerId && segments[0].toLowerCase() !== expectedOwnerId.toLowerCase()) {
    return null
  }

  return segments.join('/')
}

export function normalizeProfilePhotoStoragePath(
  value: string | null | undefined,
  expectedOwnerId?: string,
  supabaseOrigin: string | null = configuredSupabaseOrigin(),
): string | null {
  if (!value || value.length > MAX_STORED_VALUE_LENGTH) return null

  if (!/^[a-z][a-z\d+.-]*:/i.test(value)) {
    return normalizeOwnedPath(value, expectedOwnerId)
  }

  try {
    const parsed = new URL(value)
    if (
      !supabaseOrigin
      || parsed.origin !== supabaseOrigin
      || parsed.username
      || parsed.password
      || !parsed.pathname.startsWith(PROFILE_MEDIA_PUBLIC_PREFIX)
    ) {
      return null
    }

    return normalizeOwnedPath(
      parsed.pathname.slice(PROFILE_MEDIA_PUBLIC_PREFIX.length),
      expectedOwnerId,
    )
  } catch {
    return null
  }
}

/**
 * Resolve only owner-scoped RefLab profile-media values. Historical external
 * URLs deliberately fail closed so viewing another profile cannot trigger a
 * third-party tracking request.
 */
export function resolveProfilePhotoUrl(
  value: string | null | undefined,
  expectedOwnerId?: string,
  supabaseOrigin: string | null = configuredSupabaseOrigin(),
): string | null {
  if (!value || value.length > MAX_STORED_VALUE_LENGTH) return null

  // Local edit previews and deterministic visual-lab fixtures never leave the
  // device. SVG data fixtures are limited to development builds.
  if (value.startsWith('blob:')) return value
  if (/^data:image\/(?:png|jpeg|gif|webp);base64,/i.test(value)) return value
  if (import.meta.env.DEV && value.startsWith('data:image/svg+xml')) return value

  const path = normalizeProfilePhotoStoragePath(
    value,
    expectedOwnerId,
    supabaseOrigin,
  )

  if (!path || !supabaseOrigin) return null
  const encodedPath = path.split('/').map(encodeURIComponent).join('/')
  return new URL(`${PROFILE_MEDIA_PUBLIC_PREFIX}${encodedPath}`, supabaseOrigin).toString()
}

/** Google is the only configured OAuth provider. Use this only for the signed-
 * in user's own provider metadata; never for profile rows returned to peers. */
export function resolveAuthProviderAvatarUrl(
  value: string | null | undefined,
): string | null {
  if (!value || value.length > MAX_STORED_VALUE_LENGTH) return null

  try {
    const parsed = new URL(value)
    const hostname = parsed.hostname.toLowerCase()
    if (
      parsed.protocol !== 'https:'
      || parsed.username
      || parsed.password
      || parsed.port
      || !(hostname === 'googleusercontent.com' || hostname.endsWith('.googleusercontent.com'))
    ) {
      return null
    }
    return parsed.toString()
  } catch {
    return null
  }
}
