import { describe, expect, it } from 'vitest'
import { normalizeMessageStoragePath } from './useMessageMediaUrl'

const ORIGIN = 'https://project.supabase.co'

describe('normalizeMessageStoragePath', () => {
  it('accepts a safe relative object path', () => {
    expect(normalizeMessageStoragePath('conversation/user/message.webp', ORIGIN))
      .toBe('conversation/user/message.webp')
  })

  it('normalizes an exact first-party Supabase object URL', () => {
    expect(normalizeMessageStoragePath(
      `${ORIGIN}/storage/v1/object/public/message-media/conversation/user/message.webp`,
      ORIGIN,
    )).toBe('conversation/user/message.webp')
  })

  it.each([
    'https://tracker.example/storage/v1/object/public/message-media/conversation/user/message.webp',
    'https://project.supabase.co.evil.example/storage/v1/object/public/message-media/a/b/c',
    'javascript:alert(1)',
    'data:image/png;base64,AAAA',
    'blob:https://project.supabase.co/id',
    '../outside/file.webp',
    'conversation/../outside.webp',
    `${ORIGIN}/storage/v1/object/public/message-media/%E0%A4%A`,
  ])('rejects untrusted or malformed value %s', (value) => {
    expect(normalizeMessageStoragePath(value, ORIGIN)).toBeNull()
  })
})
