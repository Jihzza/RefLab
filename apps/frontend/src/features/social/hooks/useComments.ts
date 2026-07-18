import { useState, useCallback, useRef } from 'react'
import { useAuth } from '@/features/auth/components/useAuth'
import {
  getComments,
  addComment as apiAddComment,
  deleteComment as apiDeleteComment,
  toggleCommentLike,
  reportComment as apiReportComment,
} from '../api/socialApi'
import type {
  Comment,
  ReportSubmission,
  ReportSubmissionResult,
} from '../types'

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

export function useComments(postId: string) {
  const { user } = useAuth()
  const userId = user?.id
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pendingCommentLikesRef = useRef(new Set<string>())

  const fetchComments = useCallback(async (): Promise<boolean> => {
    if (!userId) return false
    setIsLoading(true)
    setError(null)

    try {
      const { comments: data, error: fetchError } = await getComments(postId, userId)
      if (fetchError) {
        setError(fetchError.message)
        return false
      }

      setComments(data)
      return true
    } catch (fetchError) {
      setError(getErrorMessage(fetchError, 'Failed to load comments.'))
      return false
    } finally {
      setIsLoading(false)
    }
  }, [postId, userId])

  const addComment = useCallback(
    async (content: string, parentCommentId?: string) => {
      if (!userId) return false

      try {
        const { error: addError } = await apiAddComment(
          postId,
          userId,
          content,
          parentCommentId,
        )

        if (addError) {
          setError(addError.message)
          return false
        }

        // Refetch comments to get proper nested structure with author data.
        await fetchComments()
        return true
      } catch (addError) {
        setError(getErrorMessage(addError, 'Failed to add comment.'))
        return false
      }
    },
    [userId, postId, fetchComments]
  )

  const toggleLike = useCallback(
    async (commentId: string, isCurrentlyLiked: boolean) => {
      if (!userId) return
      if (pendingCommentLikesRef.current.has(commentId)) return
      pendingCommentLikesRef.current.add(commentId)

      // Optimistic update: find comment in top-level or replies
      setComments((currentComments) =>
        currentComments.map((comment) => {
          if (comment.id === commentId) {
            return {
              ...comment,
              is_liked: !isCurrentlyLiked,
              like_count: Math.max(0, comment.like_count + (isCurrentlyLiked ? -1 : 1)),
            }
          }
          return {
            ...comment,
            replies: comment.replies.map((reply) =>
              reply.id === commentId
                ? {
                    ...reply,
                    is_liked: !isCurrentlyLiked,
                    like_count: Math.max(
                      0,
                      reply.like_count + (isCurrentlyLiked ? -1 : 1),
                    ),
                  }
                : reply,
            ),
          }
        }),
      )

      try {
        const { error: likeError } = await toggleCommentLike(
          userId,
          commentId,
          isCurrentlyLiked,
        )
        if (!likeError) return

        // Roll back to the server state when the optimistic mutation fails.
        await fetchComments()
      } catch {
        await fetchComments()
      } finally {
        pendingCommentLikesRef.current.delete(commentId)
      }
    },
    [userId, fetchComments]
  )

  const deleteComment = useCallback(
    async (commentId: string) => {
      // Optimistic removal
      setComments((currentComments) =>
        currentComments
          .filter((comment) => comment.id !== commentId)
          .map((comment) => ({
            ...comment,
            replies: comment.replies.filter((reply) => reply.id !== commentId),
          }))
      )

      try {
        const { error: deleteError } = await apiDeleteComment(commentId)
        if (!deleteError) return true

        await fetchComments()
        return false
      } catch {
        await fetchComments()
        return false
      }
    },
    [fetchComments]
  )

  const reportComment = useCallback(
    async (
      commentId: string,
      submission: ReportSubmission,
    ): Promise<ReportSubmissionResult> => {
      if (!userId) {
        return { created: false, error: new Error('You must be signed in to report content.') }
      }
      try {
        return await apiReportComment(userId, commentId, submission)
      } catch (reportError) {
        return {
          created: false,
          error: new Error(getErrorMessage(reportError, 'Failed to report comment.')),
        }
      }
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
