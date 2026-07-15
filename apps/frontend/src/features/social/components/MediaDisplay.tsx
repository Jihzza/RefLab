import { useState } from 'react'
import { FileAudio, ImageOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getMediaPublicUrl } from '../api/socialApi'
import type { PostMediaType } from '../types'

interface MediaDisplayProps {
  mediaType: PostMediaType
  mediaUrl: string | null
  mediaMetadata?: { width?: number; height?: number } | null
}

/** Renders all supported post media without cropping portrait or wide assets. */
export default function MediaDisplay({
  mediaType,
  mediaUrl,
  mediaMetadata,
}: MediaDisplayProps) {
  const { t } = useTranslation()
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  if (!mediaUrl || mediaType === 'text') return null

  const publicUrl = getMediaPublicUrl(mediaUrl)
  const hasFailed = failedUrl === publicUrl
  const aspectRatio =
    mediaMetadata?.width && mediaMetadata?.height
      ? `${mediaMetadata.width}/${mediaMetadata.height}`
      : undefined

  if (hasFailed) {
    return (
      <div
        role="status"
        className="mt-4 flex min-h-32 flex-col items-center justify-center gap-2 rounded-(--mc-radius-input) border border-dashed border-(--mc-color-border-strong) bg-(--mc-color-canvas) px-4 py-6 text-center text-sm text-(--mc-color-text-muted)"
      >
        <ImageOff className="size-6 text-(--mc-color-warning)" aria-hidden="true" />
        <span>{t('Media unavailable')}</span>
      </div>
    )
  }

  if (mediaType === 'image') {
    return (
      <div className="mt-4 overflow-hidden rounded-(--mc-radius-input) border border-(--mc-color-border) bg-black/25">
        <img
          src={publicUrl}
          alt={t('Post media')}
          loading="lazy"
          decoding="async"
          onError={() => setFailedUrl(publicUrl)}
          className="block max-h-[min(70dvh,40rem)] w-full object-contain"
          style={aspectRatio ? { aspectRatio } : undefined}
        />
      </div>
    )
  }

  if (mediaType === 'video') {
    return (
      <div className="mt-4 overflow-hidden rounded-(--mc-radius-input) border border-(--mc-color-border) bg-black">
        <video
          src={publicUrl}
          controls
          playsInline
          preload="metadata"
          onError={() => setFailedUrl(publicUrl)}
          className="block max-h-[min(70dvh,40rem)] w-full object-contain"
          style={aspectRatio ? { aspectRatio } : undefined}
          aria-label={t('Post video')}
        />
      </div>
    )
  }

  if (mediaType === 'audio') {
    return (
      <div className="mt-4 rounded-(--mc-radius-input) border border-(--mc-color-border) bg-(--mc-color-canvas) p-3 sm:p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-(--mc-color-text-muted)">
          <span className="flex size-9 items-center justify-center rounded-(--mc-radius-compact) bg-(--mc-color-surface-raised) text-(--mc-color-accent)">
            <FileAudio className="size-4" aria-hidden="true" />
          </span>
          {t('Post audio')}
        </div>
        <audio
          src={publicUrl}
          controls
          preload="none"
          onError={() => setFailedUrl(publicUrl)}
          className="block h-10 w-full max-w-full"
          aria-label={t('Post audio')}
        />
      </div>
    )
  }

  return null
}
