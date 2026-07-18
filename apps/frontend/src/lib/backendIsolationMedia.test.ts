import { describe, expect, it, vi } from 'vitest'

const PREVIEW_ORIGIN = 'https://preview-backend-disabled.invalid'
const PRODUCTION_ORIGIN = 'https://iqebkyjcoqggwhausgje.supabase.co'
const OWNER = '486d2f31-f7b8-4d8f-a8e0-8247fe543210'
const PROFILE_PATH = `${OWNER}/avatars/avatar.webp`

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {},
  supabaseBrowserConfiguration: {
    url: 'https://preview-backend-disabled.invalid',
    anonKey: 'preview-backend-disabled',
    productionBackendIsolated: true,
    authStorageKey: 'sb-preview-disabled-auth-token',
  },
}))

import { resolveProfilePhotoUrl } from '@/features/auth/utils/profilePhotoUrl'
import { normalizeMessageStoragePath } from '@/features/messages/hooks/useMessageMediaUrl'

describe('resolved backend origin for stored media', () => {
  it('does not resolve a production profile URL in an isolated preview', () => {
    expect(resolveProfilePhotoUrl(
      `${PRODUCTION_ORIGIN}/storage/v1/object/public/profile-media/${PROFILE_PATH}`,
      OWNER,
    )).toBeNull()
    expect(resolveProfilePhotoUrl(PROFILE_PATH, OWNER)).toBe(
      `${PREVIEW_ORIGIN}/storage/v1/object/public/profile-media/${PROFILE_PATH}`,
    )
  })

  it('does not normalize a production message-media URL in an isolated preview', () => {
    const path = 'conversation/sender/message.webp'
    expect(normalizeMessageStoragePath(
      `${PRODUCTION_ORIGIN}/storage/v1/object/authenticated/message-media/${path}`,
    )).toBeNull()
    expect(normalizeMessageStoragePath(
      `${PREVIEW_ORIGIN}/storage/v1/object/authenticated/message-media/${path}`,
    )).toBe(path)
  })
})
