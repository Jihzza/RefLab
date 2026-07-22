export const POST_MAX_CHARACTERS = 5_000
export const COMMENT_MAX_CHARACTERS = 2_000
export const SOCIAL_MEDIA_MAX_BYTES = 50 * 1024 * 1024

export const SOCIAL_MEDIA_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
] as const

export const SOCIAL_MEDIA_ACCEPT = SOCIAL_MEDIA_MIME_TYPES.join(',')

export function validateSocialMediaFile(file: File): 'type' | 'size' | null {
  if (!(SOCIAL_MEDIA_MIME_TYPES as readonly string[]).includes(file.type)) {
    return 'type'
  }

  if (file.size > SOCIAL_MEDIA_MAX_BYTES) {
    return 'size'
  }

  return null
}
