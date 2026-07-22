export const MESSAGE_MAX_CHARACTERS = 5_000
export const MESSAGE_MEDIA_MAX_BYTES = 50 * 1024 * 1024

export const MESSAGE_MEDIA_MIME_TYPES = [
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

export const MESSAGE_MEDIA_ACCEPT = MESSAGE_MEDIA_MIME_TYPES.join(',')

export function validateMessageMediaFile(file: File): 'type' | 'size' | null {
  if (!(MESSAGE_MEDIA_MIME_TYPES as readonly string[]).includes(file.type)) {
    return 'type'
  }

  if (file.size > MESSAGE_MEDIA_MAX_BYTES) {
    return 'size'
  }

  return null
}
