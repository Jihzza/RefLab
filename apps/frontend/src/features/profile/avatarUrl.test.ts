import { describe, expect, it } from 'vitest'
import { getSafeRemoteAvatarUrl } from './avatarUrl'

describe('getSafeRemoteAvatarUrl', () => {
  it('accepts HTTPS avatars from the configured storage and OAuth providers', () => {
    expect(
      getSafeRemoteAvatarUrl(
        'https://iqebkyjcoqggwhausgje.supabase.co/storage/v1/object/public/profile-media/avatar.png'
      )
    ).toContain('iqebkyjcoqggwhausgje.supabase.co')
    expect(getSafeRemoteAvatarUrl('https://lh3.googleusercontent.com/avatar')).toBe(
      'https://lh3.googleusercontent.com/avatar'
    )
  })

  it('rejects active, insecure, malformed, and untrusted avatar sources', () => {
    expect(getSafeRemoteAvatarUrl('javascript:alert(1)')).toBeNull()
    expect(getSafeRemoteAvatarUrl('data:image/svg+xml,<svg onload=alert(1)>')).toBeNull()
    expect(getSafeRemoteAvatarUrl('http://lh3.googleusercontent.com/avatar')).toBeNull()
    expect(getSafeRemoteAvatarUrl('https://googleusercontent.com.example.test/avatar')).toBeNull()
    expect(getSafeRemoteAvatarUrl('not a URL')).toBeNull()
  })
})
