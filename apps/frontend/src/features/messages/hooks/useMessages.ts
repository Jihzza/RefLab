import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useAuth } from '@/features/auth/components/useAuth'
import { supabase } from '@/lib/supabaseClient'
import {
  getMessages as getMessagesApi,
  markConversationRead,
  sendMessage as sendMessageApi,
} from '../api/messagesApi'
import type { Message, MessageMediaType, MessageUser } from '../types'
import { MESSAGE_MAX_CHARACTERS, validateMessageMediaFile } from '../validation'
import { isConversationUnavailableError } from '../messageErrors'

const PAGE_SIZE = 30

interface MessageScope {
  conversationId: string | null
  userId: string | null
  generation: number
}

function mergeMessages(...groups: Message[][]): Message[] {
  const byId = new Map<string, Message>()

  for (const group of groups) {
    for (const message of group) byId.set(message.id, message)
  }

  return [...byId.values()].sort((left, right) => {
    const byCreatedAt = left.created_at.localeCompare(right.created_at)
    return byCreatedAt !== 0 ? byCreatedAt : left.id.localeCompare(right.id)
  })
}

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
  const userId = user?.id ?? null

  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isConversationUnavailable, setIsConversationUnavailable] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cursorRef = useRef<string | null>(null)
  const loadingGenerationRef = useRef<number | null>(null)
  const messageIdsRef = useRef<Set<string>>(new Set())
  const generationRef = useRef(0)
  const activeScopeRef = useRef<MessageScope>({
    conversationId: null,
    userId: null,
    generation: 0,
  })

  const isScopeActive = useCallback((scope: MessageScope) => {
    const active = activeScopeRef.current
    return (
      active.generation === scope.generation &&
      active.conversationId === scope.conversationId &&
      active.userId === scope.userId
    )
  }, [])

  // A layout effect invalidates the previous scope during commit, before a
  // resolved promise or realtime callback can run for the newly rendered page.
  useLayoutEffect(() => {
    const generation = ++generationRef.current
    activeScopeRef.current = { conversationId, userId, generation }

    return () => {
      if (activeScopeRef.current.generation !== generation) return
      const invalidGeneration = generation + 1
      generationRef.current = invalidGeneration
      activeScopeRef.current = {
        conversationId: null,
        userId: null,
        generation: invalidGeneration,
      }
    }
  }, [conversationId, userId])

  // Initial fetch + conversation changes.
  useEffect(() => {
    const scope = activeScopeRef.current

    setIsLoading(Boolean(conversationId && userId))
    setIsLoadingMore(false)
    setIsSending(false)
    setIsConversationUnavailable(false)
    setError(null)
    setMessages([])
    setHasMore(true)
    cursorRef.current = null
    loadingGenerationRef.current = null
    messageIdsRef.current = new Set()

    if (!conversationId || !userId || !isScopeActive(scope)) return

    void (async () => {
      const { data, error: fetchError } = await getMessagesApi(
        conversationId,
        userId,
        null,
        PAGE_SIZE,
      )

      if (!isScopeActive(scope)) return

      if (fetchError) {
        setError(fetchError.message)
        setIsLoading(false)
        return
      }

      const oldestFirst = [...data].reverse()
      oldestFirst.forEach((message) => messageIdsRef.current.add(message.id))
      setMessages((previous) => {
        if (!isScopeActive(scope)) return previous
        const merged = mergeMessages(oldestFirst, previous)
        merged.forEach((message) => messageIdsRef.current.add(message.id))
        return merged
      })
      setHasMore(data.length >= PAGE_SIZE)
      cursorRef.current = oldestFirst.at(0)?.created_at ?? null

      if (!isScopeActive(scope)) return
      await markConversationRead(conversationId, userId)
      if (isScopeActive(scope)) setIsLoading(false)
    })()
  }, [conversationId, isScopeActive, userId])

  const loadMore = useCallback(async () => {
    const scope = activeScopeRef.current
    if (
      !conversationId ||
      !userId ||
      !hasMore ||
      !isScopeActive(scope) ||
      loadingGenerationRef.current === scope.generation
    ) {
      return
    }

    loadingGenerationRef.current = scope.generation
    setIsLoadingMore(true)

    try {
      const { data, error: fetchError } = await getMessagesApi(
        conversationId,
        userId,
        cursorRef.current,
        PAGE_SIZE,
      )

      if (!isScopeActive(scope)) return

      if (fetchError) {
        setError(fetchError.message)
        return
      }

      const oldestFirst = [...data].reverse()
      setHasMore(data.length >= PAGE_SIZE)
      setMessages((previous) => {
        if (!isScopeActive(scope)) return previous
        const deduped = oldestFirst.filter((message) => !messageIdsRef.current.has(message.id))
        deduped.forEach((message) => messageIdsRef.current.add(message.id))
        return [...deduped, ...previous]
      })

      if (oldestFirst.length > 0 && isScopeActive(scope)) {
        cursorRef.current = oldestFirst[0].created_at
      }
    } finally {
      if (loadingGenerationRef.current === scope.generation) {
        loadingGenerationRef.current = null
        if (isScopeActive(scope)) setIsLoadingMore(false)
      }
    }
  }, [conversationId, hasMore, isScopeActive, userId])

  const sendMessage = useCallback(
    async (content: string, mediaFile?: File) => {
      const scope = activeScopeRef.current
      if (!conversationId || !userId || !isScopeActive(scope)) {
        throw new Error('Unable to send in this conversation.')
      }
      if (!profile) {
        const profileError = new Error('Your profile is still loading. Please try again.')
        setError(profileError.message)
        throw profileError
      }

      const trimmed = content.trim()
      if (!trimmed && !mediaFile) return
      if (content.length > MESSAGE_MAX_CHARACTERS) {
        const lengthError = new Error(
          `Messages cannot exceed ${MESSAGE_MAX_CHARACTERS} characters.`,
        )
        setError(lengthError.message)
        throw lengthError
      }
      if (mediaFile) {
        const mediaError = validateMessageMediaFile(mediaFile)
        if (mediaError) {
          const validationError = new Error(
            mediaError === 'size'
              ? 'The attachment must be 50 MB or smaller.'
              : 'This file type is not supported.',
          )
          setError(validationError.message)
          throw validationError
        }
      }

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
        sender_id: userId,
        content: trimmed || null,
        media_type: mediaFile ? mediaType : 'text',
        media_url: optimisticMediaUrl,
        created_at: nowIso,
        sender,
      }

      messageIdsRef.current.add(tempId)
      setMessages((previous) => [...previous, optimistic])

      try {
        const { data, error: sendError } = await sendMessageApi(
          conversationId,
          userId,
          trimmed || null,
          mediaType,
          mediaFile,
        )

        if (!isScopeActive(scope)) return
        if (sendError || !data) throw sendError ?? new Error('Failed to send message.')

        const realMessage: Message = { ...data, sender }
        setMessages((previous) => previous.map((message) => (
          message.id === tempId ? realMessage : message
        )))
        messageIdsRef.current.delete(tempId)
        messageIdsRef.current.add(realMessage.id)

        if (isScopeActive(scope)) {
          await markConversationRead(conversationId, userId)
        }
      } catch (caughtError) {
        if (!isScopeActive(scope)) return

        setMessages((previous) => previous.filter((message) => message.id !== tempId))
        messageIdsRef.current.delete(tempId)
        const failure = caughtError instanceof Error
          ? caughtError
          : new Error('Failed to send.')
        if (isConversationUnavailableError(failure)) {
          setIsConversationUnavailable(true)
        }
        setError(failure.message)
        throw failure
      } finally {
        if (optimisticMediaUrl) URL.revokeObjectURL(optimisticMediaUrl)
        if (isScopeActive(scope)) setIsSending(false)
      }
    },
    [conversationId, isScopeActive, profile, userId],
  )

  // Realtime incoming messages are bound to the same generation as the
  // conversation that created the channel. Slow profile lookups from an old
  // channel cannot append into the next conversation.
  useEffect(() => {
    const scope = activeScopeRef.current
    if (!conversationId || !userId || !isScopeActive(scope)) return

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
        async (payload) => {
          if (!isScopeActive(scope)) return

          const row = payload.new as {
            id: string
            conversation_id: string
            sender_id: string
            content: string | null
            media_type: MessageMediaType
            media_url: string | null
            created_at: string
          }

          if (!row?.id || row.conversation_id !== conversationId) return
          if (row.sender_id === userId || messageIdsRef.current.has(row.id)) return

          messageIdsRef.current.add(row.id)
          const sender = (await fetchPublicProfile(row.sender_id)) ?? ({
            id: row.sender_id,
            username: 'Unknown',
            name: null,
            photo_url: null,
          } satisfies MessageUser)

          if (!isScopeActive(scope)) return

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

          setMessages((previous) => {
            if (!isScopeActive(scope)) return previous
            if (previous.some((message) => message.id === incoming.id)) return previous
            return mergeMessages(previous, [incoming])
          })
          if (isScopeActive(scope)) {
            await markConversationRead(conversationId, userId)
          }
        },
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED' || !isScopeActive(scope)) return

        // A row can be committed after the first page snapshot but before the
        // realtime channel is acknowledged. Fetching the newest page once the
        // channel is live closes that gap; any concurrent realtime delivery is
        // merged by id instead of replacing state.
        void (async () => {
          const { data, error: catchUpError } = await getMessagesApi(
            conversationId,
            userId,
            null,
            PAGE_SIZE,
          )

          if (!isScopeActive(scope)) return
          if (catchUpError) {
            setError(catchUpError.message)
            return
          }

          const oldestFirst = [...data].reverse()
          oldestFirst.forEach((message) => messageIdsRef.current.add(message.id))
          setMessages((previous) => {
            if (!isScopeActive(scope)) return previous
            const merged = mergeMessages(oldestFirst, previous)
            merged.forEach((message) => messageIdsRef.current.add(message.id))
            return merged
          })
          setHasMore(data.length >= PAGE_SIZE)
          cursorRef.current = oldestFirst.at(0)?.created_at ?? null
          await markConversationRead(conversationId, userId)
        })()
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, isScopeActive, userId])

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    isSending,
    isConversationUnavailable,
    error,
    loadMore,
    sendMessage,
  }
}
