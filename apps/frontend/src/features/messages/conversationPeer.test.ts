import { describe, expect, it } from 'vitest'
import {
  isDeletedConversationPeer,
  isMessageableConversationPeer,
} from './conversationPeer'
import type { ConversationPeer } from './types'

describe('conversation peer compatibility', () => {
  it('accepts the historical live-user payload without is_deleted', () => {
    const peer: ConversationPeer = {
      id: 'user-2',
      username: 'referee',
      name: 'Referee',
      photo_url: null,
    }

    expect(isDeletedConversationPeer(peer)).toBe(false)
    expect(isMessageableConversationPeer(peer)).toBe(true)
  })

  it('recognises the launch deleted-account sentinel and blocks messaging', () => {
    const peer: ConversationPeer = {
      id: null,
      username: null,
      name: null,
      photo_url: null,
      is_deleted: true,
    }

    expect(isDeletedConversationPeer(peer)).toBe(true)
    expect(isMessageableConversationPeer(peer)).toBe(false)
  })

  it('fails closed while peer data is missing', () => {
    expect(isMessageableConversationPeer(null)).toBe(false)
    expect(isMessageableConversationPeer(undefined)).toBe(false)
  })
})
