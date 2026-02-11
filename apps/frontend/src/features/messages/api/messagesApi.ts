import { supabase } from '@/lib/supabaseClient'
import type {
  Conversation,
  Message,
  MessageMediaType,
  MessageUser,
  UserSearchResult,
} from '../types'

type MessageRow = Omit<Message, 'sender'>

// ============================================
// Conversations
// ============================================

export async function getConversations(
  userId: string
): Promise<{ data: Conversation[]; error: Error | null }> {
  const { data, error } = await supabase.rpc('get_conversations', {
    p_user_id: userId,
  })

  if (error) return { data: [], error: new Error(error.message) }
  return { data: (data ?? []) as Conversation[], error: null }
}

export async function getOrCreateConversation(
  userId: string,
  otherUserId: string
): Promise<{ data: string | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('get_or_create_conversation', {
    p_user_id: userId,
    p_other_user_id: otherUserId,
  })

  if (error) return { data: null, error: new Error(error.message) }
  return { data: (data ?? null) as string | null, error: null }
}

// ============================================
// Messages
// ============================================

export async function getMessages(
  conversationId: string,
  userId: string,
  cursor: string | null = null,
  limit: number = 50
): Promise<{ data: Message[]; error: Error | null }> {
  const { data, error } = await supabase.rpc('get_messages', {
    p_conversation_id: conversationId,
    p_user_id: userId,
    p_cursor: cursor,
    p_limit: limit,
  })

  if (error) return { data: [], error: new Error(error.message) }
  return { data: (data ?? []) as Message[], error: null }
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string | null,
  mediaType: MessageMediaType = 'text',
  mediaFile?: File
): Promise<{ data: MessageRow | null; error: Error | null }> {
  let mediaUrl: string | null = null
  const trimmedContent = content && content.trim() ? content.trim() : null

  if (mediaFile) {
    const { data: path, error: uploadError } = await uploadMessageMedia(
      senderId,
      mediaFile
    )
    if (uploadError) return { data: null, error: uploadError }
    mediaUrl = path
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: trimmedContent,
      media_type: mediaFile ? mediaType : 'text',
      media_url: mediaFile ? mediaUrl : null,
    })
    .select()
    .single()

  if (error) return { data: null, error: new Error(error.message) }
  return { data: data as MessageRow, error: null }
}

export async function markConversationRead(
  conversationId: string,
  userId: string
): Promise<{ data: true; error: Error | null }> {
  const { error } = await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)

  return { data: true, error: error ? new Error(error.message) : null }
}

export async function getTotalUnreadCount(
  userId: string
): Promise<{ data: number; error: Error | null }> {
  const { data, error } = await supabase.rpc('get_total_unread_count', {
    p_user_id: userId,
  })

  if (error) return { data: 0, error: new Error(error.message) }
  return { data: (data ?? 0) as number, error: null }
}

// ============================================
// User search
// ============================================

export async function searchUsers(
  query: string,
  currentUserId: string,
  limit: number = 10
): Promise<{ data: UserSearchResult[]; error: Error | null }> {
  const { data, error } = await supabase.rpc('search_users', {
    p_query: query,
    p_current_user_id: currentUserId,
    p_limit: limit,
  })

  if (error) return { data: [], error: new Error(error.message) }
  return { data: (data ?? []) as MessageUser[], error: null }
}

// ============================================
// Media
// ============================================

/** Upload a media file to the message-media storage bucket. Returns the storage path. */
export async function uploadMessageMedia(
  userId: string,
  file: File
): Promise<{ data: string | null; error: Error | null }> {
  const extension = file.name.split('.').pop() || 'bin'
  const path = `${userId}/${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage
    .from('message-media')
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) return { data: null, error: new Error(error.message) }
  return { data: path, error: null }
}

/** Get the public URL for a media file stored in the message-media bucket. */
export function getMessageMediaPublicUrl(path: string): string {
  const { data } = supabase.storage.from('message-media').getPublicUrl(path)
  return data.publicUrl
}

