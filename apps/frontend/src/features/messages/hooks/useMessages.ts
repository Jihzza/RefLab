import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/features/auth/components/useAuth'
import { supabase } from '@/lib/supabaseClient'
import {
  getMessages as getMessagesApi,
  markConversationRead,
  sendMessage as sendMessageApi,
} from '../api/messagesApi'
import type { Message, MessageMediaType, MessageUser } from '../types'

const PAGE_SIZE = 30

function inferMediaType(file: File): MessageMediaType {
  const mime = file.type
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return 'text'
}

async function fetchPublicProfile(userId: string): Promise<MessageUser | null> {
  const { data, error } = await supabase
    .from('public_profiles')
    .select('id, username, name, photo_url')
    .eq('id', userId)
    .single()

  if (error) return null
  return data as MessageUser
}

export function useMessages(conversationId: string | null) {
  const { user, profile } = useAuth()

  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cursorRef = useRef<string | null>(null)
  const loadingRef = useRef(false)
  const messageIdsRef = useRef<Set<string>>(new Set())

  // Initial fetch + conversation changes
  useEffect(() => {
    if (!conversationId || !user?.id) return

    setIsLoading(true)
    setError(null)
    setMessages([])
    setHasMore(true)
    cursorRef.current = null
    messageIdsRef.current = new Set()

    ;(async () => {
      const { data, error: fetchError } = await getMessagesApi(
        conversationId,
        user.id,
        null,
        PAGE_SIZE
      )

      if (fetchError) {
        setError(fetchError.message)
        setIsLoading(false)
        return
      }

      const oldestFirst = [...data].reverse()
      oldestFirst.forEach(m => messageIdsRef.current.add(m.id))

      setMessages(oldestFirst)
      setHasMore(data.length >= PAGE_SIZE)
      cursorRef.current = oldestFirst.length > 0 ? oldestFirst[0].created_at : null

      // Mark read after initial load
      await markConversationRead(conversationId, user.id)
      setIsLoading(false)
    })()
  }, [conversationId, user?.id])

  const loadMore = useCallback(async () => {
    if (!conversationId || !user?.id || !hasMore || loadingRef.current) return
    loadingRef.current = true
    setIsLoadingMore(true)

    try {
      const { data, error: fetchError } = await getMessagesApi(
        conversationId,
        user.id,
        cursorRef.current,
        PAGE_SIZE
      )

      if (fetchError) {
        setError(fetchError.message)
        return
      }

      const oldestFirst = [...data].reverse()
      setHasMore(data.length >= PAGE_SIZE)

      setMessages(prev => {
        const deduped = oldestFirst.filter(m => !messageIdsRef.current.has(m.id))
        deduped.forEach(m => messageIdsRef.current.add(m.id))
        return [...deduped, ...prev]
      })

      if (oldestFirst.length > 0) {
        cursorRef.current = oldestFirst[0].created_at
      }
    } finally {
      loadingRef.current = false
      setIsLoadingMore(false)
    }
  }, [conversationId, user?.id, hasMore])

  const sendMessage = useCallback(
    async (content: string, mediaFile?: File) => {
      if (!conversationId || !user?.id) return
      if (!profile) {
        setError('Your profile is still loading. Please try again.')
        return
      }

      const trimmed = content.trim()
      if (!trimmed && !mediaFile) return

      setIsSending(true)
      setError(null)

      const tempId = `temp-${crypto.randomUUID()}`
      const nowIso = new Date().toISOString()
      const mediaType = mediaFile ? inferMediaType(mediaFile) : 'text'
      const optimisticMediaUrl = mediaFile ? URL.createObjectURL(mediaFile) : null

      const sender: MessageUser = {
        id: profile.id,
        username: profile.username,
        name: profile.name ?? null,
        photo_url: profile.photo_url ?? null,
      }

      const optimistic: Message = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: user.id,
        content: trimmed || null,
        media_type: mediaFile ? mediaType : 'text',
        media_url: optimisticMediaUrl,
        created_at: nowIso,
        sender,
      }

      messageIdsRef.current.add(tempId)
      setMessages(prev => [...prev, optimistic])

      try {
        const { data, error: sendError } = await sendMessageApi(
          conversationId,
          user.id,
          trimmed || null,
          mediaType,
          mediaFile
        )

        if (sendError || !data) {
          throw sendError ?? new Error('Failed to send message.')
        }

        const realMessage: Message = {
          ...data,
          sender,
        }

        setMessages(prev =>
          prev.map(m => (m.id === tempId ? realMessage : m))
        )

        messageIdsRef.current.delete(tempId)
        messageIdsRef.current.add(realMessage.id)

        // Mark as read after sending (keeps unread counters accurate)
        await markConversationRead(conversationId, user.id)
      } catch (err) {
        setMessages(prev => prev.filter(m => m.id !== tempId))
        messageIdsRef.current.delete(tempId)

        const message = err instanceof Error ? err.message : 'Failed to send.'
        setError(message)
      } finally {
        if (optimisticMediaUrl) URL.revokeObjectURL(optimisticMediaUrl)
        setIsSending(false)
      }
    },
    [conversationId, user?.id, profile]
  )

  // Realtime: incoming messages
  useEffect(() => {
    if (!conversationId || !user?.id) return

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async payload => {
          const row = payload.new as {
            id: string
            conversation_id: string
            sender_id: string
            content: string | null
            media_type: MessageMediaType
            media_url: string | null
            created_at: string
          }

          if (!row?.id) return
          if (row.sender_id === user.id) return
          if (messageIdsRef.current.has(row.id)) return

          messageIdsRef.current.add(row.id)

          const sender =
            (await fetchPublicProfile(row.sender_id)) ??
            ({
              id: row.sender_id,
              username: 'Unknown',
              name: null,
              photo_url: null,
            } satisfies MessageUser)

          const incoming: Message = {
            id: row.id,
            conversation_id: row.conversation_id,
            sender_id: row.sender_id,
            content: row.content,
            media_type: row.media_type,
            media_url: row.media_url,
            created_at: row.created_at,
            sender,
          }

          setMessages(prev => [...prev, incoming])
          await markConversationRead(conversationId, user.id)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, user?.id])

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    isSending,
    error,
    loadMore,
    sendMessage,
  }
}

