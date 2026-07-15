import { useCallback, useRef, useState } from 'react'
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
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const inFlightActionsRef = useRef(new Set<string>())

  const handleLike = useCallback(
    async (post: Post) => {
      if (!user?.id) return
      const actionKey = `like:${post.id}`
      if (inFlightActionsRef.current.has(actionKey)) return
      inFlightActionsRef.current.add(actionKey)
      const wasLiked = post.is_liked

      // Optimistic update
      updatePost(post.id, {
        is_liked: !wasLiked,
        like_count: post.like_count + (wasLiked ? -1 : 1),
      })

      try {
        const { error } = await togglePostLike(user.id, post.id, wasLiked)
        if (!error) return

        updatePost(post.id, {
          is_liked: wasLiked,
          like_count: post.like_count,
        })
      } catch {
        updatePost(post.id, {
          is_liked: wasLiked,
          like_count: post.like_count,
        })
      } finally {
        inFlightActionsRef.current.delete(actionKey)
      }
    },
    [user?.id, updatePost]
  )

  const handleSave = useCallback(
    async (post: Post) => {
      if (!user?.id) return
      const actionKey = `save:${post.id}`
      if (inFlightActionsRef.current.has(actionKey)) return
      inFlightActionsRef.current.add(actionKey)
      const wasSaved = post.is_saved

      updatePost(post.id, {
        is_saved: !wasSaved,
        save_count: post.save_count + (wasSaved ? -1 : 1),
      })

      try {
        const { error } = await togglePostSave(user.id, post.id, wasSaved)
        if (!error) return

        updatePost(post.id, {
          is_saved: wasSaved,
          save_count: post.save_count,
        })
      } catch {
        updatePost(post.id, {
          is_saved: wasSaved,
          save_count: post.save_count,
        })
      } finally {
        inFlightActionsRef.current.delete(actionKey)
      }
    },
    [user?.id, updatePost]
  )

  const handleRepost = useCallback(
    async (post: Post) => {
      if (!user?.id || !profile) return
      const actionKey = `repost:${post.id}`
      if (inFlightActionsRef.current.has(actionKey)) return
      inFlightActionsRef.current.add(actionKey)
      const wasReposted = post.is_reposted

      try {
        if (wasReposted) {
          updatePost(post.id, {
            is_reposted: false,
            repost_count: Math.max(post.repost_count - 1, 0),
          })

          const { error } = await removeRepost(user.id, post.id)
          if (!error) return

          updatePost(post.id, {
            is_reposted: true,
            repost_count: post.repost_count,
          })
          return
        }

        updatePost(post.id, {
          is_reposted: true,
          repost_count: post.repost_count + 1,
        })

        const { error, post: repostData } = await createRepost(user.id, post.id)
        if (error) {
          updatePost(post.id, {
            is_reposted: false,
            repost_count: post.repost_count,
          })
        } else if (repostData) {
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
      } catch {
        updatePost(post.id, {
          is_reposted: wasReposted,
          repost_count: post.repost_count,
        })
      } finally {
        inFlightActionsRef.current.delete(actionKey)
      }
    },
    [user?.id, profile, updatePost, addPost]
  )

  const handleShare = useCallback(async (post: Post) => {
    const actionKey = `share:${post.id}`
    if (inFlightActionsRef.current.has(actionKey)) return
    inFlightActionsRef.current.add(actionKey)

    try {
      const url = `${window.location.origin}/app/post/${post.id}`
      if (navigator.share) {
        try {
          await navigator.share({ title: 'Check out this post on RefLab', url })
        } catch {
          // Cancellation is an expected outcome of the native share sheet.
        }
      } else {
        await navigator.clipboard.writeText(url)
      }
    } finally {
      inFlightActionsRef.current.delete(actionKey)
    }
  }, [])

  const handleDelete = useCallback(
    async (postId: string) => {
      const actionKey = `delete:${postId}`
      if (inFlightActionsRef.current.has(actionKey)) return
      inFlightActionsRef.current.add(actionKey)
      setPendingAction(postId)

      try {
        const { error } = await deletePost(postId)
        if (error) {
          console.error('Failed to delete post:', error)
          return
        }
        removePost(postId)
      } catch (error) {
        console.error('Failed to delete post:', error)
      } finally {
        inFlightActionsRef.current.delete(actionKey)
        setPendingAction((current) => (current === postId ? null : current))
      }
    },
    [removePost]
  )

  const handleReport = useCallback(
    async (type: 'post' | 'user', targetId: string, reason?: string) => {
      if (!user?.id) return
      const actionKey = `report:${type}:${targetId}`
      if (inFlightActionsRef.current.has(actionKey)) return
      inFlightActionsRef.current.add(actionKey)

      try {
        if (type === 'post') {
          await reportPost(user.id, targetId, reason)
        } else {
          await reportUser(user.id, targetId, reason)
        }
      } finally {
        inFlightActionsRef.current.delete(actionKey)
      }
    },
    [user?.id]
  )

  const handleBlock = useCallback(
    async (blockedUserId: string) => {
      if (!user?.id) return
      const actionKey = `block:${blockedUserId}`
      if (inFlightActionsRef.current.has(actionKey)) return
      inFlightActionsRef.current.add(actionKey)

      try {
        const { error } = await blockUser(user.id, blockedUserId)
        if (error) {
          console.error('Failed to block user:', error)
          return
        }
        removePostsByUser(blockedUserId)
      } catch (error) {
        console.error('Failed to block user:', error)
      } finally {
        inFlightActionsRef.current.delete(actionKey)
      }
    },
    [user?.id, removePostsByUser]
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
