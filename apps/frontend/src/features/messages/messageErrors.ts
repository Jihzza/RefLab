type ApiErrorLike = {
  message: string
  code?: string | null
}

export class MessageApiError extends Error {
  readonly code: string | null

  constructor(error: ApiErrorLike) {
    super(error.message)
    this.name = 'MessageApiError'
    this.code = error.code ?? null
  }
}

export function isConversationUnavailableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const code = 'code' in error && typeof error.code === 'string'
    ? error.code
    : null

  return code === '42501'
    && (error.message === 'Message not sent' || error.message === 'Conversation is unavailable')
}
