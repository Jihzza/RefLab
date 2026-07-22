// Media type enum matching the database post_media_type
export type MessageMediaType = 'text' | 'image' | 'video' | 'audio'

// User info subset returned by RPC functions
export interface MessageUser {
  id: string
  username: string
  name: string | null
  photo_url: string | null
  // Older RPC payloads omit this field. Keeping it optional preserves
  // compatibility while the launch migration rolls out.
  is_deleted?: false
}

export interface DeletedMessageUser {
  id: null
  username: null
  name: null
  photo_url: null
  is_deleted: true
}

export type ConversationPeer = MessageUser | DeletedMessageUser

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string | null
  media_type: MessageMediaType
  media_url: string | null
  created_at: string
  sender: MessageUser
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
  other_user: ConversationPeer
  last_message: LastMessagePreview | null
  unread_count: number
}

export type UserSearchResult = MessageUser

