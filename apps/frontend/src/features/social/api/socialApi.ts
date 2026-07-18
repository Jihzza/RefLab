import { supabase } from '@/lib/supabaseClient'
import type {
  Post,
  Comment,
  PostMediaType,
  FeedFilter,
  PublicProfileView,
  PublicProfileFeedResponse,
  ReportSubmission,
  ReportSubmissionResult,
} from '../types'
import {
  ACCEPTED_POST_MEDIA_TYPES,
  COMMENT_CONTENT_MAX_LENGTH,
  POST_CONTENT_MAX_LENGTH,
  POST_MEDIA_MAX_BYTES,
  type AcceptedPostMediaType,
} from '../config'
import {
  forgetDeferredPostMediaCleanup,
  isDeferredPostMediaCleanupDue,
  readDeferredPostMediaCleanup,
  rememberDeferredPostMediaCleanup,
} from '../utils/deferredPostMediaCleanup'

const MEDIA_TYPE_DETAILS: Record<
  AcceptedPostMediaType,
  { extension: string; postMediaType: Exclude<PostMediaType, 'text'> }
> = {
  'image/jpeg': { extension: 'jpg', postMediaType: 'image' },
  'image/png': { extension: 'png', postMediaType: 'image' },
  'image/gif': { extension: 'gif', postMediaType: 'image' },
  'image/webp': { extension: 'webp', postMediaType: 'image' },
  'video/mp4': { extension: 'mp4', postMediaType: 'video' },
  'video/webm': { extension: 'webm', postMediaType: 'video' },
  'video/quicktime': { extension: 'mov', postMediaType: 'video' },
  'audio/mpeg': { extension: 'mp3', postMediaType: 'audio' },
  'audio/wav': { extension: 'wav', postMediaType: 'audio' },
  'audio/ogg': { extension: 'ogg', postMediaType: 'audio' },
  'audio/webm': { extension: 'webm', postMediaType: 'audio' },
}

function isAcceptedPostMediaType(value: string): value is AcceptedPostMediaType {
  return (ACCEPTED_POST_MEDIA_TYPES as readonly string[]).includes(value)
}

function isOwnedPostMediaPath(userId: string, path: string | null): path is string {
  if (!path || path.startsWith('/') || !path.startsWith(`${userId}/`)) return false
  const segments = path.split('/')
  return segments.length >= 2
    && segments.every((segment) => segment.length > 0 && segment !== '.' && segment !== '..')
}

async function findPostByOperation(userId: string, operationId: string) {
  return supabase
    .from('posts')
    .select('*')
    .eq('user_id', userId)
    .eq('client_id', operationId)
    .maybeSingle()
}

/** Reconcile only cleanup entries older than the 24-hour safety window. */
export async function reconcileDeferredPostMediaCleanup(
  userId: string,
  now = Date.now(),
): Promise<void> {
  for (const entry of readDeferredPostMediaCleanup(userId, now)) {
    if (!isDeferredPostMediaCleanupDue(entry, now)) continue

    const operationLookup = await findPostByOperation(userId, entry.operationId)
    if (operationLookup.error) continue
    if (operationLookup.data?.media_url === entry.path) {
      forgetDeferredPostMediaCleanup(userId, entry.path, entry.operationId)
      continue
    }

    const referenceLookup = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', userId)
      .eq('media_url', entry.path)
      .limit(1)
      .maybeSingle()
    if (referenceLookup.error || referenceLookup.data) continue

    const { error: cleanupError } = await supabase.storage
      .from('post-media')
      .remove([entry.path])
    if (!cleanupError) {
      forgetDeferredPostMediaCleanup(userId, entry.path, entry.operationId)
    }
  }
}

// ============================================
// Feed
// ============================================

/** Fetch the social feed with cursor-based pagination and optional media type filter. */
export async function getFeed(
  userId: string,
  filter: FeedFilter = 'all',
  cursor: string | null = null,
  limit: number = 20
): Promise<{ posts: Post[]; error: Error | null }> {
  const { data, error } = await supabase.rpc('get_social_feed', {
    p_user_id: userId,
    p_media_type: filter === 'all' ? null : filter,
    p_cursor: cursor,
    p_limit: limit,
  })

  if (error) return { posts: [], error: new Error(error.message) }
  return { posts: (data ?? []) as Post[], error: null }
}

/** Fetch one profile's feed (posts + reposts) with cursor pagination and media filter. */
export async function getProfileFeed(
  viewerUserId: string,
  profileUserId: string,
  filter: FeedFilter = 'all',
  cursor: string | null = null,
  limit: number = 20
): Promise<{ posts: Post[]; error: Error | null }> {
  const { data, error } = await supabase.rpc('get_profile_feed', {
    p_viewer_id: viewerUserId,
    p_profile_user_id: profileUserId,
    p_media_type: filter === 'all' ? null : filter,
    p_cursor: cursor,
    p_limit: limit,
  })

  if (error) return { posts: [], error: new Error(error.message) }
  return { posts: (data ?? []) as Post[], error: null }
}

/** Fetch public profile info + relationship flags for a username. */
export async function getPublicProfileView(
  viewerId: string,
  username: string
): Promise<{ profile: PublicProfileView | null; error: Error | null }> {
  const normalized = username.trim()

  if (!normalized) {
    return { profile: null, error: new Error('Username is required.') }
  }

  const { data, error } = await supabase.rpc('get_public_profile_view', {
    p_viewer_id: viewerId,
    p_username: normalized,
  })

  if (error) return { profile: null, error: new Error(error.message) }

  const profile = Array.isArray(data)
    ? ((data[0] ?? null) as PublicProfileView | null)
    : ((data ?? null) as PublicProfileView | null)

  return { profile, error: null }
}

/** Fetch paginated posts for a specific public profile. */
export async function getPublicProfileFeed(
  viewerId: string,
  targetUserId: string,
  cursor: string | null = null,
  limit: number = 20
): Promise<PublicProfileFeedResponse> {
  const { data, error } = await supabase.rpc('get_public_profile_feed', {
    p_viewer_id: viewerId,
    p_target_user_id: targetUserId,
    p_cursor: cursor,
    p_limit: limit,
  })

  if (error) return { posts: [], error: new Error(error.message) }
  return { posts: (data ?? []) as Post[], error: null }
}

/** Fetch a single post by ID (for post detail page, notifications, share links). */
export async function getPostById(
  userId: string,
  postId: string
): Promise<{ post: Post | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('get_post_by_id', {
    p_user_id: userId,
    p_post_id: postId,
  })

  if (error) return { post: null, error: new Error(error.message) }
  return { post: (data ?? null) as Post | null, error: null }
}

// ============================================
// Post CRUD
// ============================================

/** Create a new post. Uploads media first if a file is provided. */
export async function createPost(
  userId: string,
  content: string | null,
  mediaType: PostMediaType,
  mediaFile?: File,
  originalPostId?: string
): Promise<{ post: Post | null; error: Error | null }> {
  let mediaUrl: string | null = null
  const operationId = crypto.randomUUID()

  // Best effort only: due cleanup never masks the current post operation.
  void reconcileDeferredPostMediaCleanup(userId).catch(() => undefined)

  if (content && content.length > POST_CONTENT_MAX_LENGTH) {
    return {
      post: null,
      error: new Error(`Post content cannot exceed ${POST_CONTENT_MAX_LENGTH} characters.`),
    }
  }

  if (mediaFile) {
    if (!isAcceptedPostMediaType(mediaFile.type)) {
      return { post: null, error: new Error('Unsupported post media type.') }
    }
    if (MEDIA_TYPE_DETAILS[mediaFile.type].postMediaType !== mediaType) {
      return { post: null, error: new Error('Post media type does not match the selected file.') }
    }

    const { url, error: uploadError } = await uploadPostMedia(userId, mediaFile)
    if (uploadError) return { post: null, error: uploadError }
    mediaUrl = url
    if (mediaUrl) {
      rememberDeferredPostMediaCleanup(userId, mediaUrl, operationId)
    }
  }

  const { data, error } = await supabase.rpc('create_social_post', {
    p_expected_user_id: userId,
    p_operation_id: operationId,
    p_content: content,
    p_media_type: mediaType,
    p_media_url: mediaUrl,
    p_original_post_id: originalPostId || null,
  })

  if (error) {
    // A transport error can hide a committed RPC. Reconcile by the durable
    // operation ID and never immediately delete media on an ambiguous result.
    const committed = await findPostByOperation(userId, operationId)
    if (!committed.error && committed.data) {
      if (mediaUrl) {
        forgetDeferredPostMediaCleanup(userId, mediaUrl, operationId)
      }
      return { post: committed.data as Post, error: null }
    }
    return { post: null, error: new Error(error.message) }
  }
  if (mediaUrl) {
    forgetDeferredPostMediaCleanup(userId, mediaUrl, operationId)
  }
  return { post: data as Post, error: null }
}

/** Delete an owned post, then best-effort remove its safely scoped media object. */
export async function deletePost(
  userId: string,
  postId: string,
): Promise<{ error: Error | null; cleanupError: Error | null }> {
  const { data: post, error: lookupError } = await supabase
    .from('posts')
    .select('id,user_id,media_url')
    .eq('id', postId)
    .maybeSingle()

  if (lookupError) {
    return { error: new Error(lookupError.message), cleanupError: null }
  }
  if (!post || post.user_id !== userId) {
    return { error: new Error('The post was not found or is not owned by this account.'), cleanupError: null }
  }

  const { error: deleteError } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', userId)

  if (deleteError) {
    return { error: new Error(deleteError.message), cleanupError: null }
  }

  if (!isOwnedPostMediaPath(userId, post.media_url)) {
    return { error: null, cleanupError: null }
  }

  const { error: cleanupError } = await supabase.storage
    .from('post-media')
    .remove([post.media_url])

  return {
    error: null,
    cleanupError: cleanupError ? new Error(cleanupError.message) : null,
  }
}

// ============================================
// Interactions
// ============================================

/** Toggle like on a post. */
export async function togglePostLike(
  userId: string,
  postId: string,
  isCurrentlyLiked: boolean
): Promise<{ error: Error | null }> {
  if (isCurrentlyLiked) {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId)
    return { error: error ? new Error(error.message) : null }
  }
  const { error } = await supabase
    .from('post_likes')
    .insert({ user_id: userId, post_id: postId })
  return { error: error ? new Error(error.message) : null }
}

/** Create a follow relationship. */
export async function followUser(
  followerId: string,
  followingId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('user_follows')
    .insert({ follower_id: followerId, following_id: followingId })
  return { error: error ? new Error(error.message) : null }
}

/** Remove a follow relationship. */
export async function unfollowUser(
  followerId: string,
  followingId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('user_follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
  return { error: error ? new Error(error.message) : null }
}

/** Toggle save/bookmark on a post. */
export async function togglePostSave(
  userId: string,
  postId: string,
  isCurrentlySaved: boolean
): Promise<{ error: Error | null }> {
  if (isCurrentlySaved) {
    const { error } = await supabase
      .from('post_saves')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId)
    return { error: error ? new Error(error.message) : null }
  }
  const { error } = await supabase
    .from('post_saves')
    .insert({ user_id: userId, post_id: postId })
  return { error: error ? new Error(error.message) : null }
}

/** Create a repost referencing the original post. */
export async function createRepost(
  userId: string,
  originalPostId: string
): Promise<{ post: Post | null; error: Error | null }> {
  return createPost(userId, null, 'text', undefined, originalPostId)
}

/** Remove a user's repost of a specific post. */
export async function removeRepost(
  userId: string,
  originalPostId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('user_id', userId)
    .eq('original_post_id', originalPostId)
  return { error: error ? new Error(error.message) : null }
}

// ============================================
// Comments
// ============================================

/** Fetch nested comments for a post via RPC. */
export async function getComments(
  postId: string,
  userId: string
): Promise<{ comments: Comment[]; error: Error | null }> {
  const { data, error } = await supabase.rpc('get_post_comments', {
    p_post_id: postId,
    p_user_id: userId,
  })

  if (error) return { comments: [], error: new Error(error.message) }
  return { comments: (data ?? []) as Comment[], error: null }
}

/** Add a comment (top-level or reply). */
export async function addComment(
  postId: string,
  userId: string,
  content: string,
  parentCommentId?: string
): Promise<{ error: Error | null }> {
  if (content.length > COMMENT_CONTENT_MAX_LENGTH) {
    return {
      error: new Error(`Comment cannot exceed ${COMMENT_CONTENT_MAX_LENGTH} characters.`),
    }
  }

  const { error } = await supabase.rpc('create_social_comment', {
    p_expected_user_id: userId,
    p_post_id: postId,
    p_content: content,
    p_parent_comment_id: parentCommentId || null,
  })
  return { error: error ? new Error(error.message) : null }
}

/** Delete a comment (owner-only via RLS). */
export async function deleteComment(commentId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('post_comments').delete().eq('id', commentId)
  return { error: error ? new Error(error.message) : null }
}

/** Toggle like on a comment. */
export async function toggleCommentLike(
  userId: string,
  commentId: string,
  isCurrentlyLiked: boolean
): Promise<{ error: Error | null }> {
  if (isCurrentlyLiked) {
    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('user_id', userId)
      .eq('comment_id', commentId)
    return { error: error ? new Error(error.message) : null }
  }
  const { error } = await supabase
    .from('comment_likes')
    .insert({ user_id: userId, comment_id: commentId })
  return { error: error ? new Error(error.message) : null }
}

// ============================================
// Reports & Blocks
// ============================================

export async function reportPost(
  reporterId: string,
  postId: string,
  submission: ReportSubmission,
): Promise<ReportSubmissionResult> {
  const { data, error } = await supabase.rpc('report_social_post', {
    p_expected_reporter_id: reporterId,
    p_post_id: postId,
    p_reason_code: submission.reasonCode,
    p_reason_details: submission.reasonDetails,
  })
  if (error) return { created: false, error: new Error(error.message) }
  const row = Array.isArray(data) ? data[0] : data
  return { created: Boolean(row?.created), error: null }
}

export async function reportComment(
  reporterId: string,
  commentId: string,
  submission: ReportSubmission,
): Promise<ReportSubmissionResult> {
  const { data, error } = await supabase.rpc('report_social_comment', {
    p_expected_reporter_id: reporterId,
    p_comment_id: commentId,
    p_reason_code: submission.reasonCode,
    p_reason_details: submission.reasonDetails,
  })
  if (error) return { created: false, error: new Error(error.message) }
  const row = Array.isArray(data) ? data[0] : data
  return { created: Boolean(row?.created), error: null }
}

export async function reportUser(
  reporterId: string,
  reportedUserId: string,
  submission: ReportSubmission,
): Promise<ReportSubmissionResult> {
  const { data, error } = await supabase.rpc('report_social_user', {
    p_expected_reporter_id: reporterId,
    p_reported_user_id: reportedUserId,
    p_reason_code: submission.reasonCode,
    p_reason_details: submission.reasonDetails,
  })
  if (error) return { created: false, error: new Error(error.message) }
  const row = Array.isArray(data) ? data[0] : data
  return { created: Boolean(row?.created), error: null }
}

export async function blockUser(
  blockerId: string,
  blockedId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('user_blocks')
    .insert({ blocker_id: blockerId, blocked_id: blockedId })
  return { error: error ? new Error(error.message) : null }
}

export async function unblockUser(
  blockerId: string,
  blockedId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId)
  return { error: error ? new Error(error.message) : null }
}

// ============================================
// Media
// ============================================

/** Upload a media file to the post-media storage bucket. Returns the storage path. */
export async function uploadPostMedia(
  userId: string,
  file: File
): Promise<{ url: string | null; error: Error | null }> {
  if (!isAcceptedPostMediaType(file.type)) {
    return { url: null, error: new Error('Unsupported post media type.') }
  }
  if (file.size <= 0 || file.size > POST_MEDIA_MAX_BYTES) {
    return { url: null, error: new Error('Post media cannot exceed 20 MB.') }
  }

  const extension = MEDIA_TYPE_DETAILS[file.type].extension
  const path = `${userId}/${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage
    .from('post-media')
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) return { url: null, error: new Error(error.message) }
  return { url: path, error: null }
}

/** Get the public URL for a media file stored in the post-media bucket. */
export function getMediaPublicUrl(path: string): string {
  const { data } = supabase.storage.from('post-media').getPublicUrl(path)
  return data.publicUrl
}
