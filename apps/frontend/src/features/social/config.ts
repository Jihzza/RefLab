export const POST_CONTENT_MAX_LENGTH = 2_000
export const COMMENT_CONTENT_MAX_LENGTH = 1_000
export const REPORT_DETAILS_MAX_LENGTH = 500

export const POST_MEDIA_MAX_BYTES = 20 * 1024 * 1024
export const POST_MEDIA_MAX_MEBIBYTES = POST_MEDIA_MAX_BYTES / (1024 * 1024)

export const ACCEPTED_POST_MEDIA_TYPES = [
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

export type AcceptedPostMediaType = (typeof ACCEPTED_POST_MEDIA_TYPES)[number]
