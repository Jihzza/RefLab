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
  const userId = user?.id
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchComments = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    setError(null)

    const { comments: data, error: fetchError } = await getComments(postId, userId)
    if (fetchError) {
      setError(fetchError.message)
    } else {
      setComments(data)
    }
    setIsLoading(false)
  }, [postId, userId])

  const addComment = useCallback(
    async (content: string, parentCommentId?: string) => {
      if (!userId) throw new Error('You must be logged in to comment.')

      const { error: addError } = await apiAddComment(
        postId,
        userId,
        content,
        parentCommentId
      )

      if (addError) {
        setError(addError.message)
        throw addError
      }

      // Refetch comments to get proper nested structure with author data
      setError(null)
      await fetchComments()
    },
    [userId, postId, fetchComments]
  )

  const toggleLike = useCallback(
    async (commentId: string, isCurrentlyLiked: boolean) => {
      if (!userId) return

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
        userId,
        commentId,
        isCurrentlyLiked
      )
      if (likeError) {
        // Rollback by refetching
        await fetchComments()
      }
    },
    [userId, fetchComments]
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
        setError(delError.message)
        throw delError
      }
    },
    [fetchComments]
  )

  const reportComment = useCallback(
    async (commentId: string, reason?: string) => {
      if (!userId) return
      const { error: reportError } = await apiReportComment(userId, commentId, reason)
      if (reportError) setError(reportError.message)
    },
    [userId]
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
