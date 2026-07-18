import {
  deleteMessageMedia,
  sendMessage,
  type MessageDeliveryResult,
} from '../api/messagesApi'
import type { QueuedMessage } from '../types'
import {
  deleteQueuedMessage,
  getMessageMediaPath,
  getQueuedMessage,
  listQueuedMessages,
  updateQueuedMessage,
} from './messageOutbox'

export interface OutboxDeliveryOutcome {
  clientId: string
  conversationId: string
  result: MessageDeliveryResult
  state: 'sent' | 'queued' | 'failed'
}

const senderFlushes = new Map<string, Promise<OutboxDeliveryOutcome[]>>()
const senderRetryTimers = new Map<string, number>()
const pausedSenders = new Set<string>()
const senderDeliveryRevisions = new Map<string, number>()

function getSenderDeliveryRevision(senderId: string): number {
  return senderDeliveryRevisions.get(senderId) ?? 0
}

function canDeliverForSender(senderId: string, revision: number): boolean {
  return !pausedSenders.has(senderId)
    && getSenderDeliveryRevision(senderId) === revision
}

function clearScheduledRetry(senderId: string) {
  const timer = senderRetryTimers.get(senderId)
  if (timer === undefined) return
  window.clearTimeout(timer)
  senderRetryTimers.delete(senderId)
}

function scheduleRetry(senderId: string, attempts: number) {
  if (
    pausedSenders.has(senderId)
    || !navigator.onLine
    || senderRetryTimers.has(senderId)
  ) return
  const delay = Math.min(30_000, 1_000 * (2 ** Math.min(attempts, 5)))
  const timer = window.setTimeout(() => {
    senderRetryTimers.delete(senderId)
    if (pausedSenders.has(senderId)) return
    void flushMessageOutbox(senderId).catch(error => {
      console.error('Failed to retry the persistent message outbox:', error)
    })
  }, delay)
  senderRetryTimers.set(senderId, timer)
}

function materializeFile(message: QueuedMessage): File | undefined {
  if (!message.mediaBlob || !message.mediaName) return undefined
  return new File([message.mediaBlob], message.mediaName, {
    type: message.mediaMimeType ?? message.mediaBlob.type,
    lastModified: new Date(message.createdAt).getTime(),
  })
}

async function restoreAbortedRecord(message: QueuedMessage): Promise<void> {
  await updateQueuedMessage(message.clientId, {
    state: 'queued',
    lastError: null,
  })
}

async function deliverRecord(
  message: QueuedMessage,
  revision: number,
): Promise<OutboxDeliveryOutcome | null> {
  if (!canDeliverForSender(message.senderId, revision)) return null

  const sending = await updateQueuedMessage(message.clientId, {
    state: 'sending',
    attempts: message.attempts + 1,
    lastError: null,
  })
  if (!sending) {
    // A concurrent account purge/discard won the IndexedDB transaction. Never
    // deliver the stale in-memory snapshot after its durable record vanished.
    return {
      clientId: message.clientId,
      conversationId: message.conversationId,
      result: {
        data: null,
        error: new Error('Message sending was cancelled before delivery.'),
        retryable: false,
        mediaPath: null,
      },
      state: 'failed',
    }
  }
  const active = sending

  // The IndexedDB transition above is asynchronous. A sign-out or account
  // switch may have paused this sender while it was in flight. Restore the
  // durable row before doing any remote work; a later login for the same
  // account can safely resume it.
  if (!canDeliverForSender(active.senderId, revision)) {
    await restoreAbortedRecord(active)
    return null
  }

  const result = await sendMessage(
    active.conversationId,
    active.senderId,
    active.clientId,
    active.content,
    active.mediaType,
    materializeFile(active),
    () => canDeliverForSender(active.senderId, revision),
  )

  // sendMessage also checks the guard between a media upload and its RPC. A
  // pause while either remote request was in flight leaves the idempotent row
  // queued instead of allowing the old session's delivery loop to continue.
  if (!canDeliverForSender(active.senderId, revision)) {
    await restoreAbortedRecord(active)
    return null
  }

  if (!result.error && result.data) {
    await deleteQueuedMessage(active.clientId)
    return {
      clientId: active.clientId,
      conversationId: active.conversationId,
      result,
      state: 'sent',
    }
  }

  const nextState = result.retryable ? 'queued' : 'failed'
  await updateQueuedMessage(active.clientId, {
    state: nextState,
    lastError: result.error?.message ?? 'Failed to send message.',
  })

  return {
    clientId: active.clientId,
    conversationId: active.conversationId,
    result,
    state: nextState,
  }
}

async function flushSender(
  senderId: string,
): Promise<OutboxDeliveryOutcome[]> {
  const revision = getSenderDeliveryRevision(senderId)
  if (!navigator.onLine || !canDeliverForSender(senderId, revision)) return []

  // A single sender-wide ordered flush prevents a conversation-scoped request
  // from hiding older work queued in another tab or route.
  const messages = await listQueuedMessages(senderId)
  if (!canDeliverForSender(senderId, revision)) return []
  const deliverable = messages.filter(message => message.state !== 'failed')
  const outcomes: OutboxDeliveryOutcome[] = []

  for (const message of deliverable) {
    if (!navigator.onLine || !canDeliverForSender(senderId, revision)) break
    const outcome = await deliverRecord(message, revision)
    if (!canDeliverForSender(senderId, revision)) break
    if (!outcome) continue
    outcomes.push(outcome)
    if (outcome.state === 'queued') {
      scheduleRetry(senderId, message.attempts + 1)
      break
    }
  }

  return outcomes
}

export function flushMessageOutbox(
  senderId: string,
): Promise<OutboxDeliveryOutcome[]> {
  if (pausedSenders.has(senderId)) return Promise.resolve([])

  const existing = senderFlushes.get(senderId)
  if (existing) {
    // The active flush may have taken its IndexedDB snapshot just before this
    // caller enqueued a record. Always take one follow-up pass for a concurrent
    // request so a message cannot wait for the next focus/online event.
    return existing.then(async firstPass => [
      ...firstPass,
      ...await flushMessageOutbox(senderId),
    ])
  }

  clearScheduledRetry(senderId)

  const promise = flushSender(senderId).finally(() => {
    if (senderFlushes.get(senderId) === promise) senderFlushes.delete(senderId)
  })
  senderFlushes.set(senderId, promise)
  return promise
}

/**
 * Synchronously close the sender's delivery boundary before auth state moves.
 * Incrementing the revision permanently cancels every pre-pause async pass,
 * even if the same account is resumed before that pass settles.
 */
export function pauseMessageOutboxForSender(senderId: string): void {
  pausedSenders.add(senderId)
  senderDeliveryRevisions.set(
    senderId,
    getSenderDeliveryRevision(senderId) + 1,
  )
  clearScheduledRetry(senderId)
}

/** Re-open delivery only for an explicitly authenticated sender. */
export function resumeMessageOutboxForSender(senderId: string): void {
  pausedSenders.delete(senderId)
}

/** Stop retries and wait until any already-started delivery pass settles. */
export async function quiesceMessageOutboxForSender(senderId: string): Promise<void> {
  clearScheduledRetry(senderId)
  const activeFlush = senderFlushes.get(senderId)
  if (activeFlush) await activeFlush.catch(() => undefined)
  clearScheduledRetry(senderId)
}

export async function retryQueuedMessage(
  senderId: string,
  clientId: string,
): Promise<OutboxDeliveryOutcome[]> {
  if (pausedSenders.has(senderId)) return []
  const message = await getQueuedMessage(clientId)
  if (pausedSenders.has(senderId)) return []
  if (!message || message.senderId !== senderId) return []
  await updateQueuedMessage(clientId, { state: 'queued', lastError: null })
  if (pausedSenders.has(senderId)) return []
  return flushMessageOutbox(senderId)
}

export async function discardQueuedMessage(
  senderId: string,
  clientId: string,
): Promise<{ error: Error | null }> {
  const message = await getQueuedMessage(clientId)
  if (!message || message.senderId !== senderId) return { error: null }

  // attempts > 0 means delivery may have uploaded the deterministic object
  // before the request was interrupted. Keep the local record until remote
  // cleanup is confirmed so an offline discard cannot create an orphan.
  const mediaPath = message.attempts > 0 ? getMessageMediaPath(message) : null
  if (mediaPath) {
    const { error } = await deleteMessageMedia(mediaPath)
    if (error) {
      await updateQueuedMessage(clientId, {
        state: 'failed',
        lastError: error.message,
      })
      return { error }
    }
  }

  await deleteQueuedMessage(clientId)
  return { error: null }
}
