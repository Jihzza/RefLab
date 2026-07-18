import {
  MESSAGES_OUTBOX_CHANGED_EVENT,
  type QueuedMessage,
} from '../types'
import {
  getMessageMediaPathForMime,
  MAX_MESSAGE_MEDIA_BYTES,
} from '../mediaConfig'

const DATABASE_NAME = 'reflab-message-outbox'
const DATABASE_VERSION = 2
const STORE_NAME = 'messages'
const PURGED_SENDERS_STORE = 'purgedSenders'
const SENDER_INDEX = 'senderId'
const SENDER_CONVERSATION_INDEX = 'senderConversation'
const BROADCAST_CHANNEL_NAME = 'reflab-message-outbox'

type OutboxChangedDetail = {
  senderId: string
  conversationId: string
}

let databasePromise: Promise<IDBDatabase> | null = null
let broadcastChannel: BroadcastChannel | null = null

function requireIndexedDb(): IDBFactory {
  if (typeof window === 'undefined' || !window.indexedDB) {
    throw new Error('Offline message storage is unavailable in this browser.')
  }
  return window.indexedDB
}

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise

  databasePromise = new Promise((resolve, reject) => {
    const request = requireIndexedDb().open(DATABASE_NAME, DATABASE_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result
      const store = database.objectStoreNames.contains(STORE_NAME)
        ? request.transaction!.objectStore(STORE_NAME)
        : database.createObjectStore(STORE_NAME, { keyPath: 'clientId' })

      if (!store.indexNames.contains(SENDER_INDEX)) {
        store.createIndex(SENDER_INDEX, 'senderId', { unique: false })
      }
      if (!store.indexNames.contains(SENDER_CONVERSATION_INDEX)) {
        store.createIndex(
          SENDER_CONVERSATION_INDEX,
          ['senderId', 'conversationId'],
          { unique: false },
        )
      }
      if (!database.objectStoreNames.contains(PURGED_SENDERS_STORE)) {
        database.createObjectStore(PURGED_SENDERS_STORE, { keyPath: 'senderId' })
      }
    }

    request.onsuccess = () => {
      request.result.onversionchange = () => {
        request.result.close()
        databasePromise = null
      }
      request.result.onclose = () => {
        databasePromise = null
      }
      resolve(request.result)
    }
    request.onerror = () => {
      databasePromise = null
      reject(request.error ?? new Error('Could not open the message outbox.'))
    }
    request.onblocked = () => {
      databasePromise = null
      reject(new Error('The message outbox upgrade is blocked by another tab.'))
    }
  })

  return databasePromise
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Message outbox request failed.'))
  })
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(
      transaction.error ?? new Error('Message outbox transaction failed.'),
    )
    transaction.onabort = () => reject(
      transaction.error ?? new Error('Message outbox transaction was aborted.'),
    )
  })
}

function abortTransaction(transaction: IDBTransaction) {
  try {
    transaction.abort()
  } catch (error) {
    void error
  }
}

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null
  if (!broadcastChannel) {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
  }
  return broadcastChannel
}

function emitOutboxChanged(detail: OutboxChangedDetail) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<OutboxChangedDetail>(
      MESSAGES_OUTBOX_CHANGED_EVENT,
      { detail },
    ))
  }
  getBroadcastChannel()?.postMessage(detail)
}

async function ensureMediaCanBePersisted(mediaBlob: Blob | null) {
  if (!mediaBlob) return
  if (mediaBlob.size > MAX_MESSAGE_MEDIA_BYTES) {
    throw new Error('The attachment is larger than the 20 MB message limit.')
  }

  if (!navigator.storage?.estimate) return
  const estimate = await navigator.storage.estimate()
  if (
    typeof estimate.quota === 'number'
    && typeof estimate.usage === 'number'
    && estimate.quota - estimate.usage < mediaBlob.size * 1.1
  ) {
    throw new Error('There is not enough browser storage to queue this attachment.')
  }
}

export async function enqueueMessage(
  message: Omit<QueuedMessage, 'state' | 'attempts' | 'lastError' | 'updatedAt'>,
): Promise<QueuedMessage> {
  await ensureMediaCanBePersisted(message.mediaBlob)
  const database = await openDatabase()
  const transaction = database.transaction(
    [STORE_NAME, PURGED_SENDERS_STORE],
    'readwrite',
  )
  const completion = transactionComplete(transaction)
  let senderWasPurged: unknown
  try {
    senderWasPurged = await requestResult(
      transaction.objectStore(PURGED_SENDERS_STORE).get(message.senderId),
    )
  } catch (error) {
    abortTransaction(transaction)
    await completion.catch(() => undefined)
    throw error
  }
  if (senderWasPurged) {
    abortTransaction(transaction)
    await completion.catch(() => undefined)
    throw new Error('Message sending is unavailable after account deletion.')
  }
  const now = new Date().toISOString()
  const record: QueuedMessage = {
    ...message,
    state: 'queued',
    attempts: 0,
    lastError: null,
    updatedAt: now,
  }

  transaction.objectStore(STORE_NAME).put(record)
  await completion
  emitOutboxChanged({
    senderId: record.senderId,
    conversationId: record.conversationId,
  })
  return record
}

export async function getQueuedMessage(clientId: string): Promise<QueuedMessage | null> {
  const database = await openDatabase()
  const transaction = database.transaction(STORE_NAME, 'readonly')
  const value = await requestResult(
    transaction.objectStore(STORE_NAME).get(clientId),
  )
  return (value as QueuedMessage | undefined) ?? null
}

export async function listQueuedMessages(
  senderId: string,
  conversationId?: string,
): Promise<QueuedMessage[]> {
  const database = await openDatabase()
  const transaction = database.transaction(STORE_NAME, 'readonly')
  const store = transaction.objectStore(STORE_NAME)
  const request = conversationId
    ? store.index(SENDER_CONVERSATION_INDEX).getAll(
      IDBKeyRange.only([senderId, conversationId]),
    )
    : store.index(SENDER_INDEX).getAll(IDBKeyRange.only(senderId))
  const records = await requestResult(request) as QueuedMessage[]
  return records.sort((left, right) => left.createdAt.localeCompare(right.createdAt))
}

export async function updateQueuedMessage(
  clientId: string,
  update: Partial<Pick<QueuedMessage, 'state' | 'attempts' | 'lastError'>>,
): Promise<QueuedMessage | null> {
  const database = await openDatabase()
  const transaction = database.transaction(
    [STORE_NAME, PURGED_SENDERS_STORE],
    'readwrite',
  )
  const completion = transactionComplete(transaction)

  try {
    const store = transaction.objectStore(STORE_NAME)
    const current = await requestResult(store.get(clientId)) as QueuedMessage | undefined
    if (!current) {
      await completion
      return null
    }

    // The message read, account tombstone check, and write share one IndexedDB
    // transaction. A concurrent account purge therefore either runs before us
    // (and blocks this write) or after us (and deletes the resulting record).
    const senderWasPurged = await requestResult(
      transaction.objectStore(PURGED_SENDERS_STORE).get(current.senderId),
    )
    if (senderWasPurged) {
      await completion
      return null
    }

    const next: QueuedMessage = {
      ...current,
      ...update,
      updatedAt: new Date().toISOString(),
    }
    store.put(next)
    await completion
    emitOutboxChanged({ senderId: next.senderId, conversationId: next.conversationId })
    return next
  } catch (error) {
    abortTransaction(transaction)
    await completion.catch(() => undefined)
    throw error
  }
}

export async function deleteQueuedMessage(clientId: string): Promise<QueuedMessage | null> {
  const database = await openDatabase()
  const transaction = database.transaction(STORE_NAME, 'readwrite')
  const completion = transactionComplete(transaction)

  try {
    const store = transaction.objectStore(STORE_NAME)
    const current = await requestResult(store.get(clientId)) as QueuedMessage | undefined
    if (!current) {
      await completion
      return null
    }

    store.delete(clientId)
    await completion
    emitOutboxChanged({
      senderId: current.senderId,
      conversationId: current.conversationId,
    })
    return current
  } catch (error) {
    abortTransaction(transaction)
    await completion.catch(() => undefined)
    throw error
  }
}

/** Block new/local delivery without deleting rows until the server decides. */
export async function blockMessageOutboxForSender(senderId: string): Promise<void> {
  const database = await openDatabase()
  const transaction = database.transaction(PURGED_SENDERS_STORE, 'readwrite')
  const completion = transactionComplete(transaction)
  transaction.objectStore(PURGED_SENDERS_STORE).put({
    senderId,
    purgedAt: new Date().toISOString(),
  })
  await completion
}

/** Permanently remove only one account's queued plaintext/media from this device. */
export async function deleteQueuedMessagesForSender(senderId: string): Promise<void> {
  const database = await openDatabase()
  const transaction = database.transaction(
    [STORE_NAME, PURGED_SENDERS_STORE],
    'readwrite',
  )
  const completion = transactionComplete(transaction)
  const store = transaction.objectStore(STORE_NAME)
  transaction.objectStore(PURGED_SENDERS_STORE).put({
    senderId,
    purgedAt: new Date().toISOString(),
  })

  const conversationIds = new Set<string>()
  try {
    await new Promise<void>((resolve, reject) => {
      const request = store.index(SENDER_INDEX).openCursor(IDBKeyRange.only(senderId))
      request.onsuccess = () => {
        const cursor = request.result
        if (!cursor) {
          resolve()
          return
        }
        const record = cursor.value as QueuedMessage
        conversationIds.add(record.conversationId)
        cursor.delete()
        cursor.continue()
      }
      request.onerror = () => reject(
        request.error ?? new Error('Could not purge the message outbox.'),
      )
    })
    await completion
  } catch (error) {
    abortTransaction(transaction)
    await completion.catch(() => undefined)
    throw error
  }

  conversationIds.forEach(conversationId => {
    emitOutboxChanged({ senderId, conversationId })
  })
}

/** Remove only the deletion tombstone after a definitive rejected request. */
export async function restoreMessageOutboxForSender(senderId: string): Promise<void> {
  const database = await openDatabase()
  const transaction = database.transaction(PURGED_SENDERS_STORE, 'readwrite')
  const completion = transactionComplete(transaction)
  transaction.objectStore(PURGED_SENDERS_STORE).delete(senderId)
  await completion
}

export function subscribeToMessageOutbox(
  listener: (detail: OutboxChangedDetail) => void,
): () => void {
  const handleWindowEvent = (event: Event) => {
    const detail = (event as CustomEvent<OutboxChangedDetail>).detail
    if (detail) listener(detail)
  }
  const channel = getBroadcastChannel()
  const handleBroadcast = (event: MessageEvent<OutboxChangedDetail>) => {
    if (event.data) listener(event.data)
  }

  window.addEventListener(MESSAGES_OUTBOX_CHANGED_EVENT, handleWindowEvent)
  channel?.addEventListener('message', handleBroadcast)

  return () => {
    window.removeEventListener(MESSAGES_OUTBOX_CHANGED_EVENT, handleWindowEvent)
    channel?.removeEventListener('message', handleBroadcast)
  }
}

export function getMessageMediaPath(message: Pick<
  QueuedMessage,
  'conversationId' | 'senderId' | 'clientId' | 'mediaName' | 'mediaMimeType'
>): string | null {
  if (!message.mediaName) return null
  return getMessageMediaPathForMime(
    message.conversationId,
    message.senderId,
    message.clientId,
    message.mediaMimeType,
  )
}
