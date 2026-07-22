import { describe, expect, it } from 'vitest'
import { isConversationUnavailableError, MessageApiError } from './messageErrors'

describe('message API errors', () => {
  it('recognises the privacy-preserving peer-unavailable response', () => {
    const error = new MessageApiError({ code: '42501', message: 'Message not sent' })

    expect(isConversationUnavailableError(error)).toBe(true)
  })

  it('does not permanently disable messaging for an unrelated failure', () => {
    const error = new MessageApiError({ code: '08006', message: 'Connection failed' })

    expect(isConversationUnavailableError(error)).toBe(false)
  })
})
