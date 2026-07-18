// Media type enum matching the database post_media_type
export type MessageMediaType = 'text' | 'image' | 'video' | 'audio'

export const MESSAGES_UNREAD_CHANGED_EVENT = 'reflab:messages-unread-changed'
export const MESSAGES_OUTBOX_CHANGED_EVENT = 'reflab:messages-outbox-changed'

export type MessageDeliveryState = 'pending' | 'failed'

// User info subset returned by RPC functions
export interface MessageUser {
  id: string
  username: string
  name: string | null
  photo_url: string | null
  is_deleted?: boolean
  is_blocked?: boolean
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  client_id: string
  content: string | null
  media_type: MessageMediaType
  media_url: string | null
  created_at: string
  sender: MessageUser
  delivery_state?: MessageDeliveryState
  delivery_error?: string | null
  outbox_client_id?: string
}

export interface LastMessagePreview {
  id: string
  conversation_id: string
  sender_id: string
  content: string | null
  media_type: MessageMediaType
  media_url: string | null
  created_at: string
}

export interface Conversation {
  id: string
  updated_at: string
  other_user: MessageUser
  last_message: LastMessagePreview | null
  unread_count: number
}

export type UserSearchResult = MessageUser

export interface QueuedMessage {
  clientId: string
  conversationId: string
  senderId: string
  content: string | null
  mediaType: MessageMediaType
  mediaBlob: Blob | null
  mediaName: string | null
  mediaMimeType: string | null
  createdAt: string
  state: 'queued' | 'sending' | 'failed'
  attempts: number
  lastError: string | null
  updatedAt: string
}

