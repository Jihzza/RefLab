import { supabase } from '@/lib/supabaseClient'
import type {
  Conversation,
  Message,
  MessageMediaType,
  MessageUser,
  UserSearchResult,
} from '../types'
import {
  getMessageMediaPathForMime,
  MAX_MESSAGE_MEDIA_BYTES,
} from '../mediaConfig'

type MessageRow = Omit<Message, 'sender'>

export interface MessageDeliveryResult {
  data: MessageRow | null
  error: Error | null
  retryable: boolean
  mediaPath: string | null
}

function cancelledMessageDelivery(mediaPath: string | null): MessageDeliveryResult {
  return {
    data: null,
    error: new Error('Message delivery was paused after the active session changed.'),
    retryable: true,
    mediaPath,
  }
}

function isRetryableRequestError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true

  const candidate = error as {
    status?: number
    statusCode?: number | string
    code?: string
    message?: string
  } | null
  const status = Number(candidate?.status ?? candidate?.statusCode ?? 0)
  const code = candidate?.code ?? ''
  const message = candidate?.message?.toLowerCase() ?? ''

  return status === 408
    || status === 425
    || status === 429
    || status >= 500
    || code === 'PGRST000'
    || code === 'PGRST001'
    || code === 'PGRST002'
    || message.includes('failed to fetch')
    || message.includes('network')
    || message.includes('timeout')
    || message.includes('temporarily unavailable')
}

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
  clientId: string,
  content: string | null,
  mediaType: MessageMediaType = 'text',
  mediaFile?: File,
  shouldContinue: () => boolean = () => true,
): Promise<MessageDeliveryResult> {
  let mediaUrl: string | null = null
  let uploadError: Error | null = null
  const trimmedContent = content && content.trim() ? content.trim() : null

  // The guard is owned by the authenticated sender's outbox revision. It is
  // checked synchronously immediately before every remote operation, so an
  // auth event cannot interleave between this check and the request start.
  if (!shouldContinue()) return cancelledMessageDelivery(null)

  if (mediaFile) {
    const { data: path, error } = await uploadMessageMedia(
      conversationId,
      senderId,
      clientId,
      mediaFile
    )
    mediaUrl = path
    uploadError = error

    // A session can change while Storage is awaiting its response. Do not run
    // send_message with the replacement session. Keep the deterministic object
    // intact: the original sender's later retry will reconcile it idempotently.
    if (!shouldContinue()) return cancelledMessageDelivery(mediaUrl)
  }

  if (!shouldContinue()) return cancelledMessageDelivery(mediaUrl)

  // Always attempt the idempotent RPC, even when Storage reported an error.
  // The upload may have completed while its response was lost, or a retry may
  // find the immutable object already present. send_message verifies that the
  // deterministic object exists before it commits the message row.
  const { data, error } = await supabase.rpc('send_message', {
    p_conversation_id: conversationId,
    p_expected_sender_id: senderId,
    p_client_id: clientId,
    p_content: trimmedContent,
    p_media_type: mediaFile ? mediaType : 'text',
    p_media_url: mediaFile ? mediaUrl : null,
  })

  if (error) {
    const requestError = uploadError ?? new Error(error.message)
    const retryable = isRetryableRequestError(uploadError)
      || isRetryableRequestError(error)
    if (mediaUrl && !retryable) {
      await deleteMessageMedia(mediaUrl)
    }
    return {
      data: null,
      error: requestError,
      retryable,
      mediaPath: mediaUrl,
    }
  }
  return {
    data: data as MessageRow,
    error: null,
    retryable: false,
    mediaPath: mediaUrl,
  }
}

export async function markConversationRead(
  conversationId: string,
  expectedReaderId: string,
  readThrough: string | null,
): Promise<{ data: string | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('mark_conversation_read', {
    p_conversation_id: conversationId,
    p_expected_reader_id: expectedReaderId,
    p_read_through: readThrough,
  })

  return {
    data: (data as string | null) ?? null,
    error: error ? new Error(error.message) : null,
  }
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
  conversationId: string,
  userId: string,
  clientId: string,
  file: File
): Promise<{ data: string | null; error: Error | null }> {
  const path = getMessageMediaPathForMime(
    conversationId,
    userId,
    clientId,
    file.type,
  )
  if (!path) {
    return { data: null, error: new Error('Unsupported attachment type.') }
  }
  if (file.size <= 0 || file.size > MAX_MESSAGE_MEDIA_BYTES) {
    return {
      data: null,
      error: new Error('The attachment must be no larger than 20 MB.'),
    }
  }

  const { error } = await supabase.storage
    .from('message-media')
    .upload(path, file, { cacheControl: '3600', upsert: false })

  // Return the deterministic path on both outcomes. A caller must still invoke
  // send_message: an interrupted/duplicate upload can already exist remotely.
  return { data: path, error }
}

/** Create a short-lived URL after Storage RLS confirms conversation access. */
export async function createSignedMessageMediaUrl(
  path: string,
  expiresInSeconds: number = 3600,
): Promise<{ data: string | null; error: Error | null }> {
  const { data, error } = await supabase.storage
    .from('message-media')
    .createSignedUrl(path, expiresInSeconds)

  return {
    data: data?.signedUrl ?? null,
    error,
  }
}

export async function deleteMessageMedia(
  path: string,
): Promise<{ error: Error | null }> {
  const { error } = await supabase.storage.from('message-media').remove([path])
  return { error }
}

