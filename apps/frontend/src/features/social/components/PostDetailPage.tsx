import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, FileQuestion } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ViewportPage from '@/app/layouts/ViewportPage'
import { Button, EmptyState, IconButton, Skeleton, Surface } from '@/components/ui'
import { useAuth } from '@/features/auth/components/useAuth'
import { getPostById } from '../api/socialApi'
import { usePostActions } from '../hooks/usePostActions'
import type { Post } from '../types'
import PostBox from './PostBox'

export default function PostDetailPage() {
  const { t } = useTranslation()
  const { postId } = useParams<{ postId: string }>()
  const { user } = useAuth()
  const userId = user?.id
  const navigate = useNavigate()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const updatePost = useCallback((_postId: string, updates: Partial<Post>) => {
    setPost((previous) => (previous ? { ...previous, ...updates } : null))
  }, [])

  const removePost = useCallback(() => {
    navigate('/app/social', { replace: true })
  }, [navigate])

  const removePostsByUser = useCallback(
    (blockedUserId: string) => {
      if (post?.author.id === blockedUserId) navigate('/app/social', { replace: true })
    },
    [navigate, post],
  )

  const addPost = useCallback(() => undefined, [])
  const {
    handleLike,
    handleSave,
    handleRepost,
    handleShare,
    handleDelete,
    handleReport,
    handleBlock,
  } = usePostActions({ updatePost, removePost, removePostsByUser, addPost })

  useEffect(() => {
    if (!userId || !postId) return
    let cancelled = false

    void (async () => {
      setLoading(true)
      setError(null)
      const { post: data, error: fetchError } = await getPostById(userId, postId)
      if (cancelled) return

      if (fetchError || !data) {
        setError(t('Post not found or has been deleted.'))
      } else {
        setPost(data)
      }
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [postId, t, userId])

  const handleCommentCountChange = useCallback((_postId: string, delta: number) => {
    setPost((previous) => previous
      ? { ...previous, comment_count: Math.max(0, previous.comment_count + delta) }
      : null)
  }, [])

  return (
    <ViewportPage
      ariaLabel={t('Post')}
      width="narrow"
      padded
      header={
        <div className="mx-auto flex max-w-[var(--mc-content-narrow)] items-center gap-3">
          <IconButton label={t('Go back')} onClick={() => navigate(-1)}>
            <ArrowLeft className="size-5" />
          </IconButton>
          <div>
            <p className="mc-eyebrow">{t('Social')}</p>
            <h1 className="text-base font-semibold text-(--mc-color-text)">{t('Post')}</h1>
          </div>
        </div>
      }
    >
      {loading && (
        <Surface className="space-y-4" padding="md" role="status" aria-label={t('Loading post')}>
          <div className="flex gap-3">
            <Skeleton variant="circular" width="2.75rem" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" width="8rem" />
              <Skeleton variant="text" width="5rem" />
            </div>
          </div>
          <Skeleton variant="text" />
          <Skeleton variant="text" width="70%" />
        </Surface>
      )}

      {error && !loading && (
        <Surface padding="none">
          <EmptyState
            icon={<FileQuestion className="size-6" />}
            title={t('Post unavailable')}
            description={error}
            action={<Button onClick={() => navigate('/app/social')}>{t('Back to Feed')}</Button>}
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
    </ViewportPage>
  )
}
