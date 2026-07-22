import { useCallback, useState } from 'react'
import { useAuth } from '@/features/auth/components/useAuth'
import {
  togglePostLike,
  togglePostSave,
  createRepost,
  removeRepost,
  deletePost,
  reportPost,
  reportUser,
  blockUser,
} from '../api/socialApi'
import type { Post } from '../types'

interface UsePostActionsParams {
  updatePost: (postId: string, updates: Partial<Post>) => void
  removePost: (postId: string) => void
  removePostsByUser: (userId: string) => void
  addPost: (post: Post) => void
}

export function usePostActions({
  updatePost,
  removePost,
  removePostsByUser,
  addPost,
}: UsePostActionsParams) {
  const { user, profile } = useAuth()
  const userId = user?.id
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  const handleLike = useCallback(
    async (post: Post) => {
      if (!userId) return
      const wasLiked = post.is_liked

      // Optimistic update
      updatePost(post.id, {
        is_liked: !wasLiked,
        like_count: post.like_count + (wasLiked ? -1 : 1),
      })

      const { error } = await togglePostLike(userId, post.id, wasLiked)
      if (error) {
        // Rollback
        updatePost(post.id, {
          is_liked: wasLiked,
          like_count: post.like_count,
        })
      }
    },
    [userId, updatePost]
  )

  const handleSave = useCallback(
    async (post: Post) => {
      if (!userId) return
      const wasSaved = post.is_saved

      updatePost(post.id, {
        is_saved: !wasSaved,
        save_count: post.save_count + (wasSaved ? -1 : 1),
      })

      const { error } = await togglePostSave(userId, post.id, wasSaved)
      if (error) {
        updatePost(post.id, {
          is_saved: wasSaved,
          save_count: post.save_count,
        })
      }
    },
    [userId, updatePost]
  )

  const handleRepost = useCallback(
    async (post: Post) => {
      if (!userId || !profile) return
      const wasReposted = post.is_reposted

      if (wasReposted) {
        // Optimistic: remove repost
        updatePost(post.id, {
          is_reposted: false,
          repost_count: Math.max(post.repost_count - 1, 0),
        })

        const { error } = await removeRepost(userId, post.id)
        if (error) {
          updatePost(post.id, {
            is_reposted: true,
            repost_count: post.repost_count,
          })
        }
      } else {
        // Optimistic: add repost
        updatePost(post.id, {
          is_reposted: true,
          repost_count: post.repost_count + 1,
        })

        const { error, post: repostData } = await createRepost(userId, post.id)
        if (error) {
          updatePost(post.id, {
            is_reposted: false,
            repost_count: post.repost_count,
          })
        } else if (repostData) {
          // Add the repost to the feed with full author data
          const repost: Post = {
            ...repostData,
            author: {
              id: profile.id,
              username: profile.username,
              name: profile.name ?? null,
              photo_url: profile.photo_url ?? null,
            },
            original_post: {
              id: post.id,
              content: post.content,
              media_type: post.media_type,
              media_url: post.media_url,
              media_metadata: post.media_metadata,
              like_count: post.like_count,
              comment_count: post.comment_count,
              repost_count: post.repost_count + 1,
              save_count: post.save_count,
              created_at: post.created_at,
              original_post_id: post.original_post_id,
              author: post.author,
            },
            is_liked: false,
            is_saved: false,
            is_reposted: false,
          }
          addPost(repost)
        }
      }
    },
    [userId, profile, updatePost, addPost]
  )

  const handleShare = useCallback(async (post: Post) => {
    const url = `${window.location.origin}/app/post/${post.id}`

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Check out this post on RefLab', url })
      } catch {
        // User cancelled - not an error
      }
    } else {
      await navigator.clipboard.writeText(url)
    }
  }, [])

  const handleDelete = useCallback(
    async (postId: string) => {
      setPendingAction(postId)
      removePost(postId) // Optimistic

      const { error } = await deletePost(postId)
      if (error) {
        // On error, refresh will restore the post
      }
      setPendingAction(null)
    },
    [removePost]
  )

  const handleReport = useCallback(
    async (type: 'post' | 'user', targetId: string, reason?: string) => {
      if (!userId) return

      if (type === 'post') {
        await reportPost(userId, targetId, reason)
      } else {
        await reportUser(userId, targetId, reason)
      }
    },
    [userId]
  )

  const handleBlock = useCallback(
    async (blockedUserId: string) => {
      if (!userId) return

      // Immediately hide all posts from blocked user
      removePostsByUser(blockedUserId)

      const { error } = await blockUser(userId, blockedUserId)
      if (error) {
        // Feed refresh will restore if block failed
      }
    },
    [userId, removePostsByUser]
  )

  return {
    handleLike,
    handleSave,
    handleRepost,
    handleShare,
    handleDelete,
    handleReport,
    handleBlock,
    pendingAction,
  }
}
