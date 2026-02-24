import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
        showToast('Link copied to clipboard')
      }
    },
    [handleShare, showToast]
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
  }, [user, profileView, navigate])

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
    [user, profileView, showToast]
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
    <div className="flex flex-col h-full">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 pb-20 space-y-4"
        onScroll={handleScroll}
      >
        {isProfileLoading && (
          <div className="bg-(--bg-surface) rounded-(--radius-card) border border-(--border-subtle) p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-(--bg-surface-2)" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-40 bg-(--bg-surface-2) rounded" />
                <div className="h-3 w-24 bg-(--bg-surface-2) rounded" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="h-10 rounded-(--radius-button) bg-(--bg-surface-2)" />
              <div className="h-10 rounded-(--radius-button) bg-(--bg-surface-2)" />
            </div>
          </div>
        )}

        {!isProfileLoading && profileError && (
          <div className="bg-(--bg-surface) rounded-(--radius-card) border border-(--error)/30 p-6">
            <p className="text-sm text-(--error) mb-3">{profileError}</p>
            <button
              type="button"
              onClick={() => void loadProfileView()}
              className="h-9 px-4 rounded-(--radius-button) bg-(--brand-yellow) text-(--bg-primary) text-sm font-semibold hover:bg-(--brand-yellow-soft) transition-colors"
            >
              {t('Try Again')}
            </button>
          </div>
        )}

        {!isProfileLoading && !profileError && !profileView && (
          <div className="bg-(--bg-surface) rounded-(--radius-card) border border-(--border-subtle) p-6">
            <h1 className="text-lg font-semibold text-(--text-primary) mb-2">{t('Profile not found')}</h1>
            <p className="text-sm text-(--text-muted)">
              {t('We could not find a public profile for @{{username}}.', { username })}
            </p>
          </div>
        )}

        {!isProfileLoading && !profileError && profileView && (
          <>
            <section className="bg-(--bg-surface) rounded-(--radius-card) border border-(--border-subtle) p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {profileView.photo_url ? (
                    <img
                      src={profileView.photo_url}
                      alt={displayName}
                      className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-(--brand-yellow) flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-semibold text-(--bg-primary)">
                        {initials}
                      </span>
                    </div>
                  )}

                  <div className="min-w-0">
                    <h1 className="text-lg font-semibold text-(--text-primary) truncate">
                      {displayName}
                    </h1>
                    <p className="text-sm text-(--text-muted) truncate">@{profileView.username}</p>
                  </div>
                </div>

                {canLoadFullProfile && (
                  <PublicProfileMenu
                    username={profileView.username}
                    isBlockedByViewer={profileView.is_blocked_by_viewer}
                    isBusy={isBlockUpdating}
                    onToggleBlock={() => {
                      if (profileView.is_blocked_by_viewer) {
                        void applyBlockChange(false)
                      } else {
                        setShowBlockConfirmDialog(true)
                      }
                    }}
                    onReport={() => setShowReportDialog(true)}
                    onShare={() => void handleShareProfile()}
                    onCopyLink={() => void handleCopyProfileLink()}
                  />
                )}
              </div>

              {profileView.has_blocked_viewer ? (
                <p className="mt-4 text-sm text-(--text-muted)">
                  {t('This user is unavailable.')}
                </p>
              ) : (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => void handleFollowToggle()}
                      disabled={
                        isFollowUpdating ||
                        isBlockUpdating ||
                        profileView.is_blocked_by_viewer
                      }
                      className={`h-10 rounded-(--radius-button) border border-(--border-subtle) text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        profileView.is_following
                          ? 'text-(--text-secondary) hover:bg-(--bg-hover)'
                          : 'bg-(--brand-yellow) text-(--bg-primary) hover:bg-(--brand-yellow-soft)'
                      }`}
                      aria-label={
                        profileView.is_following ? t('Unfollow user') : t('Follow user')
                      }
                    >
                      {profileView.is_following ? t('Unfollow') : t('Follow')}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleStartConversation()}
                      disabled={
                        isStartingConversation ||
                        isBlockUpdating ||
                        profileView.is_blocked_by_viewer
                      }
                      className="h-10 rounded-(--radius-button) border border-(--border-subtle) text-sm font-semibold text-(--text-secondary) hover:bg-(--bg-hover) transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={t('Send message')}
                    >
                      {isStartingConversation ? t('Opening...') : t('Message')}
                    </button>
                  </div>

                  {profileView.is_blocked_by_viewer && (
                    <p className="mt-3 text-sm text-(--text-muted)">
                      {t('You blocked this user. Unblock to view their posts.')}
                    </p>
                  )}
                </>
              )}
            </section>

            {actionError && (
              <div className="bg-(--error)/10 border border-(--error)/20 rounded-(--radius-card) p-3 text-sm text-(--error)">
                {actionError}
              </div>
            )}

            {canShowFeed && isRefreshing && (
              <div className="flex justify-center py-2">
                <div className="w-5 h-5 border-2 border-(--brand-yellow) border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {canShowFeed && isLoading && (
              <div className="space-y-4">
                <PostSkeleton />
                <PostSkeleton />
                <PostSkeleton />
              </div>
            )}

            {canShowFeed && error && !isLoading && (
              <div className="text-center py-12">
                <p className="text-(--text-muted) text-sm mb-3">
                  {t('Something went wrong loading this profile feed.')}
                </p>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="px-4 py-2 text-sm font-medium bg-(--brand-yellow) text-(--bg-primary) rounded-(--radius-button) hover:bg-(--brand-yellow-soft) transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {canShowFeed &&
              !isLoading &&
              !error &&
              posts.map(post => (
                <PostBox
                  key={post.id}
                  post={post}
                  onLike={handleLike}
                  onSave={handleSave}
                  onRepost={handleRepost}
                  onShare={handleSharePost}
                  onDelete={handleDelete}
                  onReport={handleReport}
                  onBlock={() => {
                    void applyBlockChange(true)
                  }}
                  onCommentCountChange={handleCommentCountChange}
                />
              ))}

            {canShowFeed && isLoadingMore && (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-(--brand-yellow) border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {canShowFeed && !isLoading && !hasMore && posts.length > 0 && (
              <p className="text-center text-(--text-muted) text-xs py-4">
                {t("You're all caught up!")}
              </p>
            )}

            {canShowFeed && !isLoading && !error && posts.length === 0 && hasInitiallyLoaded && (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-(--bg-surface-2) flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-(--text-muted)" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                  </svg>
                </div>
                <h3 className="text-base font-medium text-(--text-primary) mb-1">
                  {t('No posts yet')}
                </h3>
                <p className="text-sm text-(--text-muted)">
                  {t('This user has not posted yet.')}
                </p>
              </div>
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
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-(--bg-surface) border border-(--border-subtle) rounded-(--radius-card) shadow-xl text-sm text-(--text-primary)">
          {toastMessage}
        </div>
      )}
    </div>
  )
}
