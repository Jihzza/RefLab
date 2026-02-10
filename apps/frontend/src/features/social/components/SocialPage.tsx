import React, { useState, useRef, useCallback } from 'react'
import NavigationBar from './NavigationBar'
import PostBox from './PostBox'
import NewPostButton from './NewPostButton'
import CreatePostModal from './CreatePostModal'
import { useFeed } from '../hooks/useFeed'
import { usePostActions } from '../hooks/usePostActions'
import type { Post } from '../types'

/** Loading skeleton for a post card. */
function PostSkeleton() {
  return (
    <div className="bg-(--bg-surface) rounded-(--radius-card) border border-(--border-subtle) p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-(--bg-surface-2)" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 bg-(--bg-surface-2) rounded" />
          <div className="h-2 w-16 bg-(--bg-surface-2) rounded" />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-3 bg-(--bg-surface-2) rounded w-full" />
        <div className="h-3 bg-(--bg-surface-2) rounded w-3/4" />
      </div>
      <div className="mt-3 flex gap-8">
        <div className="h-3 w-8 bg-(--bg-surface-2) rounded" />
        <div className="h-3 w-8 bg-(--bg-surface-2) rounded" />
        <div className="h-3 w-8 bg-(--bg-surface-2) rounded" />
      </div>
    </div>
  )
}

/** Main social feed page. */
export default function SocialPage() {
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
          <div className="text-center py-12">
            <p className="text-(--text-muted) text-sm mb-3">
              Something went wrong loading the feed.
            </p>
            <button
              onClick={refresh}
              className="px-4 py-2 text-sm font-medium bg-(--brand-yellow) text-(--bg-primary) rounded-(--radius-button) hover:bg-(--brand-yellow-soft) transition-colors"
            >
              Try Again
            </button>
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
            You're all caught up!
          </p>
        )}

        {/* Empty state */}
        {!isLoading && !error && posts.length === 0 && hasInitiallyLoaded && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-(--bg-surface-2) flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-(--text-muted)" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
              </svg>
            </div>
            <h3 className="text-base font-medium text-(--text-primary) mb-1">
              No posts yet
            </h3>
            <p className="text-sm text-(--text-muted)">
              When people start posting, their posts will appear here.
            </p>
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
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) shadow-xl text-sm text-(--text-primary)">
          Link copied to clipboard
        </div>
      )}
    </div>
  )
}
