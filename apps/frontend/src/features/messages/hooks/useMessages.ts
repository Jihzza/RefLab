import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/components/useAuth'
import { supabase } from '@/lib/supabaseClient'
import {
  getMessages as getMessagesApi,
  markConversationRead,
} from '../api/messagesApi'
import {
  discardQueuedMessage,
  flushMessageOutbox,
  retryQueuedMessage,
  type OutboxDeliveryOutcome,
} from '../offline/messageOutboxDelivery'
import {
  enqueueMessage,
  listQueuedMessages,
  subscribeToMessageOutbox,
} from '../offline/messageOutbox'
import {
  MESSAGES_UNREAD_CHANGED_EVENT,
  type Message,
  type MessageMediaType,
  type MessageUser,
  type QueuedMessage,
} from '../types'

const PAGE_SIZE = 30

function inferMediaType(file: File): MessageMediaType {
  const mime = file.type
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return 'text'
}

function isDocumentReadable() {
  return document.visibilityState === 'visible' && document.hasFocus()
}

function latestTimestamp(left: string | null, right: string): string {
  if (!left) return right
  return left.localeCompare(right) >= 0 ? left : right
}

function compareMessages(left: Message, right: Message): number {
  const timestampOrder = left.created_at.localeCompare(right.created_at)
  return timestampOrder || left.id.localeCompare(right.id)
}

function messageCursor(message: Message): string {
  return `${message.created_at}|${message.id}`
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

function queuedRecordToMessage(
  record: QueuedMessage,
  sender: MessageUser,
  mediaUrl: string | null,
): Message {
  return {
    id: `outbox-${record.clientId}`,
    conversation_id: record.conversationId,
    sender_id: record.senderId,
    client_id: record.clientId,
    content: record.content,
    media_type: record.mediaType,
    media_url: mediaUrl,
    created_at: record.createdAt,
    sender,
    delivery_state: record.state === 'failed' ? 'failed' : 'pending',
    delivery_error: record.lastError,
    outbox_client_id: record.clientId,
  }
}

export function useMessages(
  conversationId: string | null,
  onRead?: () => void | Promise<void>,
  participantDeleted: boolean = false,
) {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const userId = user?.id ?? null

  const [messages, setMessages] = useState<Message[]>([])
  const [outboxMessages, setOutboxMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(Boolean(conversationId))
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [loadedConversationId, setLoadedConversationId] = useState<string | null>(null)
  const [loadedParticipantDeleted, setLoadedParticipantDeleted] = useState<boolean | null>(null)
  const [loadedOwnerId, setLoadedOwnerId] = useState<string | null>(null)

  const cursorRef = useRef<string | null>(null)
  const loadingRef = useRef(false)
  const messageIdsRef = useRef<Set<string>>(new Set())
  const outboxUrlsRef = useRef<Map<string, string>>(new Map())
  const outboxSyncGenerationRef = useRef(0)
  const generationRef = useRef(0)
  const firstPageCatchUpRef = useRef<{
    generation: number
    status: 'pending' | 'failed' | 'succeeded'
  }>({ generation: 0, status: 'pending' })
  const onReadRef = useRef(onRead)
  const pendingReadRef = useRef<{
    conversationId: string
    readThrough: string
  } | null>(null)
  const readRequestRef = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    onReadRef.current = onRead
  }, [onRead])

  const persistRead = useCallback((
    targetConversationId: string,
    readThrough: string,
  ): Promise<void> => {
    const request = readRequestRef.current.then(async () => {
      if (!userId) return

      if (!isDocumentReadable()) {
        const pending = pendingReadRef.current
        pendingReadRef.current = {
          conversationId: targetConversationId,
          readThrough: pending?.conversationId === targetConversationId
            ? latestTimestamp(pending.readThrough, readThrough)
            : readThrough,
        }
        return
      }

      const { error } = await markConversationRead(
        targetConversationId,
        userId,
        readThrough,
      )
      if (error) {
        const pending = pendingReadRef.current
        pendingReadRef.current = {
          conversationId: targetConversationId,
          readThrough: pending?.conversationId === targetConversationId
            ? latestTimestamp(pending.readThrough, readThrough)
            : readThrough,
        }
        return
      }

      window.dispatchEvent(new Event(MESSAGES_UNREAD_CHANGED_EVENT))
      await onReadRef.current?.()
    })

    readRequestRef.current = request.catch(() => undefined)
    return request
  }, [userId])

  const markReadAndNotify = useCallback((
    targetConversationId: string,
    readThrough: string | null,
  ): Promise<void> => {
    if (!readThrough) return Promise.resolve()

    if (!isDocumentReadable()) {
      const pending = pendingReadRef.current
      pendingReadRef.current = {
        conversationId: targetConversationId,
        readThrough: pending?.conversationId === targetConversationId
          ? latestTimestamp(pending.readThrough, readThrough)
          : readThrough,
      }
      return Promise.resolve()
    }

    return persistRead(targetConversationId, readThrough)
  }, [persistRead])

  useEffect(() => {
    const flushPendingRead = () => {
      if (!isDocumentReadable()) return
      const pending = pendingReadRef.current
      if (!pending || pending.conversationId !== conversationId) return
      pendingReadRef.current = null
      void persistRead(pending.conversationId, pending.readThrough)
    }

    document.addEventListener('visibilitychange', flushPendingRead)
    window.addEventListener('focus', flushPendingRead)
    return () => {
      document.removeEventListener('visibilitychange', flushPendingRead)
      window.removeEventListener('focus', flushPendingRead)
    }
  }, [conversationId, persistRead])

  const revokeOutboxUrls = useCallback(() => {
    outboxUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
    outboxUrlsRef.current.clear()
  }, [])

  useEffect(() => revokeOutboxUrls, [revokeOutboxUrls])

  const sender = useMemo<MessageUser | null>(() => {
    if (!userId || !profile) return null
    return {
      id: userId,
      username: profile.username,
      name: profile.name ?? null,
      photo_url: profile.photo_url ?? null,
    }
  }, [profile, userId])

  const syncOutbox = useCallback(async () => {
    const syncGeneration = ++outboxSyncGenerationRef.current
    if (!conversationId || !userId || !sender) {
      revokeOutboxUrls()
      setOutboxMessages([])
      return
    }

    const records = await listQueuedMessages(userId, conversationId)
    if (syncGeneration !== outboxSyncGenerationRef.current) return
    const activeIds = new Set(records.map(record => record.clientId))
    outboxUrlsRef.current.forEach((url, clientId) => {
      if (!activeIds.has(clientId)) {
        URL.revokeObjectURL(url)
        outboxUrlsRef.current.delete(clientId)
      }
    })

    const next = records.map(record => {
      let mediaUrl: string | null = null
      if (record.mediaBlob) {
        mediaUrl = outboxUrlsRef.current.get(record.clientId) ?? null
        if (!mediaUrl) {
          mediaUrl = URL.createObjectURL(record.mediaBlob)
          outboxUrlsRef.current.set(record.clientId, mediaUrl)
        }
      }
      return queuedRecordToMessage(record, sender, mediaUrl)
    })
    setOutboxMessages(next)
  }, [conversationId, revokeOutboxUrls, sender, userId])

  useEffect(() => {
    if (!conversationId || !userId) return
    let cancelled = false

    const sync = async () => {
      try {
        await syncOutbox()
      } catch (error) {
        if (!cancelled) {
          setSendError(
            error instanceof Error ? error.message : t('Failed to send message.'),
          )
        }
      }
    }

    void sync()
    const unsubscribe = subscribeToMessageOutbox(detail => {
      if (
        detail.senderId === userId
        && detail.conversationId === conversationId
      ) {
        void sync()
      }
    })

    return () => {
      cancelled = true
      outboxSyncGenerationRef.current += 1
      unsubscribe()
    }
  }, [conversationId, syncOutbox, t, userId])

  const addDeliveredOutcome = useCallback((outcome: OutboxDeliveryOutcome) => {
    if (
      !outcome.result.data
      || !sender
      || outcome.conversationId !== conversationId
    ) return
    const delivered: Message = { ...outcome.result.data, sender }
    if (messageIdsRef.current.has(delivered.id)) return
    messageIdsRef.current.add(delivered.id)
    setMessages(previous => [...previous, delivered].sort(
      compareMessages,
    ))
  }, [conversationId, sender])

  // Initial fetch and conversation changes. The generation guard prevents a
  // slow response from the previous route replacing the active conversation.
  useEffect(() => {
    const generation = ++generationRef.current
    firstPageCatchUpRef.current = { generation, status: 'pending' }
    let cancelled = false

    loadingRef.current = false
    cursorRef.current = null
    messageIdsRef.current = new Set()
    pendingReadRef.current = null
    const startTimer = window.setTimeout(() => {
      if (cancelled || generation !== generationRef.current) return

      setMessages([])
      setHasMore(true)
      setIsLoadingMore(false)
      setIsSending(false)
      setLoadError(null)
      setSendError(null)
      setLoadedConversationId(null)
      setLoadedParticipantDeleted(null)
      setLoadedOwnerId(null)

      if (!conversationId || !userId) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      void (async () => {
        const { data, error: fetchError } = await getMessagesApi(
          conversationId,
          userId,
          null,
          PAGE_SIZE,
        )

        if (cancelled || generation !== generationRef.current) return

        if (fetchError) {
          const catchUp = firstPageCatchUpRef.current
          if (
            catchUp.generation !== generation
            || catchUp.status !== 'succeeded'
          ) {
            setLoadError(fetchError.message)
          }
          setLoadedConversationId(conversationId)
          setLoadedParticipantDeleted(participantDeleted)
          setLoadedOwnerId(userId)
          setIsLoading(false)
          return
        }

        const oldestFirst = [...data].reverse()
        oldestFirst.forEach(message => messageIdsRef.current.add(message.id))

        // Preserve INSERTs delivered by Realtime while the initial SELECT was
        // in flight. Replacing this state would also leave their IDs trapped
        // in messageIdsRef, preventing a later duplicate event from healing it.
        setMessages(previous => {
          const byId = new Map(
            oldestFirst.map(message => [message.id, message]),
          )
          previous
            .filter(message => message.conversation_id === conversationId)
            .forEach(message => byId.set(message.id, message))
          return [...byId.values()].sort(compareMessages)
        })
        const catchUp = firstPageCatchUpRef.current
        if (
          catchUp.generation !== generation
          || catchUp.status !== 'failed'
        ) {
          setLoadError(null)
        }
        setLoadedConversationId(conversationId)
        setLoadedParticipantDeleted(participantDeleted)
        setLoadedOwnerId(userId)
        setHasMore(data.length >= PAGE_SIZE)
        cursorRef.current = oldestFirst.length > 0
          ? messageCursor(oldestFirst[0])
          : null
        setIsLoading(false)

        await markReadAndNotify(conversationId, data[0]?.created_at ?? null)
      })()
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(startTimer)
    }
  }, [conversationId, markReadAndNotify, participantDeleted, reloadToken, userId])

  const loadMore = useCallback(async (): Promise<boolean> => {
    if (!conversationId || !userId || !hasMore || loadingRef.current) {
      return false
    }

    const generation = generationRef.current
    loadingRef.current = true
    setIsLoadingMore(true)
    setLoadError(null)

    try {
      const { data, error: fetchError } = await getMessagesApi(
        conversationId,
        userId,
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
        cursorRef.current = messageCursor(oldestFirst[0])
      }

      return true
    } finally {
      if (generation === generationRef.current) {
        loadingRef.current = false
        setIsLoadingMore(false)
      }
    }
  }, [conversationId, hasMore, userId])

  const sendMessage = useCallback(async (
    content: string,
    mediaFile?: File,
  ): Promise<boolean> => {
    if (!conversationId || !userId) return false
    if (!sender) {
      setSendError(t('Your profile is still loading. Please try again.'))
      return false
    }

    const trimmed = content.trim()
    if (!trimmed && !mediaFile) return false

    const targetConversationId = conversationId
    const requestGeneration = generationRef.current
    const clientId = crypto.randomUUID()
    setIsSending(true)
    setSendError(null)

    try {
      await enqueueMessage({
        clientId,
        conversationId: targetConversationId,
        senderId: userId,
        content: trimmed || null,
        mediaType: mediaFile ? inferMediaType(mediaFile) : 'text',
        mediaBlob: mediaFile ?? null,
        mediaName: mediaFile?.name ?? null,
        mediaMimeType: mediaFile?.type ?? null,
        createdAt: new Date().toISOString(),
      })

      const outcomes = await flushMessageOutbox(userId)
      if (requestGeneration === generationRef.current) {
        outcomes
          .filter(outcome => outcome.state === 'sent')
          .forEach(addDeliveredOutcome)
      }

      // Persistence succeeded even if delivery is waiting for connectivity or
      // is visibly failed in the outbox bubble. The composer may clear safely.
      return true
    } catch (error) {
      if (requestGeneration === generationRef.current) {
        setSendError(
          error instanceof Error ? error.message : t('Failed to send message.'),
        )
      }
      return false
    } finally {
      if (requestGeneration === generationRef.current) setIsSending(false)
    }
  }, [addDeliveredOutcome, conversationId, sender, t, userId])

  const retryOutboxMessage = useCallback(async (clientId: string) => {
    if (!userId) return
    const requestGeneration = generationRef.current
    setSendError(null)
    try {
      const outcomes = await retryQueuedMessage(userId, clientId)
      if (requestGeneration === generationRef.current) {
        outcomes
          .filter(outcome => outcome.state === 'sent')
          .forEach(addDeliveredOutcome)
      }
    } catch (error) {
      if (requestGeneration === generationRef.current) {
        setSendError(
          error instanceof Error ? error.message : t('Failed to send message.'),
        )
      }
    }
  }, [addDeliveredOutcome, t, userId])

  const discardOutboxMessage = useCallback(async (clientId: string) => {
    if (!userId) return
    const requestGeneration = generationRef.current
    const { error } = await discardQueuedMessage(userId, clientId)
    if (error && requestGeneration === generationRef.current) {
      setSendError(error.message)
    }
  }, [userId])

  // Realtime INSERTs are deduplicated against fetched and RPC-returned rows.
  useEffect(() => {
    if (!conversationId || !userId) return

    const generation = generationRef.current
    let cancelled = false
    let catchUpRequestSerial = 0
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
            client_id: string
            content: string | null
            media_type: MessageMediaType
            media_url: string | null
            created_at: string
          }

          if (!row?.id || messageIdsRef.current.has(row.id)) return

          const rowSender = row.sender_id === userId && sender
            ? sender
            : (await fetchPublicProfile(row.sender_id)) ?? ({
              id: row.sender_id,
              username: 'Unknown',
              name: null,
              photo_url: null,
            } satisfies MessageUser)

          if (cancelled || generation !== generationRef.current) return
          if (messageIdsRef.current.has(row.id)) return
          messageIdsRef.current.add(row.id)

          const incoming: Message = {
            id: row.id,
            conversation_id: row.conversation_id,
            sender_id: row.sender_id,
            client_id: row.client_id,
            content: row.content,
            media_type: row.media_type,
            media_url: row.media_url,
            created_at: row.created_at,
            sender: rowSender,
          }

          setMessages(previous => [...previous, incoming].sort(
            compareMessages,
          ))
          if (row.sender_id !== userId) {
            await markReadAndNotify(conversationId, row.created_at)
          }
        },
      )
      .subscribe(status => {
        if (
          status !== 'SUBSCRIBED'
          || cancelled
          || generation !== generationRef.current
        ) return

        // The initial SELECT may have snapshotted before the channel joined.
        // Fetch the first page once the subscription is active and merge it
        // with both the initial response and any delivered Realtime rows.
        const catchUpRequest = ++catchUpRequestSerial
        firstPageCatchUpRef.current = { generation, status: 'pending' }
        void (async () => {
          const { data, error: catchUpError } = await getMessagesApi(
            conversationId,
            userId,
            null,
            PAGE_SIZE,
          )
          if (
            cancelled
            || generation !== generationRef.current
            || catchUpRequest !== catchUpRequestSerial
          ) return
          if (catchUpError) {
            firstPageCatchUpRef.current = { generation, status: 'failed' }
            setLoadError(catchUpError.message)
            setLoadedConversationId(conversationId)
            setLoadedParticipantDeleted(participantDeleted)
            setLoadedOwnerId(userId)
            setIsLoading(false)
            return
          }

          firstPageCatchUpRef.current = { generation, status: 'succeeded' }
          const oldestFirst = [...data].reverse()
          oldestFirst.forEach(message => messageIdsRef.current.add(message.id))
          setMessages(previous => {
            const byId = new Map(
              previous
                .filter(message => message.conversation_id === conversationId)
                .map(message => [message.id, message]),
            )
            oldestFirst.forEach(message => byId.set(message.id, message))
            return [...byId.values()].sort(compareMessages)
          })
          setLoadError(null)
          setLoadedConversationId(conversationId)
          setLoadedParticipantDeleted(participantDeleted)
          setLoadedOwnerId(userId)
          setHasMore(data.length >= PAGE_SIZE)
          if (oldestFirst.length > 0) {
            const catchUpCursor = messageCursor(oldestFirst[0])
            if (
              cursorRef.current === null
              || catchUpCursor.localeCompare(cursorRef.current) < 0
            ) {
              cursorRef.current = catchUpCursor
            }
          }
          setIsLoading(false)
          await markReadAndNotify(conversationId, data[0]?.created_at ?? null)
        })()
      })

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [
    conversationId,
    markReadAndNotify,
    participantDeleted,
    reloadToken,
    sender,
    userId,
  ])

  const retry = useCallback(() => {
    setReloadToken(value => value + 1)
  }, [])

  const dismissSendError = useCallback(() => {
    setSendError(null)
  }, [])

  const combinedMessages = useMemo(() => {
    const deliveredClientIds = new Set(
      messages.map(message => message.client_id).filter(Boolean),
    )
    const deliveredIds = new Set(messages.map(message => message.id))
    return [
      ...messages,
      ...outboxMessages.filter(message => (
        !message.outbox_client_id
        || (
          !deliveredClientIds.has(message.outbox_client_id)
          && !deliveredIds.has(message.outbox_client_id)
        )
      )),
    ].sort(compareMessages)
  }, [messages, outboxMessages])

  const isCurrentConversation = Boolean(conversationId)
    && Boolean(userId)
    && loadedOwnerId === userId
    && loadedConversationId === conversationId
    && loadedParticipantDeleted === participantDeleted

  return {
    messages: isCurrentConversation ? combinedMessages : [],
    isLoading: Boolean(conversationId) && !isCurrentConversation ? true : isLoading,
    isLoadingMore: isCurrentConversation ? isLoadingMore : false,
    hasMore,
    isSending: isCurrentConversation ? isSending : false,
    loadError: isCurrentConversation ? loadError : null,
    sendError: isCurrentConversation ? sendError : null,
    loadMore,
    retry,
    sendMessage,
    retryOutboxMessage,
    discardOutboxMessage,
    dismissSendError,
  }
}
