import { useState, useCallback } from 'react'
import { useAuth } from '@/features/auth/components/useAuth'
import {
  getComments,
  addComment as apiAddComment,
  deleteComment as apiDeleteComment,
  toggleCommentLike,
  reportComment as apiReportComment,
} from '../api/socialApi'
import type { Comment } from '../types'

export function useComments(postId: string) {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchComments = useCallback(async () => {
    if (!user?.id) return
    setIsLoading(true)
    setError(null)

    const { comments: data, error: fetchError } = await getComments(postId, user.id)
    if (fetchError) {
      setError(fetchError.message)
    } else {
      setComments(data)
    }
    setIsLoading(false)
  }, [postId, user?.id])

  const addComment = useCallback(
    async (content: string, parentCommentId?: string) => {
      if (!user?.id) return

      const { error: addError } = await apiAddComment(
        postId,
        user.id,
        content,
        parentCommentId
      )

      if (addError) {
        setError(addError.message)
        return
      }

      // Refetch comments to get proper nested structure with author data
      await fetchComments()
    },
    [user?.id, postId, fetchComments]
  )

  const toggleLike = useCallback(
    async (commentId: string, isCurrentlyLiked: boolean) => {
      if (!user?.id) return

      // Optimistic update: find comment in top-level or replies
      setComments(prev =>
        prev.map(c => {
          if (c.id === commentId) {
            return {
              ...c,
              is_liked: !isCurrentlyLiked,
              like_count: c.like_count + (isCurrentlyLiked ? -1 : 1),
            }
          }
          return {
            ...c,
            replies: c.replies.map(r =>
              r.id === commentId
                ? {
                    ...r,
                    is_liked: !isCurrentlyLiked,
                    like_count: r.like_count + (isCurrentlyLiked ? -1 : 1),
                  }
                : r
            ),
          }
        })
      )

      const { error: likeError } = await toggleCommentLike(
        user.id,
        commentId,
        isCurrentlyLiked
      )
      if (likeError) {
        // Rollback by refetching
        await fetchComments()
      }
    },
    [user?.id, fetchComments]
  )

  const deleteComment = useCallback(
    async (commentId: string) => {
      // Optimistic removal
      setComments(prev =>
        prev
          .filter(c => c.id !== commentId)
          .map(c => ({
            ...c,
            replies: c.replies.filter(r => r.id !== commentId),
          }))
      )

      const { error: delError } = await apiDeleteComment(commentId)
      if (delError) {
        await fetchComments()
      }
    },
    [fetchComments]
  )

  const reportComment = useCallback(
    async (commentId: string, reason?: string) => {
      if (!user?.id) return
      await apiReportComment(user.id, commentId, reason)
    },
    [user?.id]
  )

  return {
    comments,
    isLoading,
    error,
    fetchComments,
    addComment,
    toggleLike,
    deleteComment,
    reportComment,
  }
}
