import { supabase } from '@/lib/supabaseClient'
import type {
  Post,
  Comment,
  PostMediaType,
  FeedFilter,
  PublicProfileView,
  PublicProfileFeedResponse,
} from '../types'

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

  if (mediaFile) {
    const { url, error: uploadError } = await uploadPostMedia(userId, mediaFile)
    if (uploadError) return { post: null, error: uploadError }
    mediaUrl = url
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      content,
      media_type: mediaType,
      media_url: mediaUrl,
      original_post_id: originalPostId || null,
    })
    .select()
    .single()

  if (error) return { post: null, error: new Error(error.message) }
  return { post: data as Post, error: null }
}

/** Delete a post by ID (owner-only via RLS). */
export async function deletePost(postId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('posts').delete().eq('id', postId)
  return { error: error ? new Error(error.message) : null }
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
  const { error } = await supabase
    .from('post_comments')
    .insert({
      post_id: postId,
      user_id: userId,
      content,
      parent_comment_id: parentCommentId || null,
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
  reason?: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('post_reports')
    .insert({ reporter_id: reporterId, post_id: postId, reason })
  return { error: error ? new Error(error.message) : null }
}

export async function reportComment(
  reporterId: string,
  commentId: string,
  reason?: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('comment_reports')
    .insert({ reporter_id: reporterId, comment_id: commentId, reason })
  return { error: error ? new Error(error.message) : null }
}

export async function reportUser(
  reporterId: string,
  reportedUserId: string,
  reason?: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('user_reports')
    .insert({ reporter_id: reporterId, reported_user_id: reportedUserId, reason })
  return { error: error ? new Error(error.message) : null }
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
  const extension = file.name.split('.').pop() || 'bin'
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
