import { supabase } from '@/lib/supabaseClient'
import type {
  Conversation,
  Message,
  MessageMediaType,
  MessageUser,
  UserSearchResult,
} from '../types'
import { MessageApiError } from '../messageErrors'

type MessageRow = Omit<Message, 'sender'>

const MESSAGE_MEDIA_BUCKET = 'message-media'
const MESSAGE_MEDIA_SIGNED_URL_TTL_SECONDS = 15 * 60
const MESSAGE_MEDIA_MAX_BYTES = 50 * 1024 * 1024
const MESSAGE_MAX_LENGTH = 5000
const MESSAGE_MEDIA_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
])
const signedMediaUrlCache = new Map<
  string,
  { url: string; expiresAt: number }
>()

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

  if (trimmedContent && trimmedContent.length > MESSAGE_MAX_LENGTH) {
    return {
      data: null,
      error: new Error(`Message must be ${MESSAGE_MAX_LENGTH} characters or fewer`),
    }
  }

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

  if (error) {
    if (mediaUrl) {
      const { error: cleanupError } = await supabase.storage
        .from(MESSAGE_MEDIA_BUCKET)
        .remove([mediaUrl])

      if (cleanupError) {
        console.error('Failed to clean up an orphaned message attachment:', cleanupError)
      }
    }

    return { data: null, error: new MessageApiError(error) }
  }
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
  if (!MESSAGE_MEDIA_MIME_TYPES.has(file.type)) {
    return { data: null, error: new Error('Unsupported message attachment type') }
  }

  if (file.size > MESSAGE_MEDIA_MAX_BYTES) {
    return { data: null, error: new Error('Message attachments must be 50 MB or smaller') }
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const path = `${userId}/${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage
    .from(MESSAGE_MEDIA_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) return { data: null, error: new Error(error.message) }
  return { data: path, error: null }
}

function getMessageMediaPath(pathOrUrl: string): string | null {
  if (!pathOrUrl) return null
  if (!/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl

  try {
    const parsed = new URL(pathOrUrl)
    const marker = `/${MESSAGE_MEDIA_BUCKET}/`
    const markerIndex = parsed.pathname.indexOf(marker)
    if (markerIndex === -1) return null

    const encodedPath = parsed.pathname.slice(markerIndex + marker.length)
    return encodedPath ? decodeURIComponent(encodedPath) : null
  } catch {
    return null
  }
}

/**
 * Resolve a private message attachment to a short-lived URL. Storage RLS only
 * issues the URL when the current user belongs to the matching conversation.
 */
export async function getMessageMediaSignedUrl(
  pathOrUrl: string
): Promise<{ data: string | null; error: Error | null }> {
  if (pathOrUrl.startsWith('blob:')) {
    return { data: pathOrUrl, error: null }
  }

  const path = getMessageMediaPath(pathOrUrl)
  if (!path) {
    return { data: null, error: new Error('Invalid message media path') }
  }

  const cached = signedMediaUrlCache.get(path)
  if (cached && cached.expiresAt > Date.now()) {
    return { data: cached.url, error: null }
  }

  const { data, error } = await supabase.storage
    .from(MESSAGE_MEDIA_BUCKET)
    .createSignedUrl(path, MESSAGE_MEDIA_SIGNED_URL_TTL_SECONDS)

  if (error || !data?.signedUrl) {
    return {
      data: null,
      error: new Error(error?.message ?? 'Could not create message media URL'),
    }
  }

  signedMediaUrlCache.set(path, {
    url: data.signedUrl,
    // Refresh one minute before the server-side expiry.
    expiresAt: Date.now() + (MESSAGE_MEDIA_SIGNED_URL_TTL_SECONDS - 60) * 1000,
  })

  return { data: data.signedUrl, error: null }
}

