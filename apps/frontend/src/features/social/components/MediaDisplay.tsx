import React, { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { getMediaPublicUrl } from '../api/socialApi'
import type { PostMediaType } from '../types'
import { useTranslation } from 'react-i18next'

interface MediaDisplayProps {
  mediaType: PostMediaType
  mediaUrl: string | null
  mediaMetadata?: { width?: number; height?: number } | null
}

/** Renders media content (image, video, or audio) based on type. */
const MediaDisplay: React.FC<MediaDisplayProps> = ({
  mediaType,
  mediaUrl,
  mediaMetadata,
}) => {
  const { t } = useTranslation()
  const [failed, setFailed] = useState(false)

  if (!mediaUrl || mediaType === 'text') return null

  const publicUrl = getMediaPublicUrl(mediaUrl)

  // Graceful fallback when a deleted/expired URL fails to load.
  if (failed) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-(--border-subtle) bg-(--bg-surface-2) px-4 py-6 text-sm text-(--text-muted)">
        <ImageOff className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{t('Media unavailable')}</span>
      </div>
    )
  }

  if (mediaType === 'image') {
    return (
      <div
        className="mt-3 w-full max-h-96 overflow-hidden rounded-lg bg-(--bg-surface-2)"
        style={{
          aspectRatio:
            mediaMetadata?.width && mediaMetadata?.height
              ? `${mediaMetadata.width}/${mediaMetadata.height}`
              : '16/9',
        }}
      >
        <img
          src={publicUrl}
          alt={t('Post media')}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      </div>
    )
  }

  if (mediaType === 'video') {
    return (
      <video
        src={publicUrl}
        controls
        preload="metadata"
        onError={() => setFailed(true)}
        className="w-full max-h-96 object-contain rounded-lg mt-3 bg-black"
        style={
          mediaMetadata?.width && mediaMetadata?.height
            ? { aspectRatio: `${mediaMetadata.width}/${mediaMetadata.height}` }
            : { aspectRatio: '16/9' }
        }
        aria-label={t('Post video')}
      />
    )
  }

  if (mediaType === 'audio') {
    return (
      <div className="mt-3 bg-(--bg-surface-2) p-4 rounded-lg border border-(--border-subtle)">
        <audio
          src={publicUrl}
          controls
          preload="none"
          onError={() => setFailed(true)}
          className="w-full"
          aria-label={t('Post audio')}
        />
      </div>
    )
  }

  return null
}

export default MediaDisplay
