// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { QueuedMessage } from '../types'

const mocks = vi.hoisted(() => ({
  sendMessage: vi.fn(),
  deleteMessageMedia: vi.fn(),
  deleteQueuedMessage: vi.fn(),
  getMessageMediaPath: vi.fn(),
  getQueuedMessage: vi.fn(),
  listQueuedMessages: vi.fn(),
  updateQueuedMessage: vi.fn(),
}))

vi.mock('../api/messagesApi', () => ({
  sendMessage: mocks.sendMessage,
  deleteMessageMedia: mocks.deleteMessageMedia,
}))

vi.mock('./messageOutbox', () => ({
  deleteQueuedMessage: mocks.deleteQueuedMessage,
  getMessageMediaPath: mocks.getMessageMediaPath,
  getQueuedMessage: mocks.getQueuedMessage,
  listQueuedMessages: mocks.listQueuedMessages,
  updateQueuedMessage: mocks.updateQueuedMessage,
}))

import {
  flushMessageOutbox,
  discardQueuedMessage,
  pauseMessageOutboxForSender,
  resumeMessageOutboxForSender,
} from './messageOutboxDelivery'

const SENDER_A = '10000000-0000-4000-8000-000000000001'
const SENDER_B = '10000000-0000-4000-8000-000000000002'

function queuedMessage(senderId = SENDER_A): QueuedMessage {
  return {
    clientId: '20000000-0000-4000-8000-000000000001',
    conversationId: '30000000-0000-4000-8000-000000000001',
    senderId,
    content: 'queued by A',
    mediaType: 'text',
    mediaBlob: null,
    mediaName: null,
    mediaMimeType: null,
    createdAt: '2026-07-18T10:00:00.000Z',
    updatedAt: '2026-07-18T10:00:00.000Z',
    state: 'queued',
    attempts: 0,
    lastError: null,
  }
}

describe('message outbox auth boundary', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    resumeMessageOutboxForSender(SENDER_A)
    resumeMessageOutboxForSender(SENDER_B)
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    })
    mocks.deleteQueuedMessage.mockResolvedValue(null)
    mocks.deleteMessageMedia.mockResolvedValue({ error: null })
    mocks.getQueuedMessage.mockResolvedValue(null)
    mocks.getMessageMediaPath.mockReturnValue(null)
  })

  it('cancels a scheduled retry for A when auth switches to B', async () => {
    const message = queuedMessage()
    mocks.listQueuedMessages.mockResolvedValue([message])
    mocks.updateQueuedMessage.mockImplementation(async (
      _clientId: string,
      update: Partial<QueuedMessage>,
    ) => ({ ...message, ...update }))
    mocks.sendMessage.mockResolvedValue({
      data: null,
      error: new Error('temporary network failure'),
      retryable: true,
      mediaPath: null,
    })

    await flushMessageOutbox(SENDER_A)
    expect(mocks.sendMessage).toHaveBeenCalledTimes(1)

    pauseMessageOutboxForSender(SENDER_A)
    resumeMessageOutboxForSender(SENDER_B)
    await vi.advanceTimersByTimeAsync(60_000)

    expect(mocks.sendMessage).toHaveBeenCalledTimes(1)
  })

  it('requeues an in-flight A record before remote send, then resumes only after A logs in again', async () => {
    let durable = queuedMessage()
    let resolveSending!: (message: QueuedMessage) => void
    const sendingTransition = new Promise<QueuedMessage>(resolve => {
      resolveSending = resolve
    })
    let updateCount = 0

    mocks.listQueuedMessages.mockImplementation(async () => [durable])
    mocks.updateQueuedMessage.mockImplementation((
      _clientId: string,
      update: Partial<QueuedMessage>,
    ) => {
      updateCount += 1
      if (updateCount === 1) {
        return sendingTransition.then(message => {
          durable = message
          return message
        })
      }
      durable = { ...durable, ...update }
      return Promise.resolve(durable)
    })
    mocks.sendMessage.mockResolvedValue({
      data: { id: '40000000-0000-4000-8000-000000000001' },
      error: null,
      retryable: false,
      mediaPath: null,
    })

    const suspendedFlush = flushMessageOutbox(SENDER_A)
    await Promise.resolve()
    await Promise.resolve()
    expect(mocks.updateQueuedMessage).toHaveBeenCalledTimes(1)

    pauseMessageOutboxForSender(SENDER_A)
    resumeMessageOutboxForSender(SENDER_B)
    resolveSending({ ...durable, state: 'sending', attempts: 1 })

    await expect(suspendedFlush).resolves.toEqual([])
    expect(mocks.sendMessage).not.toHaveBeenCalled()
    expect(durable).toEqual(expect.objectContaining({
      state: 'queued',
      attempts: 1,
      lastError: null,
    }))

    expect(await flushMessageOutbox(SENDER_A)).toEqual([])
    expect(mocks.sendMessage).not.toHaveBeenCalled()

    resumeMessageOutboxForSender(SENDER_A)
    const outcomes = await flushMessageOutbox(SENDER_A)

    expect(mocks.sendMessage).toHaveBeenCalledTimes(1)
    expect(mocks.updateQueuedMessage).toHaveBeenNthCalledWith(
      3,
      durable.clientId,
      expect.objectContaining({ state: 'sending', attempts: 2 }),
    )
    expect(mocks.sendMessage).toHaveBeenCalledWith(
      durable.conversationId,
      SENDER_A,
      durable.clientId,
      durable.content,
      durable.mediaType,
      undefined,
      expect.any(Function),
    )
    expect(outcomes).toEqual([
      expect.objectContaining({ clientId: durable.clientId, state: 'sent' }),
    ])
  })

  it('retains upload evidence after a pause so discard deletes the exact deterministic object', async () => {
    const expectedPath = `${queuedMessage().conversationId}/${SENDER_A}/${queuedMessage().clientId}.jpg`
    let durable: QueuedMessage = {
      ...queuedMessage(),
      mediaType: 'image',
      mediaBlob: new Blob(['image'], { type: 'image/jpeg' }),
      mediaName: 'evidence.jpg',
      mediaMimeType: 'image/jpeg',
    }
    let resolveDelivery!: (result: {
      data: null
      error: Error
      retryable: true
      mediaPath: string
    }) => void
    let deliveryGuard: (() => boolean) | undefined

    mocks.listQueuedMessages.mockImplementation(async () => [durable])
    mocks.updateQueuedMessage.mockImplementation(async (
      _clientId: string,
      update: Partial<QueuedMessage>,
    ) => {
      durable = { ...durable, ...update }
      return durable
    })
    mocks.sendMessage.mockImplementation((...args: unknown[]) => {
      deliveryGuard = args[6] as () => boolean
      return new Promise(resolve => {
        resolveDelivery = resolve
      })
    })

    const flush = flushMessageOutbox(SENDER_A)
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    expect(mocks.sendMessage).toHaveBeenCalledTimes(1)

    pauseMessageOutboxForSender(SENDER_A)
    expect(deliveryGuard?.()).toBe(false)
    resolveDelivery({
      data: null,
      error: new Error('paused after upload'),
      retryable: true,
      mediaPath: expectedPath,
    })
    await expect(flush).resolves.toEqual([])

    expect(durable).toEqual(expect.objectContaining({
      state: 'queued',
      attempts: 1,
    }))

    mocks.getQueuedMessage.mockImplementation(async () => durable)
    mocks.getMessageMediaPath.mockReturnValue(expectedPath)
    mocks.deleteQueuedMessage.mockResolvedValue(durable)

    await expect(discardQueuedMessage(SENDER_A, durable.clientId))
      .resolves.toEqual({ error: null })
    expect(mocks.getMessageMediaPath).toHaveBeenCalledWith(durable)
    expect(mocks.deleteMessageMedia).toHaveBeenCalledWith(expectedPath)
    expect(mocks.deleteQueuedMessage).toHaveBeenCalledWith(durable.clientId)
  })
})
