import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, LoaderCircle, MessageSquareWarning, RotateCcw } from 'lucide-react'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import IconButton from '@/components/ui/IconButton'
import Surface from '@/components/ui/Surface'
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
  const userId = user?.id
  const navigate = useNavigate()

  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

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
    if (!userId || !postId) return

    let cancelled = false

    async function load(authenticatedUserId: string, resolvedPostId: string) {
      setLoading(true)
      setError(null)

      const { post: data, error: fetchError } = await getPostById(
        authenticatedUserId,
        resolvedPostId,
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

    load(userId, postId)
    return () => {
      cancelled = true
    }
  }, [userId, postId, reloadToken, t])

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
    <div className="flex h-full min-h-0 flex-col bg-(--mc-color-canvas)">
      <header className="sticky top-0 z-10 shrink-0 border-b border-(--mc-color-border) bg-(--mc-color-canvas)/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 w-full max-w-3xl items-center gap-3 px-4 sm:px-6">
          <IconButton label={t('Go back')} onClick={() => navigate(-1)}>
            <ArrowLeft className="size-5" />
          </IconButton>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-(--mc-color-accent)">
              RefLab
            </p>
            <h1 className="truncate text-lg font-bold leading-tight text-(--mc-color-text)">
              {t('Post')}
            </h1>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-6 sm:py-6">
          {loading && (
            <Surface
              role="status"
              aria-label={t('Loading post')}
              className="overflow-hidden"
            >
              <div className="flex animate-pulse items-center gap-3 motion-reduce:animate-none">
                <div className="size-12 rounded-full bg-(--mc-color-surface-raised)" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-36 rounded bg-(--mc-color-surface-raised)" />
                  <div className="h-3 w-24 rounded bg-(--mc-color-surface-raised)" />
                </div>
                <LoaderCircle className="size-5 animate-spin text-(--mc-color-accent) motion-reduce:animate-none" />
              </div>
              <div className="mt-5 space-y-2 animate-pulse motion-reduce:animate-none">
                <div className="h-3 rounded bg-(--mc-color-surface-raised)" />
                <div className="h-3 w-4/5 rounded bg-(--mc-color-surface-raised)" />
              </div>
            </Surface>
          )}

          {error && !loading && (
            <Surface>
              <EmptyState
                icon={<MessageSquareWarning className="size-6" />}
                title={error}
                description={t('Post not found or has been deleted.')}
                action={(
                  <>
                    <Button
                      variant="secondary"
                      leadingIcon={<RotateCcw className="size-4" />}
                      onClick={() => setReloadToken((value) => value + 1)}
                    >
                      {t('Try Again')}
                    </Button>
                    <Button onClick={() => navigate('/app/social')}>
                      {t('Back to Feed')}
                    </Button>
                  </>
                )}
              />
            </Surface>
          )}

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
      </main>
    </div>
  )
}
