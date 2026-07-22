import { useCallback, useRef, useState, type TouchEvent } from 'react'
import { MessageCircleMore, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import ViewportPage from '@/app/layouts/ViewportPage'
import { Button, EmptyState, Skeleton, Surface } from '@/components/ui'
import { useFeed } from '../hooks/useFeed'
import { usePostActions } from '../hooks/usePostActions'
import type { Post } from '../types'
import CreatePostModal from './CreatePostModal'
import NavigationBar from './NavigationBar'
import NewPostButton from './NewPostButton'
import PostBox from './PostBox'

function PostSkeleton() {
  return (
    <Surface className="space-y-4" padding="md" aria-hidden="true">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width="2.75rem" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="8rem" />
          <Skeleton variant="text" width="5.5rem" className="h-3" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" />
        <Skeleton variant="text" width="76%" />
      </div>
      <div className="flex justify-between border-t border-(--mc-color-border) pt-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} variant="circular" width="1.75rem" />
        ))}
      </div>
    </Surface>
  )
}

export default function SocialPage() {
  const { t } = useTranslation()
  const {
    posts,
    isLoading,
    hasInitiallyLoaded,
    isRefreshing,
    isLoadingMore,
    hasMore,
    error,
    filter,
    setFilter,
    refresh,
    loadMore,
    addPost,
    removePost,
    removePostsByUser,
    updatePost,
  } = useFeed()

  const {
    handleLike,
    handleSave,
    handleRepost,
    handleShare,
    handleDelete,
    handleReport,
    handleBlock,
  } = usePostActions({ updatePost, removePost, removePostsByUser, addPost })

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [copiedToast, setCopiedToast] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef(0)
  const [pullDistance, setPullDistance] = useState(0)

  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (scrollRef.current?.scrollTop === 0) {
      touchStartY.current = event.touches[0].clientY
    }
  }, [])

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!touchStartY.current) return
    const distance = event.touches[0].clientY - touchStartY.current
    if (distance > 0 && scrollRef.current?.scrollTop === 0) {
      setPullDistance(Math.min(distance * 0.4, 80))
    }
  }, [])

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > 50) await refresh()
    setPullDistance(0)
    touchStartY.current = 0
  }, [pullDistance, refresh])

  const handleScroll = useCallback(() => {
    const element = scrollRef.current
    if (!element || isLoadingMore || !hasMore) return
    if (element.scrollHeight - element.scrollTop - element.clientHeight < 300) {
      void loadMore()
    }
  }, [hasMore, isLoadingMore, loadMore])

  const handleShareWithToast = useCallback(
    async (post: Post) => {
      await handleShare(post)
      if (!navigator.share) {
        setCopiedToast(true)
        window.setTimeout(() => setCopiedToast(false), 2000)
      }
    },
    [handleShare],
  )

  const handleCommentCountChange = useCallback(
    (postId: string, delta: number) => {
      updatePost(postId, {
        comment_count: Math.max(
          0,
          (posts.find((post) => post.id === postId)?.comment_count ?? 0) + delta,
        ),
      })
    },
    [posts, updatePost],
  )

  return (
    <ViewportPage
      ariaLabel={t('Social feed')}
      width="narrow"
      scroll="managed"
      header={<NavigationBar filter={filter} onFilterChange={setFilter} />}
    >
      <div className="relative flex h-full min-h-0 flex-col">
        {pullDistance > 0 && (
          <div
            className="flex shrink-0 items-center justify-center overflow-hidden transition-[height]"
            style={{ height: pullDistance }}
            aria-hidden="true"
          >
            <RefreshCw
              className={`size-5 text-(--mc-color-accent) ${pullDistance > 50 ? 'animate-spin' : ''}`}
              style={{ transform: `rotate(${pullDistance * 3}deg)` }}
            />
          </div>
        )}

        <div
          ref={scrollRef}
          className="mc-scroll-region flex-1 px-3 py-4 pb-24 sm:px-4 md:py-6"
          onScroll={handleScroll}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="space-y-4">
            {isRefreshing && (
              <div className="flex items-center justify-center gap-2 py-1 text-xs font-medium text-(--mc-color-text-muted)" role="status">
                <RefreshCw className="size-4 animate-spin text-(--mc-color-accent)" aria-hidden="true" />
                {t('Refreshing feed')}
              </div>
            )}

            {isLoading && (
              <div className="space-y-4" role="status" aria-label={t('Loading feed')}>
                <PostSkeleton />
                <PostSkeleton />
                <PostSkeleton />
              </div>
            )}

            {error && !isLoading && (
              <Surface padding="none">
                <EmptyState
                  icon={<RefreshCw className="size-6" />}
                  title={t('Unable to load the feed')}
                  description={t('Something went wrong loading the feed.')}
                  action={<Button onClick={() => void refresh()}>{t('Try Again')}</Button>}
                />
              </Surface>
            )}

            {!isLoading &&
              !error &&
              posts.map((post) => (
                <PostBox
                  key={post.id}
                  post={post}
                  onLike={handleLike}
                  onSave={handleSave}
                  onRepost={handleRepost}
                  onShare={handleShareWithToast}
                  onDelete={handleDelete}
                  onReport={handleReport}
                  onBlock={handleBlock}
                  onCommentCountChange={handleCommentCountChange}
                />
              ))}

            {isLoadingMore && (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-(--mc-color-text-muted)" role="status">
                <span className="size-5 animate-spin rounded-full border-2 border-(--mc-color-border-strong) border-t-(--mc-color-accent)" aria-hidden="true" />
                {t('Loading more posts')}
              </div>
            )}

            {!isLoading && !hasMore && posts.length > 0 && (
              <p className="py-3 text-center text-xs text-(--mc-color-text-muted)">
                {t("You're all caught up!")}
              </p>
            )}

            {!isLoading && !error && posts.length === 0 && hasInitiallyLoaded && (
              <Surface padding="none">
                <EmptyState
                  icon={<MessageCircleMore className="size-6" />}
                  title={t('No posts yet')}
                  description={t('When people start posting, their posts will appear here.')}
                  action={<Button onClick={() => setShowCreateModal(true)}>{t('Create new post')}</Button>}
                />
              </Surface>
            )}
          </div>
        </div>

        <NewPostButton onClick={() => setShowCreateModal(true)} />
      </div>

      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onPostCreated={addPost}
        />
      )}

      {copiedToast && (
        <div
          className="fixed bottom-[calc(var(--mc-bottom-nav-height)+var(--mc-safe-bottom)+1rem)] left-1/2 z-(--mc-z-toast) -translate-x-1/2 rounded-(--mc-radius-button) border border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) px-4 py-3 text-sm font-medium text-(--mc-color-text) shadow-(--mc-shadow-raised) md:bottom-6"
          role="status"
        >
          {t('Link copied to clipboard')}
        </div>
      )}
    </ViewportPage>
  )
}
