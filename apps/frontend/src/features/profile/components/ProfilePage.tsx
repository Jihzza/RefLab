import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type TouchEvent,
} from 'react'
import {
  CalendarDays,
  FileText,
  Pencil,
  RefreshCcw,
  Settings,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ViewportPage from '@/app/layouts/ViewportPage'
import {
  Avatar,
  Button,
  EmptyState,
  IconButton,
  Skeleton,
  Surface,
} from '@/components/ui'
import { useAuth } from '@/features/auth/components/useAuth'
import NavigationBar from '@/features/social/components/NavigationBar'
import PostBox from '@/features/social/components/PostBox'
import { usePostActions } from '@/features/social/hooks/usePostActions'
import type { Post } from '@/features/social/types'
import { useProfileFeed } from '../hooks/useProfileFeed'

function PitchDiagram() {
  return (
    <svg
      viewBox="0 0 280 190"
      className="pointer-events-none absolute -right-12 top-0 h-[68%] w-[72%] text-(--mc-color-border-strong) opacity-55 sm:h-full sm:w-[58%]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.15"
      aria-hidden="true"
    >
      <path d="M56 10 267 28 245 178 14 143Z" />
      <path d="m149 18-11 143" />
      <ellipse cx="143" cy="91" rx="29" ry="23" transform="rotate(-5 143 91)" />
      <path d="m48 56-30-4-6 62 29 7M242 57l29 4-9 85-29-7" />
      <path d="M91 13 70 151M207 22l-17 144" opacity=".55" />
    </svg>
  )
}

function ProfilePostSkeleton() {
  return (
    <Surface aria-hidden="true" className="overflow-hidden">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width="3rem" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="9rem" />
          <Skeleton variant="text" width="6rem" className="h-3" />
        </div>
      </div>
      <div className="mt-5 space-y-2">
        <Skeleton variant="text" />
        <Skeleton variant="text" width="78%" />
      </div>
      <div className="mt-5 grid grid-cols-5 gap-3 border-t border-(--mc-color-border) pt-3">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} variant="text" className="h-5" />
        ))}
      </div>
    </Surface>
  )
}

function formatMemberSince(value: string | undefined, locale?: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat(locale ?? 'pt-PT', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export default function ProfilePage() {
  const { t, i18n } = useTranslation()
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
    restorePost,
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
  } = usePostActions({
    updatePost,
    removePost,
    removePostsByUser,
    addPost,
    restorePost,
  })

  const [copiedToast, setCopiedToast] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const touchStartYRef = useRef<number | null>(null)
  const toastTimerRef = useRef<number | null>(null)

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
  const profileAvatarUrl = profile?.photo_url ?? null
  const providerAvatarUrl = typeof user?.user_metadata?.avatar_url === 'string'
    ? user.user_metadata.avatar_url
    : null
  const memberSince = formatMemberSince(profile?.created_at, i18n.resolvedLanguage)

  useEffect(() => () => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current)
  }, [])

  const handleTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
    if (scrollRef.current?.scrollTop === 0) {
      touchStartYRef.current = event.touches[0]?.clientY ?? null
    }
  }, [])

  const handleTouchMove = useCallback((event: TouchEvent<HTMLDivElement>) => {
    const startY = touchStartYRef.current
    const currentY = event.touches[0]?.clientY
    if (startY === null || currentY === undefined) return

    const distance = currentY - startY
    if (distance > 0 && scrollRef.current?.scrollTop === 0) {
      setPullDistance(Math.min(distance * 0.4, 80))
    }
  }, [])

  const handleTouchEnd = useCallback(async () => {
    try {
      if (pullDistance > 50) await refresh()
    } finally {
      setPullDistance(0)
      touchStartYRef.current = null
    }
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
      if (typeof Reflect.get(navigator, 'share') === 'function') return

      setCopiedToast(true)
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current)
      toastTimerRef.current = window.setTimeout(() => {
        setCopiedToast(false)
        toastTimerRef.current = null
      }, 2000)
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
    <ViewportPage ariaLabel={t('Profile')} scroll="managed">
      <div
        ref={scrollRef}
        className="h-full min-h-0 overflow-y-auto overscroll-contain"
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => void handleTouchEnd()}
        onTouchCancel={() => {
          setPullDistance(0)
          touchStartYRef.current = null
        }}
      >
        <div className="mx-auto w-full max-w-5xl space-y-4 px-3 py-4 pb-24 sm:px-6 sm:py-6 md:pb-8">
          {pullDistance > 0 && (
            <div
              className="flex items-center justify-center overflow-hidden transition-[height] motion-reduce:transition-none"
              style={{ height: pullDistance }}
              role="status"
              aria-label={t('Pull to refresh')}
            >
              <RefreshCcw
                className={`size-5 text-(--mc-color-accent) ${
                  pullDistance > 50 ? 'animate-spin motion-reduce:animate-none' : ''
                }`}
                style={{ transform: `rotate(${pullDistance * 3}deg)` }}
                aria-hidden="true"
              />
            </div>
          )}

          <Surface
            padding="none"
            className="relative isolate mx-auto max-w-4xl overflow-hidden border-(--mc-color-border-strong) shadow-none"
          >
            <div className="absolute left-0 top-0 size-20 bg-(--mc-color-accent) [clip-path:polygon(0_0,100%_0,0_100%)]" aria-hidden="true" />
            <div className="absolute bottom-10 right-0 h-20 w-9 bg-(--mc-color-danger) [clip-path:polygon(100%_0,100%_100%,0_100%)]" aria-hidden="true" />
            <PitchDiagram />

            <div className="relative z-10 flex min-h-[21rem] flex-col justify-end px-5 py-6 sm:px-8 sm:py-8 lg:min-h-[17rem] lg:flex-row lg:items-end lg:justify-start lg:gap-7">
              <Avatar
                src={profileAvatarUrl}
                ownerId={profile?.id ?? user?.id}
                providerSrc={providerAvatarUrl}
                allowAuthProviderImage
                alt={displayName}
                name={displayName}
                size="xl"
                className="!size-28 border-(--mc-color-border-strong) bg-(--mc-color-canvas) shadow-(--mc-shadow-raised) sm:!size-32"
                imageProps={{ loading: 'eager' }}
              />

              <div className="mt-5 min-w-0 flex-1 lg:mt-0">
                <h2 className="break-words text-3xl font-extrabold tracking-[-0.035em] text-(--mc-color-text) sm:text-4xl">
                  {displayName}
                </h2>
                <p className="mt-1 break-all text-base text-(--mc-color-text-muted) sm:text-lg">
                  @{username}
                </p>
                {memberSince && (
                  <p className="mt-3 flex items-center gap-2 text-xs font-medium text-(--mc-color-text-muted)">
                    <CalendarDays className="size-4 text-(--mc-color-accent)" aria-hidden="true" />
                    {t('Member since {{date}}', { date: memberSince })}
                  </p>
                )}
              </div>

              <div className="mt-5 flex w-full gap-2 lg:mt-0 lg:w-auto lg:shrink-0">
                <Button
                  variant="secondary"
                  leadingIcon={<Pencil className="size-4" />}
                  className="flex-1 border-(--mc-color-accent)/80 text-(--mc-color-accent) lg:min-w-40"
                  onClick={() => navigate('/app/profile/edit')}
                >
                  {t('Edit Profile')}
                </Button>
                <IconButton
                  label={t('Settings')}
                  variant="secondary"
                  className="border-(--mc-color-accent)/80 text-(--mc-color-accent)"
                  onClick={() => navigate('/app/settings')}
                >
                  <Settings className="size-5" />
                </IconButton>
              </div>
            </div>
          </Surface>

          <div className="sticky top-0 z-10 mx-auto max-w-4xl bg-(--mc-color-canvas)/95 pt-1 backdrop-blur-md">
            <NavigationBar
              filter={filter}
              onFilterChange={setFilter}
              disabled={isLoading || isRefreshing}
            />
          </div>

          <div
            id="community-feed"
            role="tabpanel"
            aria-labelledby={`community-filter-${filter}`}
            className="mx-auto max-w-3xl space-y-4"
          >
            {isRefreshing && (
              <div className="flex min-h-10 items-center justify-center" role="status" aria-label={t('Refreshing posts')}>
                <RefreshCcw className="size-5 animate-spin text-(--mc-color-accent) motion-reduce:animate-none" aria-hidden="true" />
              </div>
            )}

            {isLoading && (
              <div className="space-y-4" role="status" aria-label={t('Loading posts')}>
                <ProfilePostSkeleton />
                <ProfilePostSkeleton />
                <ProfilePostSkeleton />
              </div>
            )}

            {error && !isLoading && (
              <Surface>
                <EmptyState
                  icon={<RefreshCcw className="size-6" />}
                  title={t('Something went wrong loading your posts.')}
                  description={error}
                  action={(
                    <Button
                      leadingIcon={<RefreshCcw className="size-4" />}
                      onClick={() => void refresh()}
                    >
                      {t('Try Again')}
                    </Button>
                  )}
                />
              </Surface>
            )}

            {!isLoading && !error && posts.map((post) => (
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
              <div className="flex min-h-16 items-center justify-center" role="status" aria-label={t('Loading more posts')}>
                <RefreshCcw className="size-5 animate-spin text-(--mc-color-accent) motion-reduce:animate-none" aria-hidden="true" />
              </div>
            )}

            {!isLoading && !hasMore && posts.length > 0 && (
              <p className="py-4 text-center text-xs text-(--mc-color-text-muted)">
                {t("You're all caught up!")}
              </p>
            )}

            {!isLoading && !error && posts.length === 0 && hasInitiallyLoaded && (
              <Surface>
                <EmptyState
                  icon={<FileText className="size-6" />}
                  title={t('No posts yet')}
                  description={t('Your posts and reposts will appear here.')}
                />
              </Surface>
            )}
          </div>
        </div>
      </div>

      {copiedToast && (
        <div
          className="mc-layer-toast fixed bottom-[calc(var(--mc-bottom-nav-height)+var(--mc-safe-bottom)+1rem)] left-1/2 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-(--mc-radius-button) border border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) px-4 py-3 text-center text-sm font-medium text-(--mc-color-text) shadow-(--mc-shadow-raised) md:bottom-6"
          role="status"
          aria-live="polite"
        >
          {t('Link copied to clipboard')}
        </div>
      )}
    </ViewportPage>
  )
}
