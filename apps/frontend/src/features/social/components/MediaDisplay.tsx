import { getMediaPublicUrl } from '../api/socialApi'
import type { PostMediaType } from '../types'
import { useTranslation } from 'react-i18next'

interface MediaDisplayProps {
  mediaType: PostMediaType
  mediaUrl: string | null
  mediaMetadata?: { width?: number; height?: number } | null
}

/** Renders media content (image, video, or audio) based on type. */
const MediaDisplay = ({
  mediaType,
  mediaUrl,
  mediaMetadata,
}: MediaDisplayProps) => {
  const { t } = useTranslation()
  if (!mediaUrl || mediaType === 'text') return null

  const publicUrl = getMediaPublicUrl(mediaUrl)

  if (mediaType === 'image') {
    return (
      <img
        src={publicUrl}
        alt={t('Post media')}
        loading="lazy"
        className="mt-4 max-h-[32rem] w-full rounded-(--mc-radius-input) border border-(--mc-color-border) bg-(--mc-color-canvas) object-cover"
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
        className="mt-4 max-h-[32rem] w-full rounded-(--mc-radius-input) border border-(--mc-color-border) bg-black"
        aria-label={t('Post video')}
      />
    )
  }

  if (mediaType === 'audio') {
    return (
      <div className="mt-4 rounded-(--mc-radius-input) border border-(--mc-color-border) bg-(--mc-color-canvas) p-4">
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
