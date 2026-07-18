import { describe, expect, it } from 'vitest'
import {
  resolveAuthProviderAvatarUrl,
  resolveProfilePhotoUrl,
} from './profilePhotoUrl'

const ORIGIN = 'https://project.supabase.co'
const OWNER = '486d2f31-f7b8-4d8f-a8e0-8247fe543210'
const PATH = `${OWNER}/avatars/821848c0-7842-49a5-9631-0123456789ab.webp`

describe('resolveProfilePhotoUrl', () => {
  it('resolves an owned relative path to the configured first-party bucket', () => {
    expect(resolveProfilePhotoUrl(PATH, OWNER, ORIGIN)).toBe(
      `${ORIGIN}/storage/v1/object/public/profile-media/${PATH}`,
    )
  })

  it('normalizes a matching historical first-party URL', () => {
    expect(resolveProfilePhotoUrl(
      `${ORIGIN}/storage/v1/object/public/profile-media/${PATH}?ignored=1`,
      OWNER,
      ORIGIN,
    )).toBe(`${ORIGIN}/storage/v1/object/public/profile-media/${PATH}`)
  })

  it.each([
    [`https://tracker.example/storage/v1/object/public/profile-media/${PATH}`, OWNER],
    [`https://project.supabase.co.evil.example/storage/v1/object/public/profile-media/${PATH}`, OWNER],
    [PATH, '386d2f31-f7b8-4d8f-a8e0-8247fe543210'],
    [`${OWNER}/avatars/../secret.webp`, OWNER],
    ['javascript:alert(1)', OWNER],
    ['data:text/html;base64,PGgxPkV2aWw8L2gxPg==', OWNER],
  ])('rejects untrusted or non-owned value %s', (value, owner) => {
    expect(resolveProfilePhotoUrl(value, owner, ORIGIN)).toBeNull()
  })
})

describe('resolveAuthProviderAvatarUrl', () => {
  it('accepts the configured Google identity image host', () => {
    expect(resolveAuthProviderAvatarUrl('https://lh3.googleusercontent.com/a/example=s96-c'))
      .toBe('https://lh3.googleusercontent.com/a/example=s96-c')
  })

  it.each([
    'https://googleusercontent.com.evil.example/avatar',
    'http://lh3.googleusercontent.com/avatar',
    'https://user@lh3.googleusercontent.com/avatar',
    'https://example.com/avatar',
  ])('rejects non-provider URL %s', (value) => {
    expect(resolveAuthProviderAvatarUrl(value)).toBeNull()
  })
})
