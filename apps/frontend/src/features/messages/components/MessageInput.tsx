import React, { useCallback, useRef, useState } from 'react'

interface MessageInputProps {
  onSend: (content: string, mediaFile?: File) => void | Promise<void>
  isSending: boolean
}

const ACCEPT_MIME =
  'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav,audio/ogg,audio/webm'

export default function MessageInput({ onSend, isSending }: MessageInputProps) {
  const [content, setContent] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canSend = (!!content.trim() || !!mediaFile) && !isSending

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setMediaFile(file)
  }, [])

  const removeMedia = useCallback(() => {
    setMediaFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleSend = useCallback(async () => {
    if (!canSend) return
    const text = content
    const file = mediaFile ?? undefined

    setContent('')
    removeMedia()

    await onSend(text, file)
  }, [canSend, content, mediaFile, onSend, removeMedia])

  return (
    <div className="bg-(--bg-surface) border-t border-(--border-subtle) px-3 py-2">
      {mediaFile && (
        <div className="mb-2 flex items-center gap-2">
          <div className="flex items-center gap-2 max-w-full px-3 py-2 bg-(--bg-surface-2) border border-(--border-subtle) rounded-(--radius-card)">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-(--text-muted) flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828L18 9.828a4 4 0 10-5.656-5.656L6.343 10.172a6 6 0 108.485 8.485L20.5 13"
              />
            </svg>
            <span className="text-xs text-(--text-secondary) truncate">
              {mediaFile.name}
            </span>
          </div>

          <button
            onClick={removeMedia}
            type="button"
            className="w-8 h-8 rounded-full flex items-center justify-center text-(--text-muted) hover:bg-(--bg-hover) hover:text-(--text-primary) transition-colors"
            aria-label="Remove attachment"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-10 h-10 rounded-(--radius-button) flex items-center justify-center text-(--text-secondary) hover:bg-(--bg-hover) hover:text-(--brand-yellow) transition-colors"
          aria-label="Attach media"
          disabled={isSending}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
            />
          </svg>
        </button>

        <input
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void handleSend()
            }
          }}
          placeholder="Write message..:"
          className="flex-1 h-10 px-4 bg-(--bg-surface-2) border border-(--border-subtle) rounded-(--radius-input) text-sm text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-1 focus:ring-(--brand-yellow)"
          disabled={isSending}
        />

        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!canSend}
          className="h-10 px-4 rounded-(--radius-button) bg-(--brand-yellow) text-(--bg-primary) text-sm font-semibold hover:bg-(--brand-yellow-soft) transition-colors disabled:opacity-40"
          aria-label="Send"
        >
          {isSending ? 'Sending...' : 'Send'}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_MIME}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  )
}
