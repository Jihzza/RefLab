import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type TouchEvent,
} from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  MessageSquareText,
  Plus,
  RefreshCw,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import ViewportPage from '@/app/layouts/ViewportPage'
import { Button, EmptyState, IconButton, Skeleton, Surface } from '@/components/ui'
import NavigationBar from './NavigationBar'
import PostBox from './PostBox'
import NewPostButton from './NewPostButton'
import CreatePostModal from './CreatePostModal'
import { useFeed } from '../hooks/useFeed'
import { usePostActions } from '../hooks/usePostActions'
import type { FeedFilter, Post } from '../types'

/** Loading skeleton matching the final post-card geometry. */
function PostSkeleton({ withMedia = false }: { withMedia?: boolean }) {
  return (
    <Surface
      padding="md"
      className="overflow-hidden border-(--mc-color-border-strong) shadow-none"
      aria-hidden="true"
    >
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width="3rem" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton variant="text" width="9rem" />
          <Skeleton variant="text" width="6.5rem" height="0.7rem" />
        </div>
        <Skeleton variant="circular" width="2rem" />
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton variant="text" />
        <Skeleton variant="text" width="78%" />
      </div>
      {withMedia && <Skeleton variant="rectangular" height="15rem" className="mt-4" />}
      <div className="mt-4 flex items-center justify-between gap-4 border-t border-(--mc-color-border) pt-3">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} variant="text" width="2.25rem" height="1.25rem" />
        ))}
      </div>
    </Surface>
  )
}

/** Main social feed page. */
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
    restorePost,
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
  } = usePostActions({
    updatePost,
    removePost,
    removePostsByUser,
    addPost,
    restorePost,
  })

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [copiedToast, setCopiedToast] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const touchStartY = useRef<number | null>(null)
  const [pullDistance, setPullDistance] = useState(0)

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
  }, [])

  const handleTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
    if (scrollRef.current && scrollRef.current.scrollTop <= 0) {
      touchStartY.current = event.touches[0].clientY
    } else {
      touchStartY.current = null
      setPullDistance(0)
    }
  }, [])

  const handleTouchMove = useCallback((event: TouchEvent<HTMLDivElement>) => {
    if (touchStartY.current === null) return
    const distance = event.touches[0].clientY - touchStartY.current
    if (distance > 0 && scrollRef.current?.scrollTop === 0) {
      setPullDistance(Math.min(distance * 0.4, 80))
    } else {
      setPullDistance(0)
    }
  }, [])

  const resetPullGesture = useCallback(() => {
    setPullDistance(0)
    touchStartY.current = null
  }, [])

  const handleTouchEnd = useCallback(async () => {
    const shouldRefresh = pullDistance > 50 && !isLoading && !isLoadingMore && !isRefreshing
    resetPullGesture()

    if (shouldRefresh) {
      await refresh()
    }
  }, [isLoading, isLoadingMore, isRefreshing, pullDistance, refresh, resetPullGesture])

  const handleScroll = useCallback(() => {
    const element = scrollRef.current
    if (!element || isLoadingMore || !hasMore) return
    if (element.scrollHeight - element.scrollTop - element.clientHeight < 300) {
      void loadMore()
    }
  }, [hasMore, isLoadingMore, loadMore])

  const handleShareWithToast = useCallback(async (post: Post) => {
    await handleShare(post)
    if (!navigator.share) {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      setCopiedToast(true)
      toastTimerRef.current = setTimeout(() => {
        setCopiedToast(false)
        toastTimerRef.current = null
      }, 2000)
    }
  }, [handleShare])

  const handleCommentCountChange = useCallback((postId: string, delta: number) => {
    updatePost(postId, {
      comment_count: Math.max(
        0,
        (posts.find((post) => post.id === postId)?.comment_count ?? 0) + delta,
      ),
    })
  }, [posts, updatePost])

  const handleFilterChange = useCallback((nextFilter: FeedFilter) => {
    if (nextFilter === filter) return
    scrollRef.current?.scrollTo({ top: 0 })
    setFilter(nextFilter)
  }, [filter, setFilter])

  const feedIsBusy = isLoading || isRefreshing || isLoadingMore
  const hasStaleFeedError = Boolean(error && posts.length > 0)

  const pageHeader = (
    <div className="mx-auto w-full max-w-[var(--mc-content-narrow)]">
      <div className="flex min-h-12 items-center justify-between gap-4 px-1 pb-2 pt-1">
        <h2
          id="community-page-title"
          className="text-[28px] font-extrabold leading-tight tracking-[-0.035em] text-(--mc-color-text) sm:text-3xl"
        >
          {t('Social')}
        </h2>
        <IconButton
          label={t('Refresh feed')}
          size="sm"
          variant="ghost"
          loading={isRefreshing}
          disabled={isLoading || isLoadingMore}
          onClick={() => void refresh()}
          className="hidden sm:inline-flex"
        >
          <RefreshCw className="size-4" />
        </IconButton>
      </div>
      <NavigationBar
        filter={filter}
        onFilterChange={handleFilterChange}
        disabled={feedIsBusy}
      />
    </div>
  )

  return (
    <ViewportPage
      ariaLabel={t('Social')}
      header={pageHeader}
      width="full"
      scroll="managed"
    >
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[var(--mc-content-narrow)] flex-col">
        <div
          ref={scrollRef}
          id="community-feed"
          role="tabpanel"
          aria-labelledby={`community-filter-${filter}`}
          aria-busy={feedIsBusy || undefined}
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 pb-24 [scrollbar-gutter:stable] sm:px-6 sm:py-5 md:pb-28"
          onScroll={handleScroll}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => void handleTouchEnd()}
          onTouchCancel={resetPullGesture}
        >
          {pullDistance > 0 && (
            <div
              className="flex items-center justify-center overflow-hidden text-(--mc-color-accent) transition-[height] duration-150 motion-reduce:transition-none"
              style={{ height: pullDistance }}
              role="status"
              aria-label={t('Updating...')}
            >
              <LoaderCircle
                className={`size-5 ${pullDistance > 50 ? 'animate-spin motion-reduce:animate-none' : ''}`}
                style={{ transform: `rotate(${pullDistance * 3}deg)` }}
                aria-hidden="true"
              />
            </div>
          )}

          {isRefreshing && (
            <div className="flex min-h-10 items-center justify-center gap-2 text-xs font-medium text-(--mc-color-text-muted)" role="status">
              <LoaderCircle className="size-4 animate-spin text-(--mc-color-accent) motion-reduce:animate-none" aria-hidden="true" />
              <span>{t('Updating...')}</span>
            </div>
          )}

          {isLoading && (
            <div className="space-y-4" role="status" aria-live="polite">
              <span className="sr-only">{t('Loading...')}</span>
              <PostSkeleton withMedia />
              <PostSkeleton />
              <PostSkeleton />
            </div>
          )}

          {error && !isLoading && posts.length === 0 && (
            <Surface
              padding="none"
              className="overflow-hidden border-(--mc-color-danger)/35 shadow-none"
            >
              <EmptyState
                icon={<AlertTriangle className="size-5 text-(--mc-color-danger)" />}
                title={t('Something went wrong loading the feed.')}
                action={(
                  <Button
                    variant="secondary"
                    onClick={() => void refresh()}
                    loading={isRefreshing}
                    loadingText={t('Updating...')}
                  >
                    {t('Try Again')}
                  </Button>
                )}
              />
            </Surface>
          )}

          {hasStaleFeedError && (
            <div
              className="mb-4 flex flex-wrap items-center gap-2.5 rounded-(--mc-radius-button) border border-(--mc-color-danger)/35 bg-(--mc-color-danger)/8 px-3.5 py-3 text-sm text-(--mc-color-danger)"
              role="alert"
            >
              <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1">{t('Something went wrong loading the feed.')}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void refresh()}
                loading={isRefreshing}
                loadingText={t('Updating...')}
                className="text-(--mc-color-danger) hover:text-(--mc-color-danger)"
              >
                {t('Try Again')}
              </Button>
            </div>
          )}

          {!isLoading && posts.length > 0 && (
            <ul className="space-y-4" aria-live="polite" aria-relevant="additions removals">
              {posts.map((post) => (
                <li key={post.id} className="list-none">
                  <PostBox
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
                </li>
              ))}
            </ul>
          )}

          {isLoadingMore && (
            <div className="flex min-h-16 items-center justify-center" role="status" aria-label={t('Loading...')}>
              <LoaderCircle className="size-5 animate-spin text-(--mc-color-accent) motion-reduce:animate-none" aria-hidden="true" />
            </div>
          )}

          {!isLoading && !error && !hasMore && posts.length > 0 && (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-(--mc-color-text-muted)" role="status">
              <CheckCircle2 className="size-4 text-(--mc-color-success)" aria-hidden="true" />
              <span>{t("You're all caught up!")}</span>
            </div>
          )}

          {!isLoading && !error && posts.length === 0 && hasInitiallyLoaded && (
            <Surface padding="none" className="overflow-hidden border-(--mc-color-border-strong) shadow-none">
              <EmptyState
                icon={<MessageSquareText className="size-5" />}
                title={t('No posts yet')}
                description={t('When people start posting, their posts will appear here.')}
                action={(
                  <Button
                    leadingIcon={<Plus className="size-4" />}
                    onClick={() => setShowCreateModal(true)}
                  >
                    {t('Create new post')}
                  </Button>
                )}
              />
            </Surface>
          )}
        </div>
      </div>

      <NewPostButton
        onClick={() => setShowCreateModal(true)}
        expanded={showCreateModal}
      />

      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onPostCreated={addPost}
        />
      )}

      {copiedToast && (
        <div
          className="fixed bottom-[calc(var(--mc-bottom-nav-height)+var(--mc-safe-bottom)+1rem)] left-1/2 z-(--mc-z-toast) max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-(--mc-radius-button) border border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) px-4 py-2.5 text-center text-sm font-medium text-(--mc-color-text) shadow-(--mc-shadow-raised) md:bottom-6"
          role="status"
          aria-live="polite"
        >
          {t('Link copied to clipboard')}
        </div>
      )}
    </ViewportPage>
  )
}
