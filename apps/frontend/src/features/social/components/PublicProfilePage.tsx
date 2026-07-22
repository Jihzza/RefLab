import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FileQuestion, MessageSquare, MessagesSquare, RefreshCw, UserMinus, UserPlus } from 'lucide-react'
import ViewportPage from '@/app/layouts/ViewportPage'
import { Button, EmptyState, Skeleton, Surface } from '@/components/ui'
import { useAuth } from '@/features/auth/components/useAuth'
import { getOrCreateConversation } from '@/features/messages/api/messagesApi'
import type { MessageUser } from '@/features/messages/types'
import {
  blockUser,
  followUser,
  getPublicProfileView,
  reportUser,
  unfollowUser,
  unblockUser,
} from '../api/socialApi'
import { usePostActions } from '../hooks/usePostActions'
import { usePublicProfileFeed } from '../hooks/usePublicProfileFeed'
import type { Post, PublicProfileView } from '../types'
import BlockConfirmDialog from './BlockConfirmDialog'
import PostBox from './PostBox'
import PublicProfileMenu from './PublicProfileMenu'
import ReportDialog from './ReportDialog'
import { useTranslation } from 'react-i18next'

function PostSkeleton() {
  return (
    <Surface className="space-y-4" padding="md" aria-hidden="true">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width="2.75rem" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="7rem" />
          <Skeleton variant="text" width="5rem" className="h-3" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" />
        <Skeleton variant="text" width="75%" />
      </div>
    </Surface>
  )
}

function getProfileLink(username: string): string {
  return `${window.location.origin}/app/profile/${encodeURIComponent(username)}`
}

export default function PublicProfilePage() {
  const { t } = useTranslation()
  const { username: usernameParam } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const username = useMemo(() => {
    if (!usernameParam) return ''
    return decodeURIComponent(usernameParam)
  }, [usernameParam])

  const isOwnProfileRoute = useMemo(() => {
    if (!profile?.username || !username) return false
    return profile.username.toLowerCase() === username.toLowerCase()
  }, [profile, username])

  const [profileView, setProfileView] = useState<PublicProfileView | null>(null)
  const [isProfileLoading, setIsProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isFollowUpdating, setIsFollowUpdating] = useState(false)
  const [isBlockUpdating, setIsBlockUpdating] = useState(false)
  const [isStartingConversation, setIsStartingConversation] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [showBlockConfirmDialog, setShowBlockConfirmDialog] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const toastTimerRef = useRef<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOwnProfileRoute) return
    navigate('/app/profile', { replace: true })
  }, [isOwnProfileRoute, navigate])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current)
      }
    }
  }, [])

  const showToast = useCallback((message: string) => {
    setToastMessage(message)

    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current)
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null)
      toastTimerRef.current = null
    }, 2000)
  }, [])

  const loadProfileView = useCallback(async () => {
    if (!username) {
      setProfileError(t('Missing username.'))
      setIsProfileLoading(false)
      return
    }

    if (!user?.id) {
      setIsProfileLoading(false)
      return
    }

    setIsProfileLoading(true)
    setProfileError(null)
    setActionError(null)

    const { profile: publicProfile, error } = await getPublicProfileView(
      user.id,
      username
    )

    if (error) {
      setProfileError(error.message)
      setProfileView(null)
      setIsProfileLoading(false)
      return
    }

    setProfileView(publicProfile)
    setIsProfileLoading(false)
  }, [username, user, t])

  useEffect(() => {
    if (isOwnProfileRoute || !user?.id) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProfileView()
  }, [loadProfileView, isOwnProfileRoute, user])

  const canLoadFullProfile = !!profileView && !profileView.has_blocked_viewer
  const canShowFeed = !!profileView && !profileView.has_blocked_viewer && !profileView.is_blocked_by_viewer

  const {
    posts,
    isLoading,
    hasInitiallyLoaded,
    isRefreshing,
    isLoadingMore,
    hasMore,
    error,
    refresh,
    loadMore,
    addPost,
    removePost,
    removePostsByUser,
    updatePost,
  } = usePublicProfileFeed(user?.id ?? null, profileView?.id ?? null, canShowFeed)

  const {
    handleLike,
    handleSave,
    handleRepost,
    handleShare,
    handleDelete,
    handleReport,
  } = usePostActions({
    updatePost,
    removePost,
    removePostsByUser,
    addPost,
  })

  const displayName = profileView?.name || profileView?.username || username
  const initials = displayName.slice(0, 2).toUpperCase()

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || isLoadingMore || !hasMore || !canShowFeed) return

    if (el.scrollHeight - el.scrollTop - el.clientHeight < 300) {
      void loadMore()
    }
  }, [isLoadingMore, hasMore, canShowFeed, loadMore])

  const handleSharePost = useCallback(
    async (post: Post) => {
      await handleShare(post)
      if (!navigator.share) {
        showToast(t('Link copied to clipboard'))
      }
    },
    [handleShare, showToast, t]
  )

  const handleCommentCountChange = useCallback(
    (postId: string, delta: number) => {
      updatePost(postId, {
        comment_count: Math.max(
          0,
          (posts.find(p => p.id === postId)?.comment_count ?? 0) + delta
        ),
      })
    },
    [posts, updatePost]
  )

  const applyBlockChange = useCallback(
    async (nextBlocked: boolean) => {
      if (!user?.id || !profileView) return

      const previousBlocked = profileView.is_blocked_by_viewer
      const previousFollowing = profileView.is_following

      if (previousBlocked === nextBlocked) return

      setActionError(null)
      setIsBlockUpdating(true)

      setProfileView(prev =>
        prev
          ? {
              ...prev,
              is_blocked_by_viewer: nextBlocked,
              is_following: nextBlocked ? false : prev.is_following,
            }
          : prev
      )

      if (nextBlocked) {
        removePostsByUser(profileView.id)
      }

      const { error: blockError } = nextBlocked
        ? await blockUser(user.id, profileView.id)
        : await unblockUser(user.id, profileView.id)

      if (blockError) {
        setProfileView(prev =>
          prev
            ? {
                ...prev,
                is_blocked_by_viewer: previousBlocked,
                is_following: previousFollowing,
              }
            : prev
        )
        setActionError(blockError.message)
      }

      setIsBlockUpdating(false)
    },
    [user, profileView, removePostsByUser]
  )

  const handleFollowToggle = useCallback(async () => {
    if (!user?.id || !profileView || profileView.is_blocked_by_viewer) return

    const previousFollowing = profileView.is_following
    setActionError(null)
    setIsFollowUpdating(true)

    setProfileView(prev =>
      prev ? { ...prev, is_following: !previousFollowing } : prev
    )

    const { error: followError } = previousFollowing
      ? await unfollowUser(user.id, profileView.id)
      : await followUser(user.id, profileView.id)

    if (followError) {
      setProfileView(prev =>
        prev ? { ...prev, is_following: previousFollowing } : prev
      )
      setActionError(followError.message)
    }

    setIsFollowUpdating(false)
  }, [user, profileView])

  const handleStartConversation = useCallback(async () => {
    if (!user?.id || !profileView || profileView.is_blocked_by_viewer) return

    setActionError(null)
    setIsStartingConversation(true)

    const { data: conversationId, error: conversationError } =
      await getOrCreateConversation(user.id, profileView.id)

    setIsStartingConversation(false)

    if (conversationError || !conversationId) {
      setActionError(conversationError?.message ?? t('Failed to open conversation.'))
      return
    }

    const otherUser: MessageUser = {
      id: profileView.id,
      username: profileView.username,
      name: profileView.name,
      photo_url: profileView.photo_url,
    }

    navigate(`/app/messages/${conversationId}`, { state: { otherUser } })
  }, [user, profileView, navigate, t])

  const handleSubmitReport = useCallback(
    async (reason: string) => {
      if (!user?.id || !profileView) return

      const { error: reportError } = await reportUser(user.id, profileView.id, reason)
      if (reportError) {
        setActionError(reportError.message)
      } else {
        showToast(t('Report submitted'))
      }

      setShowReportDialog(false)
    },
    [user, profileView, showToast, t]
  )

  const handleShareProfile = useCallback(async () => {
    if (!profileView) return

    const url = getProfileLink(profileView.username)

    if (navigator.share) {
      try {
        await navigator.share({
          title: t('@{{username}} on RefLab', { username: profileView.username }),
          url,
        })
        return
      } catch {
        // User cancelled native share; no fallback needed.
      }
    }

    await navigator.clipboard.writeText(url)
    showToast(t('Profile link copied'))
  }, [profileView, showToast, t])

  const handleCopyProfileLink = useCallback(async () => {
    if (!profileView) return

    await navigator.clipboard.writeText(getProfileLink(profileView.username))
    showToast(t('Profile link copied'))
  }, [profileView, showToast, t])

  if (isOwnProfileRoute) {
    return null
  }

  return (
    <ViewportPage ariaLabel={t('Public profile')} width="narrow" scroll="managed">
      <div
        ref={scrollRef}
        className="mc-scroll-region h-full space-y-4 px-3 py-4 pb-8 sm:px-4 md:py-6"
        onScroll={handleScroll}
      >
        {isProfileLoading && (
          <Surface className="space-y-5" padding="md" role="status" aria-label={t('Loading profile')}>
            <div className="flex items-center gap-4">
              <Skeleton variant="circular" width="5rem" />
              <div className="flex-1 space-y-2">
                <Skeleton variant="text" width="10rem" />
                <Skeleton variant="text" width="7rem" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Skeleton height="2.75rem" />
              <Skeleton height="2.75rem" />
            </div>
          </Surface>
        )}

        {!isProfileLoading && profileError && (
          <Surface padding="none">
            <EmptyState
              icon={<RefreshCw className="size-6" />}
              title={t('Unable to load this profile')}
              description={profileError}
              action={<Button onClick={() => void loadProfileView()}>{t('Try Again')}</Button>}
            />
          </Surface>
        )}

        {!isProfileLoading && !profileError && !profileView && (
          <Surface padding="none">
            <EmptyState
              icon={<FileQuestion className="size-6" />}
              title={t('Profile not found')}
              description={t('We could not find a public profile for @{{username}}.', { username })}
            />
          </Surface>
        )}

        {!isProfileLoading && !profileError && profileView && (
          <>
            <Surface className="mc-corner-accent" padding="lg" variant="raised">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-4">
                  {profileView.photo_url ? (
                    <img src={profileView.photo_url} alt={displayName} className="size-20 shrink-0 rounded-full border-2 border-(--mc-color-border-strong) object-cover" />
                  ) : (
                    <div className="flex size-20 shrink-0 items-center justify-center rounded-full border-2 border-(--mc-color-accent)/40 bg-(--mc-color-accent)/15">
                      <span className="text-xl font-extrabold text-(--mc-color-accent)">{initials}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="mc-eyebrow mb-1">{t('RefLab community')}</p>
                    <h1 className="truncate text-xl font-bold text-(--mc-color-text)">{displayName}</h1>
                    <p className="truncate text-sm text-(--mc-color-text-muted)">@{profileView.username}</p>
                  </div>
                </div>

                {canLoadFullProfile && (
                  <PublicProfileMenu
                    username={profileView.username}
                    isBlockedByViewer={profileView.is_blocked_by_viewer}
                    isBusy={isBlockUpdating}
                    onToggleBlock={() => {
                      if (profileView.is_blocked_by_viewer) void applyBlockChange(false)
                      else setShowBlockConfirmDialog(true)
                    }}
                    onReport={() => setShowReportDialog(true)}
                    onShare={() => void handleShareProfile()}
                    onCopyLink={() => void handleCopyProfileLink()}
                  />
                )}
              </div>

              {profileView.has_blocked_viewer ? (
                <div className="mt-5 rounded-(--mc-radius-input) border border-(--mc-color-border) bg-(--mc-color-canvas) p-4 text-sm text-(--mc-color-text-muted)">
                  {t('This user is unavailable.')}
                </div>
              ) : (
                <>
                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Button
                      variant={profileView.is_following ? 'secondary' : 'primary'}
                      leadingIcon={profileView.is_following ? <UserMinus className="size-4" /> : <UserPlus className="size-4" />}
                      onClick={() => void handleFollowToggle()}
                      disabled={isBlockUpdating || profileView.is_blocked_by_viewer}
                      loading={isFollowUpdating}
                      loadingText={profileView.is_following ? t('Unfollowing...') : t('Following...')}
                    >
                      {profileView.is_following ? t('Unfollow') : t('Follow')}
                    </Button>
                    <Button
                      variant="secondary"
                      leadingIcon={<MessageSquare className="size-4" />}
                      onClick={() => void handleStartConversation()}
                      disabled={isBlockUpdating || profileView.is_blocked_by_viewer}
                      loading={isStartingConversation}
                      loadingText={t('Opening...')}
                    >
                      {t('Message')}
                    </Button>
                  </div>

                  {profileView.is_blocked_by_viewer && (
                    <p className="mt-4 rounded-(--mc-radius-input) bg-(--mc-color-danger)/10 px-3 py-2 text-sm text-(--mc-color-text-muted)">
                      {t('You blocked this user. Unblock to view their posts.')}
                    </p>
                  )}
                </>
              )}
            </Surface>

            {actionError && (
              <div className="rounded-(--mc-radius-input) border border-(--mc-color-danger)/35 bg-(--mc-color-danger)/10 p-3 text-sm text-(--mc-color-danger)" role="alert">
                {actionError}
              </div>
            )}

            {canShowFeed && (
              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="mc-eyebrow">{t('Activity')}</p>
                  <h2 className="mc-section-title mt-1">{t('Posts')}</h2>
                </div>
                {isRefreshing && <RefreshCw className="size-5 animate-spin text-(--mc-color-accent)" aria-label={t('Refreshing feed')} />}
              </div>
            )}

            {canShowFeed && isLoading && (
              <div className="space-y-4" role="status" aria-label={t('Loading profile posts')}>
                <PostSkeleton />
                <PostSkeleton />
              </div>
            )}

            {canShowFeed && error && !isLoading && (
              <Surface padding="none">
                <EmptyState
                  icon={<RefreshCw className="size-6" />}
                  title={t('Unable to load posts')}
                  description={t('Something went wrong loading this profile feed.')}
                  action={<Button onClick={() => void refresh()}>{t('Try Again')}</Button>}
                />
              </Surface>
            )}

            {canShowFeed && !isLoading && !error && posts.map((post) => (
              <PostBox
                key={post.id}
                post={post}
                onLike={handleLike}
                onSave={handleSave}
                onRepost={handleRepost}
                onShare={handleSharePost}
                onDelete={handleDelete}
                onReport={handleReport}
                onBlock={() => void applyBlockChange(true)}
                onCommentCountChange={handleCommentCountChange}
              />
            ))}

            {canShowFeed && isLoadingMore && (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-(--mc-color-text-muted)" role="status">
                <span className="size-5 animate-spin rounded-full border-2 border-(--mc-color-border-strong) border-t-(--mc-color-accent)" aria-hidden="true" />
                {t('Loading more posts')}
              </div>
            )}

            {canShowFeed && !isLoading && !hasMore && posts.length > 0 && (
              <p className="py-4 text-center text-xs text-(--mc-color-text-muted)">{t("You're all caught up!")}</p>
            )}

            {canShowFeed && !isLoading && !error && posts.length === 0 && hasInitiallyLoaded && (
              <Surface padding="none">
                <EmptyState
                  icon={<MessagesSquare className="size-6" />}
                  title={t('No posts yet')}
                  description={t('This user has not posted yet.')}
                />
              </Surface>
            )}
          </>
        )}
      </div>

      {showReportDialog && (
        <ReportDialog
          type="user"
          onSubmit={reason => {
            void handleSubmitReport(reason)
          }}
          onClose={() => setShowReportDialog(false)}
        />
      )}

      {showBlockConfirmDialog && profileView && (
        <BlockConfirmDialog
          username={profileView.username}
          onConfirm={() => {
            setShowBlockConfirmDialog(false)
            void applyBlockChange(true)
          }}
          onClose={() => setShowBlockConfirmDialog(false)}
        />
      )}

      {toastMessage && (
        <div className="fixed bottom-[calc(var(--mc-bottom-nav-height)+var(--mc-safe-bottom)+1rem)] left-1/2 z-(--mc-z-toast) -translate-x-1/2 rounded-(--mc-radius-button) border border-(--mc-color-border-strong) bg-(--mc-color-surface-raised) px-4 py-3 text-sm font-medium text-(--mc-color-text) shadow-(--mc-shadow-raised) md:bottom-6" role="status">
          {toastMessage}
        </div>
      )}
    </ViewportPage>
  )
}
