export const MAX_MESSAGE_MEDIA_BYTES = 20 * 1024 * 1024

const MESSAGE_MEDIA_EXTENSION_BY_MIME: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
}

export const MESSAGE_MEDIA_MIME_TYPES = Object.freeze(
  Object.keys(MESSAGE_MEDIA_EXTENSION_BY_MIME),
)

export function getMessageMediaPathForMime(
  conversationId: string,
  senderId: string,
  clientId: string,
  mimeType: string | null | undefined,
): string | null {
  if (!mimeType) return null
  const extension = MESSAGE_MEDIA_EXTENSION_BY_MIME[mimeType]
  if (!extension) return null
  return `${conversationId}/${senderId}/${clientId}.${extension}`
}
