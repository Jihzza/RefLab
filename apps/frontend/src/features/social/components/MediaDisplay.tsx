import React from 'react'
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
  if (!mediaUrl || mediaType === 'text') return null

  const publicUrl = getMediaPublicUrl(mediaUrl)

  if (mediaType === 'image') {
    return (
      <img
        src={publicUrl}
        alt={t('Post media')}
        loading="lazy"
        className="w-full max-h-96 object-cover rounded-lg mt-3"
        style={
          mediaMetadata?.width && mediaMetadata?.height
            ? { aspectRatio: `${mediaMetadata.width}/${mediaMetadata.height}` }
            : undefined
        }
      />
    )
  }

  if (mediaType === 'video') {
    return (
      <video
        src={publicUrl}
        controls
        preload="metadata"
        className="w-full max-h-96 rounded-lg mt-3 bg-black"
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
          className="w-full"
          aria-label={t('Post audio')}
        />
      </div>
    )
  }

  return null
}

export default MediaDisplay
