import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreVertical, Pencil, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/features/auth/components/useAuth'
import Button from '@/components/ui/Button'
import NavigationBar from '@/features/social/components/NavigationBar'
import PostBox from '@/features/social/components/PostBox'
import { usePostActions } from '@/features/social/hooks/usePostActions'
import { useProfileFeed } from '../hooks/useProfileFeed'
import type { Post } from '@/features/social/types'
import { useTranslation } from 'react-i18next'

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

  const roleLabel =
    profile?.role === 'admin'
      ? t('Admin')
      : profile?.role === 'moderator'
        ? t('Moderator')
        : t('Referee')
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).getFullYear().toString()
    : '—'
  const postCountLabel = hasMore ? `${posts.length}+` : `${posts.length}`

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
    <div className="flex flex-col h-full">
      <section className="px-4 pt-4 pb-3">
        <div className="card-console relative overflow-hidden animate-fade-up">
          {/* Banner: field-lines motif over a soft brand gradient */}
          <div className="relative h-24 field-lines bg-[radial-gradient(120%_140%_at_0%_0%,rgba(246,194,28,0.16),transparent_55%),radial-gradient(120%_140%_at_100%_0%,rgba(77,163,255,0.12),transparent_55%)]">
            <span className="absolute inset-x-0 top-0 h-1 flag-accent" aria-hidden="true" />

            <button
              ref={menuButtonRef}
              type="button"
              className="absolute right-3 top-3 w-9 h-9 rounded-full border border-(--border-subtle) glass text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-hover) transition-colors flex items-center justify-center"
              aria-label={t('Profile actions')}
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen(prev => !prev)}
            >
              <MoreVertical className="w-5 h-5" aria-hidden="true" />
            </button>

            {isMenuOpen && (
              <div
                ref={menuRef}
                role="menu"
                aria-label={t('Profile menu')}
                className="absolute right-3 top-14 z-20 min-w-44 card-console shadow-[var(--shadow-pop)] py-1"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="w-full text-left px-4 py-2.5 text-sm text-(--text-primary) hover:bg-(--bg-hover)"
                  onClick={() => {
                    setIsMenuOpen(false)
                    navigate('/app/profile/edit')
                  }}
                >
                  {t('Edit Profile')}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="w-full text-left px-4 py-2.5 text-sm text-(--text-primary) hover:bg-(--bg-hover)"
                  onClick={() => {
                    setIsMenuOpen(false)
                    navigate('/app/settings')
                  }}
                >
                  {t('Settings')}
                </button>
              </div>
            )}
          </div>

          {/* Identity: avatar overlaps the banner */}
          <div className="px-4 pb-4">
            <div className="flex items-end gap-3 -mt-10">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-20 h-20 rounded-full object-cover flex-shrink-0 border-4 border-(--bg-surface) shadow-[var(--shadow-soft)]"
                />
              ) : (
                <div className="w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0 border-4 border-(--bg-surface) shadow-[var(--shadow-soft)]" style={{ backgroundImage: 'var(--grad-brand)' }}>
                  <span className="text-xl font-black text-(--bg-primary)">
                    {initials}
                  </span>
                </div>
              )}

              <div className="flex-1 min-w-0 pb-1">
                <h1 className="text-lg font-bold text-(--text-primary) truncate leading-tight">
                  {displayName}
                </h1>
                <p className="text-sm text-(--text-muted) truncate">@{username}</p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-(--radius-pill) border border-(--brand-yellow)/30 bg-(--brand-yellow)/10 px-2.5 py-1 text-xs font-semibold text-(--brand-yellow)">
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                {roleLabel}
              </span>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Pencil className="w-4 h-4" aria-hidden="true" />}
                className="ml-auto"
                onClick={() => navigate('/app/profile/edit')}
              >
                {t('Edit Profile')}
              </Button>
            </div>

            {/* Stat strip */}
            <div className="mt-4 grid grid-cols-3 divide-x divide-(--border-subtle) rounded-(--radius-input) border border-(--border-subtle) bg-(--bg-surface-2)/50">
              <div className="px-3 py-2.5 text-center">
                <p className="numeral text-xl font-black text-(--text-primary) leading-none">
                  {postCountLabel}
                </p>
                <p className="eyebrow mt-1">{t('Posts')}</p>
              </div>
              <div className="px-3 py-2.5 text-center">
                <p className="numeral text-xl font-black text-(--text-primary) leading-none">
                  {memberSince}
                </p>
                <p className="eyebrow mt-1">{t('Since')}</p>
              </div>
              <div className="px-3 py-2.5 text-center">
                <p className="text-sm font-bold text-(--text-primary) leading-none pt-1 truncate">
                  {roleLabel}
                </p>
                <p className="eyebrow mt-1.5">{t('Role')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <NavigationBar filter={filter} onFilterChange={setFilter} />

      {pullDistance > 0 && (
        <div
          className="flex justify-center transition-all"
          style={{ height: pullDistance }}
        >
          <div
            className={`w-5 h-5 border-2 border-(--brand-yellow) border-t-transparent rounded-full ${
              pullDistance > 50 ? 'animate-spin' : ''
            }`}
            style={{ transform: `rotate(${pullDistance * 3}deg)` }}
          />
        </div>
      )}

      {isRefreshing && (
        <div className="flex justify-center py-2">
          <div className="w-5 h-5 border-2 border-(--brand-yellow) border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 space-y-4 py-4 pb-20"
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
          <div className="text-center py-12">
            <p className="text-(--text-muted) text-sm mb-3">
              {t('Something went wrong loading your posts.')}
            </p>
            <Button variant="primary" size="sm" onClick={refresh}>
              {t('Try Again')}
            </Button>
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
            <div className="w-5 h-5 border-2 border-(--brand-yellow) border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && !hasMore && posts.length > 0 && (
          <p className="text-center text-(--text-muted) text-xs py-4">
            {t("You're all caught up!")}
          </p>
        )}

        {!isLoading && !error && posts.length === 0 && hasInitiallyLoaded && (
          <div className="card-console field-lines text-center py-14 px-6 animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border border-(--border-subtle) bg-(--bg-surface-2) flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-(--text-muted)" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9A2.25 2.25 0 0118.75 7.5v9a2.25 2.25 0 01-2.25 2.25h-9A2.25 2.25 0 015.25 16.5v-9z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-(--text-primary) mb-1">
              {t('No posts yet')}
            </h2>
            <p className="text-sm text-(--text-muted)">
              {t('Your posts and reposts will appear here.')}
            </p>
          </div>
        )}
      </div>

      {copiedToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) shadow-xl text-sm text-(--text-primary)">
          {t('Link copied to clipboard')}
        </div>
      )}
    </div>
  )
}
