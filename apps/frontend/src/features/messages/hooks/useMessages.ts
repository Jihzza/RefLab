import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/components/useAuth'
import { supabase } from '@/lib/supabaseClient'
import {
  getMessages as getMessagesApi,
  markConversationRead,
  sendMessage as sendMessageApi,
} from '../api/messagesApi'
import {
  MESSAGES_UNREAD_CHANGED_EVENT,
  type Message,
  type MessageMediaType,
  type MessageUser,
} from '../types'

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

export function useMessages(
  conversationId: string | null,
  onRead?: () => void | Promise<void>,
) {
  const { t } = useTranslation()
  const { user, profile } = useAuth()

  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(Boolean(conversationId))
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [loadedConversationId, setLoadedConversationId] = useState<string | null>(null)

  const cursorRef = useRef<string | null>(null)
  const loadingRef = useRef(false)
  const messageIdsRef = useRef<Set<string>>(new Set())
  const optimisticUrlsRef = useRef<Set<string>>(new Set())
  const generationRef = useRef(0)
  const onReadRef = useRef(onRead)

  useEffect(() => {
    onReadRef.current = onRead
  }, [onRead])

  const markReadAndNotify = useCallback(async (
    targetConversationId: string,
    userId: string,
  ) => {
    const { error } = await markConversationRead(targetConversationId, userId)
    if (!error) {
      window.dispatchEvent(new Event(MESSAGES_UNREAD_CHANGED_EVENT))
      await onReadRef.current?.()
    }
  }, [])

  const revokeOptimisticUrls = useCallback(() => {
    optimisticUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
    optimisticUrlsRef.current.clear()
  }, [])

  useEffect(() => revokeOptimisticUrls, [revokeOptimisticUrls])

  // Initial fetch and conversation changes. The generation guard prevents a
  // slow response from the previous route replacing the active conversation.
  useEffect(() => {
    const generation = ++generationRef.current
    let cancelled = false

    revokeOptimisticUrls()
    loadingRef.current = false
    cursorRef.current = null
    messageIdsRef.current = new Set()
    setMessages([])
    setHasMore(true)
    setIsLoadingMore(false)
    setIsSending(false)
    setLoadError(null)
    setSendError(null)
    setLoadedConversationId(null)

    if (!conversationId || !user?.id) {
      setIsLoading(false)
      return () => {
        cancelled = true
      }
    }

    setIsLoading(true)

    void (async () => {
      const { data, error: fetchError } = await getMessagesApi(
        conversationId,
        user.id,
        null,
        PAGE_SIZE,
      )

      if (cancelled || generation !== generationRef.current) return

      if (fetchError) {
        setLoadError(fetchError.message)
        setLoadedConversationId(conversationId)
        setIsLoading(false)
        return
      }

      const oldestFirst = [...data].reverse()
      oldestFirst.forEach(message => messageIdsRef.current.add(message.id))

      setMessages(oldestFirst)
      setLoadedConversationId(conversationId)
      setHasMore(data.length >= PAGE_SIZE)
      cursorRef.current = oldestFirst.length > 0
        ? oldestFirst[0].created_at
        : null
      setIsLoading(false)

      await markReadAndNotify(conversationId, user.id)
    })()

    return () => {
      cancelled = true
    }
  }, [conversationId, markReadAndNotify, reloadToken, revokeOptimisticUrls, user?.id])

  const loadMore = useCallback(async (): Promise<boolean> => {
    if (!conversationId || !user?.id || !hasMore || loadingRef.current) {
      return false
    }

    const generation = generationRef.current
    loadingRef.current = true
    setIsLoadingMore(true)
    setLoadError(null)

    try {
      const { data, error: fetchError } = await getMessagesApi(
        conversationId,
        user.id,
        cursorRef.current,
        PAGE_SIZE,
      )

      if (generation !== generationRef.current) return false

      if (fetchError) {
        setLoadError(fetchError.message)
        return false
      }

      const oldestFirst = [...data].reverse()
      setHasMore(data.length >= PAGE_SIZE)

      setMessages(previous => {
        const deduped = oldestFirst.filter(
          message => !messageIdsRef.current.has(message.id),
        )
        deduped.forEach(message => messageIdsRef.current.add(message.id))
        return [...deduped, ...previous]
      })

      if (oldestFirst.length > 0) {
        cursorRef.current = oldestFirst[0].created_at
      }

      return true
    } finally {
      if (generation === generationRef.current) {
        loadingRef.current = false
        setIsLoadingMore(false)
      }
    }
  }, [conversationId, hasMore, user?.id])

  const sendMessage = useCallback(async (
    content: string,
    mediaFile?: File,
  ): Promise<boolean> => {
    if (!conversationId || !user?.id) return false
    if (!profile) {
      setSendError(t('Your profile is still loading. Please try again.'))
      return false
    }

    const trimmed = content.trim()
    if (!trimmed && !mediaFile) return false

    const generation = generationRef.current
    const targetConversationId = conversationId
    setIsSending(true)
    setSendError(null)

    const tempId = `temp-${crypto.randomUUID()}`
    const nowIso = new Date().toISOString()
    const mediaType = mediaFile ? inferMediaType(mediaFile) : 'text'
    const optimisticMediaUrl = mediaFile ? URL.createObjectURL(mediaFile) : null

    if (optimisticMediaUrl) optimisticUrlsRef.current.add(optimisticMediaUrl)

    const sender: MessageUser = {
      id: profile.id,
      username: profile.username,
      name: profile.name ?? null,
      photo_url: profile.photo_url ?? null,
    }

    const optimistic: Message = {
      id: tempId,
      conversation_id: targetConversationId,
      sender_id: user.id,
      content: trimmed || null,
      media_type: mediaFile ? mediaType : 'text',
      media_url: optimisticMediaUrl,
      created_at: nowIso,
      sender,
    }

    messageIdsRef.current.add(tempId)
    setMessages(previous => [...previous, optimistic])

    try {
      const { data, error: sendRequestError } = await sendMessageApi(
        targetConversationId,
        user.id,
        trimmed || null,
        mediaType,
        mediaFile,
      )

      if (sendRequestError || !data) {
        throw sendRequestError ?? new Error(t('Failed to send message.'))
      }

      if (generation !== generationRef.current) return true

      const realMessage: Message = { ...data, sender }

      setMessages(previous => previous
        .map(message => (message.id === tempId ? realMessage : message))
        .sort((left, right) => left.created_at.localeCompare(right.created_at)))
      messageIdsRef.current.delete(tempId)
      messageIdsRef.current.add(realMessage.id)

      await markReadAndNotify(targetConversationId, user.id)
      return true
    } catch (error) {
      if (generation === generationRef.current) {
        setMessages(previous => previous.filter(message => message.id !== tempId))
        messageIdsRef.current.delete(tempId)
        setSendError(
          error instanceof Error ? error.message : t('Failed to send message.'),
        )
      }
      return false
    } finally {
      if (optimisticMediaUrl) {
        URL.revokeObjectURL(optimisticMediaUrl)
        optimisticUrlsRef.current.delete(optimisticMediaUrl)
      }
      if (generation === generationRef.current) setIsSending(false)
    }
  }, [conversationId, markReadAndNotify, profile, t, user?.id])

  // Realtime INSERTs are deduplicated against fetched and optimistic messages.
  // Own messages are resolved through the send request, so they are not added a
  // second time when the Realtime event arrives first.
  useEffect(() => {
    if (!conversationId || !user?.id) return

    const generation = generationRef.current
    let cancelled = false
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
          if (cancelled || generation !== generationRef.current) return

          const row = payload.new as {
            id: string
            conversation_id: string
            sender_id: string
            content: string | null
            media_type: MessageMediaType
            media_url: string | null
            created_at: string
          }

          if (!row?.id || row.sender_id === user.id) return
          if (messageIdsRef.current.has(row.id)) return

          const sender = (await fetchPublicProfile(row.sender_id)) ?? ({
            id: row.sender_id,
            username: 'Unknown',
            name: null,
            photo_url: null,
          } satisfies MessageUser)

          if (cancelled || generation !== generationRef.current) return
          // The initial page fetch or another Realtime callback may have
          // inserted this row while the sender profile was resolving.
          if (messageIdsRef.current.has(row.id)) return
          messageIdsRef.current.add(row.id)

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

          setMessages(previous => [...previous, incoming].sort(
            (left, right) => left.created_at.localeCompare(right.created_at),
          ))
          await markReadAndNotify(conversationId, user.id)
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [conversationId, markReadAndNotify, user?.id])

  const retry = useCallback(() => {
    setReloadToken(value => value + 1)
  }, [])

  const dismissSendError = useCallback(() => {
    setSendError(null)
  }, [])

  const isCurrentConversation = Boolean(conversationId)
    && loadedConversationId === conversationId

  return {
    messages: isCurrentConversation ? messages : [],
    isLoading: Boolean(conversationId) && !isCurrentConversation ? true : isLoading,
    isLoadingMore: isCurrentConversation ? isLoadingMore : false,
    hasMore,
    isSending: isCurrentConversation ? isSending : false,
    loadError: isCurrentConversation ? loadError : null,
    sendError: isCurrentConversation ? sendError : null,
    loadMore,
    retry,
    sendMessage,
    dismissSendError,
  }
}
