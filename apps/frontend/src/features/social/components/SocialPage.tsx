import React, { useState, useRef, useCallback } from 'react'
import { MessageSquarePlus, PenLine } from 'lucide-react'
import NavigationBar from './NavigationBar'
import PostBox from './PostBox'
import NewPostButton from './NewPostButton'
import CreatePostModal from './CreatePostModal'
import Button from '@/components/ui/Button'
import { useFeed } from '../hooks/useFeed'
import { usePostActions } from '../hooks/usePostActions'
import type { Post } from '../types'
import { useTranslation } from 'react-i18next'

/** Loading skeleton for a post card. */
function PostSkeleton() {
  return (
    <div className="card-console p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full skeleton" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 skeleton rounded" />
          <div className="h-2 w-16 skeleton rounded" />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-3 skeleton rounded w-full" />
        <div className="h-3 skeleton rounded w-3/4" />
      </div>
      <div className="mt-4 flex gap-8">
        <div className="h-3 w-8 skeleton rounded" />
        <div className="h-3 w-8 skeleton rounded" />
        <div className="h-3 w-8 skeleton rounded" />
      </div>
    </div>
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

  // Pull-to-refresh state
  const touchStartY = useRef<number>(0)
  const [pullDistance, setPullDistance] = useState(0)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (scrollRef.current && scrollRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartY.current) return
    const distance = e.touches[0].clientY - touchStartY.current
    if (distance > 0 && scrollRef.current?.scrollTop === 0) {
      setPullDistance(Math.min(distance * 0.4, 80))
    }
  }, [])

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > 50) {
      await refresh()
    }
    setPullDistance(0)
    touchStartY.current = 0
  }, [pullDistance, refresh])

  // Infinite scroll
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || isLoadingMore || !hasMore) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 300) {
      loadMore()
    }
  }, [isLoadingMore, hasMore, loadMore])

  // Share with toast notification
  const handleShareWithToast = useCallback(
    async (post: Post) => {
      await handleShare(post)
      // Show toast if clipboard was used (non-mobile)
      if (!navigator.share) {
        setCopiedToast(true)
        setTimeout(() => setCopiedToast(false), 2000)
      }
    },
    [handleShare]
  )

  // Update comment count optimistically
  const handleCommentCountChange = useCallback(
    (postId: string, delta: number) => {
      updatePost(postId, {
        comment_count:
          Math.max(
            0,
            (posts.find(p => p.id === postId)?.comment_count ?? 0) + delta
          ),
      })
    },
    [posts, updatePost]
  )

  return (
    <div className="flex flex-col h-full">
      {/* Filter tabs */}
      <NavigationBar filter={filter} onFilterChange={setFilter} />

      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div
          className="flex justify-center transition-all"
          style={{ height: pullDistance }}
        >
          <div
            className={`w-5 h-5 border-2 border-(--brand-yellow) border-t-transparent rounded-full ${
              pullDistance > 50 ? 'animate-spin' : ''
            }`}
            style={{
              transform: `rotate(${pullDistance * 3}deg)`,
            }}
          />
        </div>
      )}

      {/* Refreshing indicator */}
      {isRefreshing && (
        <div className="flex justify-center py-2">
          <div className="w-5 h-5 border-2 border-(--brand-yellow) border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Feed */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 space-y-4 py-4 pb-20"
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-4">
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="card-console p-8 text-center">
            <p className="text-(--text-secondary) text-sm mb-4">
              {t('Something went wrong loading the feed.')}
            </p>
            <Button onClick={refresh} loading={isRefreshing} disabled={isRefreshing}>
              {t('Try Again')}
            </Button>
          </div>
        )}

        {/* Posts */}
        {!isLoading &&
          !error &&
          posts.map(post => (
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

        {/* Loading more indicator */}
        {isLoadingMore && (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-(--brand-yellow) border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* End of feed */}
        {!isLoading && !hasMore && posts.length > 0 && (
          <p className="text-center text-(--text-muted) text-xs py-4">
            {t("You're all caught up!")}
          </p>
        )}

        {/* Empty state */}
        {!isLoading && !error && posts.length === 0 && hasInitiallyLoaded && (
          <div className="card-console field-lines px-6 py-14 text-center animate-fade-up">
            <div
              className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center shadow-[var(--glow-yellow)]"
              style={{ backgroundImage: 'var(--grad-brand)' }}
            >
              <MessageSquarePlus className="h-8 w-8 text-(--bg-primary)" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-bold text-(--text-primary) mb-1.5">
              {t('Start the debate')}
            </h3>
            <p className="text-sm text-(--text-muted) max-w-xs mx-auto mb-6">
              {t('No decisions yet. Share a call, spark a discussion, and see how others would rule.')}
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              leftIcon={<PenLine className="h-4 w-4" aria-hidden="true" />}
            >
              {t('Create the first post')}
            </Button>
          </div>
        )}
      </div>

      {/* FAB */}
      <NewPostButton onClick={() => setShowCreateModal(true)} />

      {/* Create post modal */}
      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onPostCreated={addPost}
        />
      )}

      {/* Copy toast */}
      {copiedToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 glass border border-(--border-strong) rounded-(--radius-pill) shadow-[var(--shadow-pop)] text-sm font-medium text-(--text-primary) animate-fade-up">
          {t('Link copied to clipboard')}
        </div>
      )}
    </div>
  )
}
