// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    rpc: mocks.rpc,
    storage: {
      from: vi.fn(() => ({
        upload: mocks.upload,
        remove: mocks.remove,
      })),
    },
  },
}))

import { markConversationRead, sendMessage } from './messagesApi'

const SENDER_A = '10000000-0000-4000-8000-000000000001'
const CONVERSATION = '20000000-0000-4000-8000-000000000001'
const CLIENT_ID = '30000000-0000-4000-8000-000000000001'

describe('sendMessage auth boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    })
    mocks.remove.mockResolvedValue({ error: null })
  })

  it('does not invoke the message RPC if A is paused while media upload is in flight', async () => {
    let resolveUpload!: (result: { error: null }) => void
    mocks.upload.mockReturnValue(new Promise(resolve => {
      resolveUpload = resolve
    }))
    let active = true

    const delivery = sendMessage(
      CONVERSATION,
      SENDER_A,
      CLIENT_ID,
      null,
      'image',
      new File(['image'], 'proof.jpg', { type: 'image/jpeg' }),
      () => active,
    )
    await Promise.resolve()
    expect(mocks.upload).toHaveBeenCalledTimes(1)

    active = false
    resolveUpload({ error: null })
    const result = await delivery

    expect(result).toEqual(expect.objectContaining({
      data: null,
      retryable: true,
      mediaPath: `${CONVERSATION}/${SENDER_A}/${CLIENT_ID}.jpg`,
    }))
    expect(mocks.rpc).not.toHaveBeenCalled()
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it('binds every RPC to the sender identity expected by the outbox', async () => {
    mocks.rpc.mockResolvedValue({
      data: { id: '40000000-0000-4000-8000-000000000001' },
      error: null,
    })

    const result = await sendMessage(
      CONVERSATION,
      SENDER_A,
      CLIENT_ID,
      'identity bound',
    )

    expect(result.error).toBeNull()
    expect(mocks.rpc).toHaveBeenCalledWith('send_message', {
      p_conversation_id: CONVERSATION,
      p_expected_sender_id: SENDER_A,
      p_client_id: CLIENT_ID,
      p_content: 'identity bound',
      p_media_type: 'text',
      p_media_url: null,
    })
  })
})

describe('markConversationRead auth boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('binds a queued read cursor to its captured reader', async () => {
    mocks.rpc.mockResolvedValue({
      data: '2026-07-18T10:00:00.000Z',
      error: null,
    })

    await markConversationRead(
      CONVERSATION,
      SENDER_A,
      '2026-07-18T10:00:00.000Z',
    )

    expect(mocks.rpc).toHaveBeenCalledWith('mark_conversation_read', {
      p_conversation_id: CONVERSATION,
      p_expected_reader_id: SENDER_A,
      p_read_through: '2026-07-18T10:00:00.000Z',
    })
  })
})
