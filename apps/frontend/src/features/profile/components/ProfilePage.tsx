import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/components/useAuth'
import NavigationBar from '@/features/social/components/NavigationBar'
import PostBox from '@/features/social/components/PostBox'
import { usePostActions } from '@/features/social/hooks/usePostActions'
import { useProfileFeed } from '../hooks/useProfileFeed'
import type { Post } from '@/features/social/types'
import { useTranslation } from 'react-i18next'
import { FileText, MoreHorizontal, Pencil, Settings as SettingsIcon } from 'lucide-react'
import ViewportPage from '@/app/layouts/ViewportPage'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'

function PostSkeleton() {
  return (
    <div className="animate-pulse rounded-(--mc-radius-card) border border-(--mc-color-border) bg-(--mc-color-surface) p-4">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full bg-(--mc-color-surface-raised)" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 rounded bg-(--mc-color-surface-raised)" />
          <div className="h-2 w-16 rounded bg-(--mc-color-surface-raised)" />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full rounded bg-(--mc-color-surface-raised)" />
        <div className="h-3 w-3/4 rounded bg-(--mc-color-surface-raised)" />
      </div>
      <div className="mt-3 flex gap-8">
        <div className="h-3 w-8 rounded bg-(--mc-color-surface-raised)" />
        <div className="h-3 w-8 rounded bg-(--mc-color-surface-raised)" />
        <div className="h-3 w-8 rounded bg-(--mc-color-surface-raised)" />
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
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
  } = useProfileFeed()

  const {
    handleLike,
    handleSave,
    handleRepost,
    handleShare,
    handleDelete,
    handleReport,
    handleBlock,
  } = usePostActions({ updatePost, removePost, removePostsByUser, addPost })

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [copiedToast, setCopiedToast] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef<number>(0)

  const displayName =
    profile?.name ||
    user?.user_metadata?.full_name ||
    profile?.username ||
    user?.email?.split('@')[0] ||
    t('User')
  const username =
    profile?.username ||
    user?.user_metadata?.username ||
    user?.email?.split('@')[0] ||
    'user'
  const avatarUrl = profile?.photo_url || user?.user_metadata?.avatar_url || null
  const initials = displayName.slice(0, 2).toUpperCase()

  useEffect(() => {
    if (!isMenuOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        menuRef.current?.contains(target) ||
        menuButtonRef.current?.contains(target)
      ) {
        return
      }
      setIsMenuOpen(false)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isMenuOpen])

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

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || isLoadingMore || !hasMore) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 300) {
      loadMore()
    }
  }, [isLoadingMore, hasMore, loadMore])

  const handleShareWithToast = useCallback(
    async (post: Post) => {
      await handleShare(post)
      if (!navigator.share) {
        setCopiedToast(true)
        setTimeout(() => setCopiedToast(false), 2000)
      }
    },
    [handleShare]
  )

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
    <ViewportPage ariaLabel={t('Profile')} width="standard" scroll="managed">
      <div className="flex h-full min-h-0 flex-col">
      <section className="px-4 pb-3 pt-4">
        <div className="relative isolate overflow-visible rounded-(--mc-radius-card) border border-(--mc-color-border-strong) bg-(--mc-color-surface) p-4 shadow-(--mc-shadow-soft) sm:p-5">
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-(--mc-radius-card)" aria-hidden="true">
            <div className="absolute -right-12 -top-16 size-40 rounded-full border border-(--mc-color-border)" />
            <div className="absolute -right-3 top-0 h-full w-1 bg-(--mc-color-accent)" />
          </div>
          <div className="relative flex items-center gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="size-16 shrink-0 rounded-full border-2 border-(--mc-color-accent)/70 object-cover shadow-(--mc-shadow-soft) sm:size-20"
              />
            ) : (
              <div className="flex size-16 shrink-0 items-center justify-center rounded-full border-2 border-(--mc-color-accent-soft) bg-(--mc-color-accent) shadow-(--mc-shadow-soft) sm:size-20">
                <span className="text-lg font-extrabold text-(--mc-color-canvas)">
                  {initials}
                </span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="mc-eyebrow mb-1">RefLab</p>
              <h1 className="truncate text-xl font-extrabold tracking-tight text-(--mc-color-text) sm:text-2xl">
                {displayName}
              </h1>
              <p className="mt-1 truncate text-sm text-(--mc-color-text-muted)">@{username}</p>
            </div>

            <button
              ref={menuButtonRef}
              type="button"
              className="flex size-11 items-center justify-center rounded-(--mc-radius-button) border border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) text-(--mc-color-text-secondary) transition-colors hover:border-(--mc-color-accent)/50 hover:text-(--mc-color-accent) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--mc-color-focus)"
              aria-label={t('Profile actions')}
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen(prev => !prev)}
            >
              <MoreHorizontal className="size-5" aria-hidden="true" />
            </button>
          </div>

          {isMenuOpen && (
            <div
              ref={menuRef}
              role="menu"
              aria-label={t('Profile menu')}
              className="absolute right-4 top-16 z-(--mc-z-popover) min-w-48 overflow-hidden rounded-(--mc-radius-card) border border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) py-1 shadow-(--mc-shadow-raised) sm:top-20"
            >
              <button
                type="button"
                role="menuitem"
                className="flex min-h-11 w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-(--mc-color-text) hover:bg-(--mc-color-surface-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--mc-color-focus)"
                onClick={() => {
                  setIsMenuOpen(false)
                  navigate('/app/profile/edit')
                }}
              >
                <Pencil className="size-4 text-(--mc-color-accent)" aria-hidden="true" />
                {t('Edit Profile')}
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex min-h-11 w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-(--mc-color-text) hover:bg-(--mc-color-surface-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--mc-color-focus)"
                onClick={() => {
                  setIsMenuOpen(false)
                  navigate('/app/settings')
                }}
              >
                <SettingsIcon className="size-4 text-(--mc-color-text-muted)" aria-hidden="true" />
                {t('Settings')}
              </button>
            </div>
          )}
        </div>
      </section>

      <NavigationBar filter={filter} onFilterChange={setFilter} />

      {pullDistance > 0 && (
        <div
          className="flex justify-center transition-all"
          style={{ height: pullDistance }}
        >
          <div
            className={`size-5 rounded-full border-2 border-(--mc-color-accent) border-t-transparent ${
              pullDistance > 50 ? 'animate-spin' : ''
            }`}
            style={{ transform: `rotate(${pullDistance * 3}deg)` }}
          />
        </div>
      )}

      {isRefreshing && (
        <div className="flex justify-center py-2">
          <div className="size-5 animate-spin rounded-full border-2 border-(--mc-color-accent) border-t-transparent motion-reduce:animate-none" />
        </div>
      )}

      <div
        ref={scrollRef}
        className="mc-scroll-region flex-1 space-y-4 px-4 py-4"
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {isLoading && (
          <div className="space-y-4">
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </div>
        )}

        {error && !isLoading && (
          <div className="rounded-(--mc-radius-card) border border-(--mc-color-danger)/30 bg-(--mc-color-surface)">
            <EmptyState
              title={t('Something went wrong loading your posts.')}
              icon={<FileText className="size-5" />}
              action={<Button onClick={refresh}>{t('Try Again')}</Button>}
            />
          </div>
        )}

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

        {isLoadingMore && (
          <div className="flex justify-center py-4">
            <div className="size-5 animate-spin rounded-full border-2 border-(--mc-color-accent) border-t-transparent motion-reduce:animate-none" />
          </div>
        )}

        {!isLoading && !hasMore && posts.length > 0 && (
          <p className="py-4 text-center text-xs text-(--mc-color-text-muted)">
            {t("You're all caught up!")}
          </p>
        )}

        {!isLoading && !error && posts.length === 0 && hasInitiallyLoaded && (
          <div className="rounded-(--mc-radius-card) border border-dashed border-(--mc-color-border-strong) bg-(--mc-color-surface)">
            <EmptyState
              title={t('No posts yet')}
              description={t('Your posts and reposts will appear here.')}
              icon={<FileText className="size-5" />}
            />
          </div>
        )}
      </div>

      {copiedToast && (
        <div className="fixed bottom-24 left-1/2 z-(--mc-z-toast) -translate-x-1/2 rounded-(--mc-radius-pill) border border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) px-4 py-2 text-sm font-medium text-(--mc-color-text) shadow-(--mc-shadow-raised)" role="status">
          {t('Link copied to clipboard')}
        </div>
      )}
      </div>
    </ViewportPage>
  )
}
