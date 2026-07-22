import type {
  ConversationPeer,
  DeletedMessageUser,
  MessageUser,
} from './types'

export function isDeletedConversationPeer(
  peer: ConversationPeer | null | undefined,
): peer is DeletedMessageUser {
  return peer?.is_deleted === true
}

/**
 * Fail closed for malformed or not-yet-loaded payloads. Historical live-user
 * payloads remain valid because `is_deleted` did not exist before launch.
 */
export function isMessageableConversationPeer(
  peer: ConversationPeer | null | undefined,
): peer is MessageUser {
  return Boolean(
    peer
      && !isDeletedConversationPeer(peer)
      && typeof peer.id === 'string'
      && peer.id.length > 0
      && typeof peer.username === 'string'
      && peer.username.length > 0,
  )
}
