import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/features/auth/components/useAuth'
import { getPostById } from '../api/socialApi'
import { usePostActions } from '../hooks/usePostActions'
import PostBox from './PostBox'
import type { Post } from '../types'
import { useTranslation } from 'react-i18next'

/**
 * PostDetailPage - Displays a single post with comments auto-expanded.
 *
 * Route: /app/post/:postId
 * Used by notification links, share URLs, and deep links.
 */
export default function PostDetailPage() {
  const { t } = useTranslation()
  const { postId } = useParams<{ postId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Post state helpers for usePostActions
  const updatePost = useCallback((_postId: string, updates: Partial<Post>) => {
    setPost((prev) => (prev ? { ...prev, ...updates } : null))
  }, [])

  const removePost = useCallback(() => {
    navigate('/app/social', { replace: true })
  }, [navigate])

  const removePostsByUser = useCallback(
    (userId: string) => {
      if (post?.author.id === userId) {
        navigate('/app/social', { replace: true })
      }
    },
    [post, navigate],
  )

  const addPost = useCallback(() => {
    // No-op on detail page (reposts go to feed)
  }, [])

  const {
    handleLike,
    handleSave,
    handleRepost,
    handleShare,
    handleDelete,
    handleReport,
    handleBlock,
  } = usePostActions({ updatePost, removePost, removePostsByUser, addPost })

  // Fetch post on mount
  useEffect(() => {
    if (!user?.id || !postId) return

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const { post: data, error: fetchError } = await getPostById(
        user!.id,
        postId!,
      )

      if (cancelled) return

      if (fetchError || !data) {
        setError(t('Post not found or has been deleted.'))
        setLoading(false)
        return
      }

      setPost(data)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user?.id, postId, t])

  const handleCommentCountChange = useCallback(
    (_postId: string, delta: number) => {
      setPost((prev) =>
        prev
          ? {
              ...prev,
              comment_count: Math.max(0, prev.comment_count + delta),
            }
          : null,
      )
    },
    [],
  )

  return (
    <div className="flex flex-col h-full">
      {/* Back header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-(--border-subtle)">
        <button
          onClick={() => navigate(-1)}
          className="p-1 text-(--text-secondary) hover:text-(--text-primary) transition-colors"
          aria-label={t('Go back')}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-(--text-primary)">{t('Post')}</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-(--brand-yellow) border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-center py-12">
            <p className="text-(--text-muted) text-sm mb-3">{error}</p>
            <button
              onClick={() => navigate('/app/social')}
              className="px-4 py-2 text-sm font-medium bg-(--brand-yellow) text-(--bg-primary) rounded-(--radius-button) hover:bg-(--brand-yellow-soft) transition-colors"
            >
              {t('Back to Feed')}
            </button>
          </div>
        )}

        {/* Post */}
        {!loading && !error && post && (
          <PostBox
            post={post}
            onLike={handleLike}
            onSave={handleSave}
            onRepost={handleRepost}
            onShare={handleShare}
            onDelete={handleDelete}
            onReport={handleReport}
            onBlock={handleBlock}
            onCommentCountChange={handleCommentCountChange}
            defaultShowComments
          />
        )}
      </div>
    </div>
  )
}
